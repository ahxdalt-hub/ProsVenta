// ============================================================================
// Prosventa Smart Lead & ICP Scoring — Service
// Stage 4 — Phase 6: Smart Lead & ICP Scoring
// ============================================================================
// Server-side boundary for ICP scoring operations. UI components never call
// the scoring engine directly — they go through this service.
//
// Authorization is resolved server-side from the authenticated user's
// organization membership. The client-supplied prospectId is never trusted
// to determine workspace access.
//
// One explicit user action produces one scoring operation. Scores are
// cached in the prospect_scores table and only re-run on explicit refresh.
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { IntelligenceError, toIntelligenceError } from "../errors";
import { getIcpConfiguration, getProspectScore, upsertProspectScore } from "@/lib/db/icp-scoring";
import { getCompanyEnrichment, getProspectEnrichment, recordIntelligenceUsage } from "@/lib/db/intelligence";
import { getCompanyResearch } from "@/lib/db/company-research";
import { getProspectResearch } from "@/lib/db/prospect-research";
import { normalizeDomain } from "../domain";
import { scoreProspectAgainstIcp } from "./engine";
import { assertValidIcpCriteria } from "./icp-validation";
import { SCORING_VERSION, type ProspectScore, type ScoreOperationResult } from "./types";

// ============================================================================
// Authorization Helper
// ============================================================================

async function getOrgAndUser(): Promise<{ orgId: string; userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new IntelligenceError("AUTHENTICATION_FAILED");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) throw new IntelligenceError("AUTHENTICATION_FAILED");

  return { orgId: membership.organization_id, userId: user.id };
}

// ============================================================================
// Context Builder
// ============================================================================
// Gathers available prospect + company data from existing Prosventa data.
// Uses the strongest available information. Does NOT call external providers.
// ============================================================================

async function buildScoringContext(prospectId: string, orgId: string) {
  const supabase = await createClient();

  // Resolve the prospect server-side to verify workspace authorization.
  const { data: prospect } = await supabase
    .from("prospects")
    .select(
      "id, organization_id, company_name, name, website, domain, industry, description, employee_count, city, country, location, contact_name, contact_email"
    )
    .eq("id", prospectId)
    .single();

  if (!prospect) {
    throw new IntelligenceError("NOT_FOUND");
  }

  // Verify the prospect belongs to the authenticated user's org.
  if (prospect.organization_id !== orgId) {
    throw new IntelligenceError("AUTHENTICATION_FAILED");
  }

  const domain = normalizeDomain(prospect.domain || prospect.website) ?? null;

  // Load company enrichment data when available.
  let companyEnrichment: Record<string, unknown> | null = null;
  let hasCompanyEnrichment = false;
  if (domain) {
    const enrichmentRecord = await getCompanyEnrichment(prospectId, domain);
    if (enrichmentRecord?.status === "completed" && enrichmentRecord.data) {
      companyEnrichment = enrichmentRecord.data as unknown as Record<string, unknown>;
      hasCompanyEnrichment = true;
    }
  }

  // Load prospect enrichment data when available.
  let prospectEnrichment: Record<string, unknown> | null = null;
  let hasProspectEnrichment = false;
  const prospectEnrichmentRecord = await getProspectEnrichment(prospectId);
  if (prospectEnrichmentRecord?.status === "completed" && prospectEnrichmentRecord.data) {
    prospectEnrichment = prospectEnrichmentRecord.data as unknown as Record<string, unknown>;
    hasProspectEnrichment = true;
  }

  // Load company research when available.
  let hasCompanyResearch = false;
  if (domain) {
    const researchRecord = await getCompanyResearch(prospectId, domain);
    if (researchRecord?.status === "completed" && researchRecord.result) {
      hasCompanyResearch = true;
    }
  }

  // Load prospect research when available.
  let hasProspectResearch = false;
  const prospectResearchRecord = await getProspectResearch(prospectId);
  if (prospectResearchRecord?.status === "completed" && prospectResearchRecord.result) {
    hasProspectResearch = true;
  }

  // Derive company data
  const company = {
    industry: prospect.industry || (companyEnrichment?.industry as string | null) || null,
    employeeCount: prospect.employee_count ?? (companyEnrichment?.employeeCount as number | null) ?? null,
    employeeRange: (companyEnrichment?.employeeRange as string | null) || null,
    country: prospect.country || (companyEnrichment?.country as string | null) || null,
    companyType: (companyEnrichment?.companyType as string | null) || null,
    technologies: Array.isArray(companyEnrichment?.technologies)
      ? (companyEnrichment.technologies as string[])
      : [],
    businessModel: (companyEnrichment?.businessModel as string | null) || null,
  };

  // Derive prospect data
  const prospectData = {
    jobTitle: (prospectEnrichment?.jobTitle as string | null) || null,
    department: (prospectEnrichment?.department as string | null) || null,
    seniority: (prospectEnrichment?.seniority as string | null) || null,
    location: prospect.location || (prospectEnrichment?.location as string | null) || null,
    country: prospect.country || (prospectEnrichment?.country as string | null) || null,
    city: prospect.city || (prospectEnrichment?.city as string | null) || null,
  };

  return {
    prospectId,
    organizationId: orgId,
    company,
    prospect: prospectData,
    hasCompanyEnrichment,
    hasProspectEnrichment,
    hasCompanyResearch,
    hasProspectResearch,
  };
}

