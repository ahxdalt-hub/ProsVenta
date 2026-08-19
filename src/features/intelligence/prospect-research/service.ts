// ============================================================================
// Prosventa AI Prospect Research — Service
// Stage 4 — Phase 5: AI Prospect Research
// ============================================================================
// Server-side boundary for prospect research operations. UI components never
// call AI providers directly — they go through this service.
//
// Authorization is resolved server-side from the authenticated user's
// organization membership. The client-supplied prospectId is never trusted
// to determine workspace access.
//
// One explicit user action produces one research operation. Research is
// cached in the prospect_research table and only re-run on explicit refresh.
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeDomain } from "../domain";
import { IntelligenceError, toIntelligenceError } from "../errors";
import { getProspectResearchProvider } from "./registry";
import { validateProspectResearchResult } from "./validate";
import {
  getCompanyEnrichment,
  getProspectEnrichment,
  recordIntelligenceUsage,
} from "@/lib/db/intelligence";
import { getCompanyResearch } from "@/lib/db/company-research";
import {
  getProspectResearch,
  upsertProspectResearch,
} from "@/lib/db/prospect-research";
import type {
  ProspectResearchCompanyBrief,
  ProspectResearchCompanyEnrichment,
  ProspectResearchContext,
  ProspectResearchEnrichmentData,
  ProspectResearchOperationResult,
  ProspectResearchRecord,
  ProspectResearchResult,
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
// Gathers available relevant prospect information from existing Prosventa data.
// Uses the strongest available information. Does NOT send internal notes or
// sensitive personal information into the research context.
// ============================================================================

async function buildResearchContext(
  prospectId: string,
  orgId: string
): Promise<ProspectResearchContext> {
  const supabase = await createClient();

  // Resolve the prospect server-side to verify workspace authorization.
  // RLS ensures the user can only access prospects in their own org.
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

  // Load prospect/contact enrichment data when available (does not call provider).
  let prospectEnrichment: ProspectResearchEnrichmentData | null = null;
  const prospectEnrichmentRecord = await getProspectEnrichment(prospectId);
  if (prospectEnrichmentRecord?.status === "completed" && prospectEnrichmentRecord.data) {
    const d = prospectEnrichmentRecord.data;
    prospectEnrichment = {
      contactName: d.contactName ?? null,
      firstName: d.firstName ?? null,
      lastName: d.lastName ?? null,
      contactEmail: d.contactEmail ?? null,
      contactPhone: d.contactPhone ?? null,
      jobTitle: d.jobTitle ?? null,
      seniority: d.seniority ?? null,
      department: d.department ?? null,
      companyName: d.companyName ?? null,
      companyDomain: d.companyDomain ?? null,
      linkedin: d.linkedin ?? null,
      profileUrl: d.profileUrl ?? null,
      location: d.location ?? null,
      country: d.country ?? null,
      city: d.city ?? null,
      summary: d.summary ?? null,
      confidence: d.confidence ?? null,
    };
  }

  // Load company enrichment data when available.
  let companyEnrichment: ProspectResearchCompanyEnrichment | null = null;
  if (domain) {
    const companyEnrichmentRecord = await getCompanyEnrichment(prospectId, domain);
    if (companyEnrichmentRecord?.status === "completed" && companyEnrichmentRecord.data) {
      const d = companyEnrichmentRecord.data;
      companyEnrichment = {
        companyName: d.companyName ?? null,
        domain: d.domain ?? null,
        website: d.website ?? null,
        description: d.description ?? null,
        industry: d.industry ?? null,
        employeeCount: d.employeeCount ?? null,
        employeeRange: d.employeeRange ?? null,
        headquarters: d.headquarters ?? null,
        country: d.country ?? null,
        city: d.city ?? null,
        companyType: d.companyType ?? null,
        foundedYear: d.foundedYear ?? null,
        linkedin: d.linkedin ?? null,
        technologies: d.technologies ?? [],
        confidence: d.confidence ?? null,
      };
    }
  }

  // Load company research brief when available.
  let companyBrief: ProspectResearchCompanyBrief | null = null;
  if (domain) {
    const companyResearchRecord = await getCompanyResearch(prospectId, domain);
    if (companyResearchRecord?.status === "completed" && companyResearchRecord.result) {
      const r = companyResearchRecord.result;
      companyBrief = {
        overview: r.overview ?? null,
        whatTheyDo: r.whatTheyDo ?? null,
        industry: r.industry ?? null,
        businessModel: r.businessModel ?? null,
        companySize: r.companySize ?? null,
        headquarters: r.headquarters ?? null,
        salesRelevance: r.salesRelevance ?? null,
      };
    }
  }

  // Derive job title / department / seniority from enrichment when available.
  const jobTitle = prospectEnrichment?.jobTitle ?? null;
  const department = prospectEnrichment?.department ?? null;
  const seniority = prospectEnrichment?.seniority ?? null;
  const linkedinUrl = prospectEnrichment?.linkedin ?? null;
  const workEmail = prospect.contact_email || prospectEnrichment?.contactEmail || null;
  const workEmailDomain = workEmail ? normalizeDomain(workEmail.split("@")[1]) ?? null : null;

  return {
    prospectName: prospect.contact_name || prospect.name || null,
    jobTitle,
    department,
    seniority,
    workEmail,
    workEmailDomain,
    linkedinUrl,
    location: prospect.location || prospectEnrichment?.location || null,
    country: prospect.country || prospectEnrichment?.country || null,
    city: prospect.city || prospectEnrichment?.city || null,
    companyName: prospect.company_name || prospectEnrichment?.companyName || null,
    companyDomain: domain || prospectEnrichment?.companyDomain || null,
    description: prospect.description || companyEnrichment?.description || null,
    industry: prospect.industry || companyEnrichment?.industry || null,
    employeeCount: prospect.employee_count ?? companyEnrichment?.employeeCount ?? null,
    prospectEnrichment,
    companyEnrichment,
    companyBrief,
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
    operation: "prospect_research",
    provider: providerId,
    status,
  });
}

