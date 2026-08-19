// ============================================================================
// Prosventa Sales Intelligence Service
// Stage 4 — Phase 1: Intelligence Foundation
// ============================================================================
// Server-side boundary for intelligence operations. UI components never
// call external providers directly — they go through this service.
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { intelligenceProviderRegistry } from "./providers/registry";
import { IntelligenceError, toIntelligenceError, validateDomain } from "./errors";
import { getCompanyEnrichmentProvider, getConfiguredProviderId } from "./providers/company-enrichment";
import { getProspectEnrichmentProvider, getConfiguredProspectProviderId } from "./providers/prospect-enrichment";
import { normalizeDomain } from "./domain";
import { resolveProspectIdentity, identityToProviderInput } from "./prospect-identity";
import {
  createIntelligenceJob,
  updateIntelligenceJob,
  recordIntelligenceUsage,
  getCompanyEnrichment,
  upsertCompanyEnrichment,
  getProspectEnrichment,
  upsertProspectEnrichment,
} from "@/lib/db/intelligence";
import type { EnrichmentResult, ProspectEnrichmentOperationResult, ProspectIntelligence } from "./types";
import type {
  IntelligenceOperation,
  IntelligenceProvider,
  CompanyEnrichmentInput,
  ProspectEnrichmentInput,
  CompanyResearchInput,
  ProspectResearchInput,
  SignalsInput,
} from "./types";

// ============================================================================
// Helpers
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

function getProvider(providerId: string): IntelligenceProvider {
  const provider = intelligenceProviderRegistry.getProvider(providerId);
  if (!provider) {
    throw new IntelligenceError("PROVIDER_UNAVAILABLE", { provider: providerId });
  }
  return provider;
}

async function createJob(
  orgId: string,
  userId: string,
  prospectId: string | null,
  operation: IntelligenceOperation,
  providerId: string
) {
  const job = await createIntelligenceJob({
    organization_id: orgId,
    prospect_id: prospectId,
    created_by: userId,
    job_type: operation,
    provider: providerId,
    status: "pending",
  });
  if (!job) {
    throw new IntelligenceError("UNKNOWN_PROVIDER_ERROR", { provider: providerId });
  }
  return job;
}

async function trackUsage(
  orgId: string,
  userId: string,
  operation: IntelligenceOperation,
  providerId: string,
  status: "pending" | "completed" | "failed"
) {
  await recordIntelligenceUsage({
    organization_id: orgId,
    user_id: userId,
    operation,
    provider: providerId,
    status,
  });
}

// ============================================================================
// Enrichment
// ============================================================================

export async function enrichCompany(
  providerId: string,
  input: CompanyEnrichmentInput
): Promise<{ data?: unknown; error?: string }> {
  try {
    const domainError = validateDomain(input.domain);
    if (domainError) return { error: domainError.message };

    const { orgId, userId } = await getOrgAndUser();
    const provider = getProvider(providerId);
    const job = await createJob(orgId, userId, null, "company_enrichment", providerId);

    await updateIntelligenceJob(job.id, { status: "processing", started_at: new Date().toISOString() });
    await trackUsage(orgId, userId, "company_enrichment", providerId, "pending");

    const result = await provider.enrichCompany(input);

    await updateIntelligenceJob(job.id, { status: "completed", completed_at: new Date().toISOString() });
    await trackUsage(orgId, userId, "company_enrichment", providerId, "completed");

    return { data: result };
  } catch (error) {
    const intelError = toIntelligenceError(error, providerId);
    return { error: intelError.message };
  }
}

export async function enrichCompanyForProspect(
  prospectId: string,
  domainInput: string,
  options?: { refresh?: boolean }
): Promise<EnrichmentResult> {
  try {
    const domain = normalizeDomain(domainInput);
    if (!domain) {
      return { status: "failed", message: "Please enter a valid company domain.", data: null, provider: "company-enrichment", enrichedAt: null };
    }

    const { orgId, userId } = await getOrgAndUser();

    // Cache check — do not call provider on every page load.
    if (!options?.refresh) {
      const existing = await getCompanyEnrichment(prospectId, domain);
      if (existing && existing.status === "completed" && existing.data) {
        return { status: "completed", message: "Company already enriched.", data: existing.data, provider: existing.provider, enrichedAt: existing.enriched_at };
      }
    }

    const providerId = getConfiguredProviderId() ?? "company-enrichment";
    const provider = getCompanyEnrichmentProvider(providerId);

    await trackUsage(orgId, userId, "company_enrichment", providerId, "pending");

    const result = await provider.enrichCompany({ domain });

    const record = await upsertCompanyEnrichment({
      organization_id: orgId,
      prospect_id: prospectId,
      domain,
      provider: providerId,
      status: "completed",
      data: result,
      confidence: typeof result === "object" && result !== null && "confidence" in result ? (result as { confidence?: number }).confidence ?? null : null,
      enriched_at: new Date().toISOString(),
    });

    await trackUsage(orgId, userId, "company_enrichment", providerId, "completed");

    return { status: "completed", message: "Company enriched successfully.", data: result, provider: providerId, enrichedAt: record?.enriched_at ?? null };
  } catch (error) {
    const intelError = toIntelligenceError(error, "company-enrichment");
    return {
      status: "failed",
      message: intelError.message,
      data: null,
      provider: "company-enrichment",
      enrichedAt: null,
    };
  }
}