// ============================================================================
// Usage Tracking
// ============================================================================

async function trackUsage(
  orgId: string,
  userId: string,
  status: "pending" | "completed" | "failed"
) {
  await recordIntelligenceUsage({
    organization_id: orgId,
    user_id: userId,
    operation: "prospect_research",
    provider: "icp-scoring",
    status,
  });
}

// ============================================================================
// Scoring Operation
// ============================================================================

/**
 * Scores a single prospect against the workspace ICP configuration.
 *
 * Authorization:
 *  - authenticated user
 *  - workspace membership (resolved server-side)
 *  - prospect belongs to user's org
 *
 * Caching:
 *  - Does NOT re-score on every page load.
 *  - Returns the stored score when available (unless refresh is requested).
 *  - One explicit user action produces one scoring operation.
 */
export async function scoreProspectForWorkspace(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<ScoreOperationResult> {
  try {
    const { orgId, userId } = await getOrgAndUser();

    // Resolve the prospect server-side to verify workspace authorization.
    const supabase = await createClient();
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, organization_id")
      .eq("id", prospectId)
      .single();

    if (!prospect) {
      return { status: "failed", message: "Prospect not found.", score: null };
    }

    if (prospect.organization_id !== orgId) {
      return { status: "failed", message: "You do not have access to this prospect.", score: null };
    }

    // Cache check — do not re-score on every page load.
    if (!options?.refresh) {
      const existing = await getProspectScore(prospectId);
      if (existing) {
        return { status: "completed", message: "Score already available.", score: existing };
      }
    }

    // Load the workspace ICP configuration.
    const icpConfig = await getIcpConfiguration(orgId);
    if (!icpConfig) {
      return {
        status: "failed",
        message: "No ICP configuration found. Configure your Ideal Customer Profile in Settings first.",
        score: null,
      };
    }

    // Validate the ICP criteria strongly.
    let criteria;
    try {
      criteria = assertValidIcpCriteria(icpConfig.criteria);
    } catch {
      return {
        status: "failed",
        message: "The ICP configuration is invalid. Please review it in Settings.",
        score: null,
      };
    }

    // Track usage — one explicit user action produces one scoring operation.
    await trackUsage(orgId, userId, "pending");

    // Build the scoring context from available data.
    const context = await buildScoringContext(prospectId, orgId);

    // Run the deterministic scoring engine.
    const result = scoreProspectAgainstIcp(context, criteria);

    // Persist the validated score.
    const record = await upsertProspectScore({
      prospect_id: prospectId,
      organization_id: orgId,
      icp_configuration_id: icpConfig.id,
      score: result.score,
      confidence: result.confidence,
      category: result.category,
      company_score: result.companyScore,
      prospect_score: result.prospectScore,
      factors: result.factors,
      scoring_version: SCORING_VERSION,
      scored_at: new Date().toISOString(),
    });

    await trackUsage(orgId, userId, "completed");

    return {
      status: "completed",
      message: "Score calculated.",
      score: record,
    };
  } catch (error) {
    const intelError = toIntelligenceError(error, "icp-scoring");
    return {
      status: "failed",
      message: intelError.message,
      score: null,
    };
  }
}

/**
 * Returns the stored score for a prospect without re-scoring.
 * Used for cached display on page load. Returns null when no score exists.
 */
export async function getStoredProspectScore(
  prospectId: string
): Promise<ProspectScore | null> {
  try {
    const { orgId } = await getOrgAndUser();

    const supabase = await createClient();
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, organization_id")
      .eq("id", prospectId)
      .single();

    if (!prospect || prospect.organization_id !== orgId) {
      return null;
    }

    return await getProspectScore(prospectId);
  } catch {
    return null;
  }
}