// ============================================================================
// Research Operation
// ============================================================================

/**
 * Researches a prospect using available professional information.
 *
 * Authorization:
 *  - authenticated user
 *  - workspace membership (resolved server-side)
 *  - prospect ownership/access (prospect belongs to user's org)
 *  - valid prospect ID
 *
 * Caching:
 *  - Does NOT run AI research on every page load.
 *  - Returns the stored result when available (unless refresh is requested).
 *  - One explicit user action produces one research operation.
 */
export async function researchProspectForProspect(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<ProspectResearchOperationResult> {
  try {
    const { orgId, userId } = await getOrgAndUser();

    // Resolve the prospect server-side to verify workspace authorization.
    const supabase = await createClient();
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, organization_id, company_name, name, website, domain, contact_name, contact_email")
      .eq("id", prospectId)
      .single();

    if (!prospect) {
      return {
        status: "failed",
        message: "Prospect not found.",
        result: null,
        provider: "grounded-prospect-v1",
        model: null,
        researchedAt: null,
      };
    }

    // Verify the prospect belongs to the authenticated user's org.
    if (prospect.organization_id !== orgId) {
      return {
        status: "failed",
        message: "You do not have access to this prospect.",
        result: null,
        provider: "grounded-prospect-v1",
        model: null,
        researchedAt: null,
      };
    }

    // Cache check — do not run AI research on every page load.
    if (!options?.refresh) {
      const existing = await getProspectResearch(prospectId);
      if (existing && existing.status === "completed" && existing.result) {
        return {
          status: "completed",
          message: "Prospect research already available.",
          result: existing.result,
          provider: existing.provider,
          model: existing.model,
          researchedAt: existing.researched_at,
        };
      }
    }

    // Resolve the AI research provider (grounded engine by default).
    const provider = getProspectResearchProvider();

    // Build the research context from available Prosventa data.
    const context = await buildResearchContext(prospectId, orgId);

    // Check for insufficient data — no prospect name, title, or company.
    const hasAnyData =
      context.prospectName ||
      context.jobTitle ||
      context.companyName ||
      context.workEmail ||
      context.linkedinUrl ||
      context.prospectEnrichment;

    if (!hasAnyData) {
      return {
        status: "failed",
        message: "There isn't enough prospect data to research. Add a contact name, job title, or company first.",
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
    let validated: ProspectResearchResult;
    try {
      validated = validateProspectResearchResult(rawResult);
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
    const record = await upsertProspectResearch({
      organization_id: orgId,
      prospect_id: prospectId,
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
      message: "Prospect research complete.",
      result: validated,
      provider: provider.id,
      model: provider.model,
      researchedAt: record?.researched_at ?? validated.researchedAt,
    };
  } catch (error) {
    const intelError = toIntelligenceError(error, "prospect-research");
    return {
      status: "failed",
      message: intelError.message,
      result: null,
      provider: "grounded-prospect-v1",
      model: null,
      researchedAt: null,
    };
  }
}

/**
 * Returns the stored prospect research for a prospect without running AI.
 * Used for cached display on page load. Returns null when no research exists.
 */
export async function getProspectResearchForProspect(
  prospectId: string
): Promise<ProspectResearchRecord | null> {
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

    return await getProspectResearch(prospectId);
  } catch {
    return null;
  }
}