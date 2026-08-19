// ============================================================================
// Prosventa AI Company Research — Service
// Stage 4 — Phase 4: AI Company Research
// ============================================================================
// Server-side boundary for company research operations. UI components never
// call AI providers directly — they go through this service.
//
// Authorization is resolved server-side from the authenticated user's
// organization membership. The client-supplied prospectId is never trusted
// to determine workspace access.
//
// One explicit user action produces one research operation. Research is
// cached in the company_research table and only re-run on explicit refresh.
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeDomain } from "../domain";
import { IntelligenceError, toIntelligenceError } from "../errors";
import { getCompanyResearchProvider } from "./registry";
import { validateCompanyResearchResult } from "./validate";
import { getCompanyEnrichment } from "@/lib/db/intelligence";
import {
  getCompanyResearch,
  upsertCompanyResearch,
} from "@/lib/db/company-research";
import { recordIntelligenceUsage } from "@/lib/db/intelligence";
import type {
  CompanyResearchContext,
  CompanyResearchOperationResult,
  CompanyResearchRecord,
  CompanyResearchResult,
} from "./types";

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
// Gathers available relevant company information from existing Prosventa data.
// Uses the strongest available information. Does NOT send unnecessary
// personal prospect information into company research.
// ============================================================================

async function buildResearchContext(
  prospectId: string,
  orgId: string
): Promise<CompanyResearchContext> {
  const supabase = await createClient();

  // Resolve the prospect server-side to verify workspace authorization.
  // RLS ensures the user can only access prospects in their own org.
  const { data: prospect } = await supabase
    .from("prospects")
    .select(
      "id, organization_id, company_name, name, website, domain, industry, description, employee_count, city, country, location"
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

  // Load enrichment data when available (does not call provider).
  let enrichment: Record<string, unknown> | null = null;
  if (domain) {
    const enrichmentRecord = await getCompanyEnrichment(prospectId, domain);
    if (enrichmentRecord?.status === "completed" && enrichmentRecord.data) {
      enrichment = {
        ...(enrichmentRecord.data as unknown as Record<string, unknown>),
        provider: enrichmentRecord.provider,
      };
    }
  }

  return {
    companyName: prospect.company_name || prospect.name || null,
    domain,
    website: prospect.website || null,
    description: prospect.description || null,
    industry: prospect.industry || null,
    employeeCount: prospect.employee_count,
    location: prospect.location || null,
    country: prospect.country || null,
    city: prospect.city || null,
    linkedin: null,
    enrichment,
    externalResearchPerformed: false,
  };
}

// ============================================================================
// Usage Tracking
// ============================================================================

async function trackUsage(
  orgId: string,
  userId: string,
  providerId: string,
  status: "pending" | "completed" | "failed"
) {
  await recordIntelligenceUsage({
    organization_id: orgId,
    user_id: userId,
    operation: "company_research",
    provider: providerId,
    status,
  });
}

// ============================================================================
// Research Operation
// ============================================================================

/**
 * Researches a company for an existing prospect.
 *
 * Authorization:
 *  - authenticated user
 *  - workspace membership (resolved server-side)
 *  - company ownership/access (prospect belongs to user's org)
 *  - valid company ID
 *
 * Caching:
 *  - Does NOT run AI research on every page load.
 *  - Returns the stored result when available (unless refresh is requested).
 *  - One explicit user action produces one research operation.
 */
export async function researchCompanyForProspect(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<CompanyResearchOperationResult> {
  try {
    const { orgId, userId } = await getOrgAndUser();

    // Resolve the prospect server-side to verify workspace authorization.
    const supabase = await createClient();
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, organization_id, company_name, name, website, domain")
      .eq("id", prospectId)
      .single();

    if (!prospect) {
      return {
        status: "failed",
        message: "Company not found.",
        result: null,
        provider: "grounded-v1",
        model: null,
        researchedAt: null,
      };
    }

    // Verify the prospect belongs to the authenticated user's org.
    if (prospect.organization_id !== orgId) {
      return {
        status: "failed",
        message: "You do not have access to this company.",
        result: null,
        provider: "grounded-v1",
        model: null,
        researchedAt: null,
      };
    }

    const domain = normalizeDomain(prospect.domain || prospect.website);
    if (!domain) {
      return {
        status: "failed",
        message: "No company domain available to research. Add a domain or website to this prospect first.",
        result: null,
        provider: "grounded-v1",
        model: null,
        researchedAt: null,
      };
    }

    // Cache check — do not run AI research on every page load.
    if (!options?.refresh) {
      const existing = await getCompanyResearch(prospectId, domain);
      if (existing && existing.status === "completed" && existing.result) {
        return {
          status: "completed",
          message: "Company research already available.",
          result: existing.result,
          provider: existing.provider,
          model: existing.model,
          researchedAt: existing.researched_at,
        };
      }
    }

    // Resolve the AI research provider (grounded engine by default).
    const provider = getCompanyResearchProvider();

    // Build the research context from available Prosventa data.
    const context = await buildResearchContext(prospectId, orgId);

    // Check for insufficient data — no company name, domain, or description.
    const hasAnyData =
      context.companyName ||
      context.domain ||
      context.website ||
      context.description ||
      context.industry ||
      context.employeeCount !== null ||
      context.enrichment;

    if (!hasAnyData) {
      return {
        status: "failed",
        message: "There isn't enough company data to research. Add a company name, domain, or description first.",
        result: null,
        provider: provider.id,
        model: provider.model,
        researchedAt: null,
      };
    }

    // Track usage — one explicit user action produces one research operation.
    await trackUsage(orgId, userId, provider.id, "pending");

    // Run the research operation.
    const rawResult = await provider.research(context);

    // Validate structured output BEFORE saving. Reject malformed output safely.
    let validated: CompanyResearchResult;
    try {
      validated = validateCompanyResearchResult(rawResult);
    } catch {
      await trackUsage(orgId, userId, provider.id, "failed");
      return {
        status: "failed",
        message: "The research engine produced an invalid response. Please try again.",
        result: null,
        provider: provider.id,
        model: provider.model,
        researchedAt: null,
      };
    }

    // Persist the validated research result.
    const record = await upsertCompanyResearch({
      organization_id: orgId,
      prospect_id: prospectId,
      domain,
      provider: provider.id,
      model: provider.model,
      status: "completed",
      result: validated,
      sources: validated.sources,
      confidence: validated.confidence.score,
      researched_at: validated.researchedAt,
    });

    await trackUsage(orgId, userId, provider.id, "completed");

    return {
      status: "completed",
      message: "Company research complete.",
      result: validated,
      provider: provider.id,
      model: provider.model,
      researchedAt: record?.researched_at ?? validated.researchedAt,
    };
  } catch (error) {
    const intelError = toIntelligenceError(error, "company-research");
    return {
      status: "failed",
      message: intelError.message,
      result: null,
      provider: "grounded-v1",
      model: null,
      researchedAt: null,
    };
  }
}

/**
 * Returns the stored company research for a prospect without running AI.
 * Used for cached display on page load. Returns null when no research exists.
 */
export async function getCompanyResearchForProspect(
  prospectId: string
): Promise<CompanyResearchRecord | null> {
  try {
    const { orgId } = await getOrgAndUser();

    const supabase = await createClient();
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, organization_id, domain, website")
      .eq("id", prospectId)
      .single();

    if (!prospect || prospect.organization_id !== orgId) {
      return null;
    }

    const domain = normalizeDomain(prospect.domain || prospect.website);
    if (!domain) return null;

    return await getCompanyResearch(prospectId, domain);
  } catch {
    return null;
  }
}