// ============================================================================
// Prospect / Contact Enrichment
// ============================================================================

/**
 * Enriches an existing prospect with professional/contact intelligence.
 * Preserves the existing prospect record — provider data is stored in a
 * separate `prospect_enrichments` table and never overwrites user data.
 *
 * Authorization is resolved server-side from the authenticated user's
 * organization membership. The client-supplied prospectId is never trusted
 * to determine workspace access.
 */
export async function enrichProspectForProspect(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<ProspectEnrichmentOperationResult> {
  try {
    const { orgId, userId } = await getOrgAndUser();

    // Resolve the prospect server-side to verify workspace authorization.
    // RLS ensures the user can only access prospects in their own org.
    const supabase = await createClient();
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, organization_id, contact_name, contact_email, domain, company_name, website")
      .eq("id", prospectId)
      .single();

    if (!prospect) {
      return {
        status: "failed",
        message: "Prospect not found.",
        data: null,
        provider: "prospect-enrichment",
        enrichedAt: null,
        identityUsed: null,
      };
    }

    // Verify the prospect belongs to the authenticated user's org.
    if (prospect.organization_id !== orgId) {
      return {
        status: "failed",
        message: "You do not have access to this prospect.",
        data: null,
        provider: "prospect-enrichment",
        enrichedAt: null,
        identityUsed: null,
      };
    }

    // Cache check — do not call provider on every page load.
    if (!options?.refresh) {
      const existing = await getProspectEnrichment(prospectId);
      if (existing && existing.status === "completed" && existing.data) {
        return {
          status: "completed",
          message: "Prospect already enriched.",
          data: existing.data,
          provider: existing.provider,
          enrichedAt: existing.enriched_at,
          identityUsed: null,
        };
      }
    }

    // Resolve the strongest available identity.
    const identity = resolveProspectIdentity({
      contactEmail: prospect.contact_email,
      contactName: prospect.contact_name,
      domain: prospect.domain,
      companyName: prospect.company_name,
    });

    if (identity.strength === "none") {
      return {
        status: "failed",
        message: "Not enough identifying information to enrich this prospect. Add an email, LinkedIn URL, or company domain.",
        data: null,
        provider: "prospect-enrichment",
        enrichedAt: null,
        identityUsed: "none",
      };
    }

    const providerId = getConfiguredProspectProviderId() ?? "prospect-enrichment";
    const provider = getProspectEnrichmentProvider(providerId);

    await trackUsage(orgId, userId, "prospect_enrichment", providerId, "pending");

    const result = await provider.enrichProspect(identityToProviderInput(identity));

    const record = await upsertProspectEnrichment({
      organization_id: orgId,
      prospect_id: prospectId,
      provider: providerId,
      status: "completed",
      data: result,
      confidence: result.confidence ?? null,
      enriched_at: new Date().toISOString(),
    });

    await trackUsage(orgId, userId, "prospect_enrichment", providerId, "completed");

    return {
      status: "completed",
      message: "Prospect enriched successfully.",
      data: result,
      provider: providerId,
      enrichedAt: record?.enriched_at ?? null,
      identityUsed: identity.strength,
    };
  } catch (error) {
    const intelError = toIntelligenceError(error, "prospect-enrichment");
    return {
      status: "failed",
      message: intelError.message,
      data: null,
      provider: "prospect-enrichment",
      enrichedAt: null,
      identityUsed: null,
    };
  }
}

/**
 * Builds the UI display model combining user-provided prospect data with
 * stored enrichment data. User data always takes precedence for display.
 * Returns null when no enrichment exists.
 */
export async function getProspectIntelligence(
  prospectId: string
): Promise<ProspectIntelligence | null> {
  const { orgId } = await getOrgAndUser();

  const supabase = await createClient();
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, organization_id, contact_name, contact_email, domain, company_name, city, country, location")
    .eq("id", prospectId)
    .single();

  if (!prospect || prospect.organization_id !== orgId) {
    return null;
  }

  const enrichment = await getProspectEnrichment(prospectId);
  if (!enrichment || enrichment.status !== "completed" || !enrichment.data) {
    return null;
  }

  const d = enrichment.data;
  const userLocation = [prospect.city, prospect.country].filter(Boolean).join(", ") || prospect.location || null;

  return {
    jobTitle: { user: null, enriched: d.jobTitle },
    department: { enriched: d.department },
    seniority: { enriched: d.seniority },
    location: { user: userLocation, enriched: d.location },
    linkedin: { user: null, enriched: d.linkedin },
    workEmail: { user: prospect.contact_email, enriched: d.contactEmail },
    company: { user: prospect.company_name, enriched: d.companyName },
    companyDomain: { user: prospect.domain, enriched: d.companyDomain },
    provider: enrichment.provider,
    enrichedAt: enrichment.enriched_at,
    confidence: enrichment.confidence,
    status: enrichment.status,
  };
}

export async function enrichProspect(
  providerId: string,
  input: ProspectEnrichmentInput
): Promise<{ data?: unknown; error?: string }> {
  try {
    if (input.domain) {
      const domainError = validateDomain(input.domain);
      if (domainError) return { error: domainError.message };
    }

    const { orgId, userId } = await getOrgAndUser();
    const provider = getProvider(providerId);
    const job = await createJob(orgId, userId, null, "prospect_enrichment", providerId);

    await updateIntelligenceJob(job.id, { status: "processing", started_at: new Date().toISOString() });
    await trackUsage(orgId, userId, "prospect_enrichment", providerId, "pending");

    const result = await provider.enrichProspect(input);

    await updateIntelligenceJob(job.id, { status: "completed", completed_at: new Date().toISOString() });
    await trackUsage(orgId, userId, "prospect_enrichment", providerId, "completed");

    return { data: result };
  } catch (error) {
    const intelError = toIntelligenceError(error, providerId);
    return { error: intelError.message };
  }
}

// ============================================================================
// Research
// ============================================================================

export async function researchCompany(
  providerId: string,
  input: CompanyResearchInput
): Promise<{ data?: unknown; error?: string }> {
  try {
    const domainError = validateDomain(input.domain);
    if (domainError) return { error: domainError.message };

    const { orgId, userId } = await getOrgAndUser();
    const provider = getProvider(providerId);
    const job = await createJob(orgId, userId, null, "company_research", providerId);

    await updateIntelligenceJob(job.id, { status: "processing", started_at: new Date().toISOString() });
    await trackUsage(orgId, userId, "company_research", providerId, "pending");

    const result = await provider.researchCompany(input);

    await updateIntelligenceJob(job.id, { status: "completed", completed_at: new Date().toISOString() });
    await trackUsage(orgId, userId, "company_research", providerId, "completed");

    return { data: result };
  } catch (error) {
    const intelError = toIntelligenceError(error, providerId);
    return { error: intelError.message };
  }
}

export async function researchProspect(
  providerId: string,
  input: ProspectResearchInput
): Promise<{ data?: unknown; error?: string }> {
  try {
    if (input.domain) {
      const domainError = validateDomain(input.domain);
      if (domainError) return { error: domainError.message };
    }

    const { orgId, userId } = await getOrgAndUser();
    const provider = getProvider(providerId);
    const job = await createJob(orgId, userId, null, "prospect_research", providerId);

    await updateIntelligenceJob(job.id, { status: "processing", started_at: new Date().toISOString() });
    await trackUsage(orgId, userId, "prospect_research", providerId, "pending");

    const result = await provider.researchProspect(input);

    await updateIntelligenceJob(job.id, { status: "completed", completed_at: new Date().toISOString() });
    await trackUsage(orgId, userId, "prospect_research", providerId, "completed");

    return { data: result };
  } catch (error) {
    const intelError = toIntelligenceError(error, providerId);
    return { error: intelError.message };
  }
}

// ============================================================================
// Signals
// ============================================================================

export async function getSignals(
  providerId: string,
  input: SignalsInput
): Promise<{ data?: unknown; error?: string }> {
  try {
    const domainError = validateDomain(input.domain);
    if (domainError) return { error: domainError.message };

    const { orgId, userId } = await getOrgAndUser();
    const provider = getProvider(providerId);
    const job = await createJob(orgId, userId, null, "signals", providerId);

    await updateIntelligenceJob(job.id, { status: "processing", started_at: new Date().toISOString() });
    await trackUsage(orgId, userId, "signals", providerId, "pending");

    const result = await provider.getSignals(input);

    await updateIntelligenceJob(job.id, { status: "completed", completed_at: new Date().toISOString() });
    await trackUsage(orgId, userId, "signals", providerId, "completed");

    return { data: result };
  } catch (error) {
    const intelError = toIntelligenceError(error, providerId);
    return { error: intelError.message };
  }
}