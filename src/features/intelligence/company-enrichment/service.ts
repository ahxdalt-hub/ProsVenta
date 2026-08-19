// ============================================================================
// Prosventa Company Enrichment — Service
// Stage 5 — Phase 2: Company Enrichment
// ============================================================================
// Server-side boundary for company enrichment operations. UI components never
// call external providers directly — they go through this service.
//
// Authorization is resolved server-side from the authenticated user's
// organization membership. The client-supplied prospectId is never trusted
// to determine workspace access.
//
// Flow:
//   1. Validate company + normalize domain
//   2. Verify organization authorization (prospect belongs to user's org)
//   3. Check freshness — reuse existing enrichment when fresh
//   4. Prevent duplicate simultaneous jobs for the same target
//   5. Create/process enrichment job
//   6. Call provider (with bounded retry for transient failures)
//   7. Normalize + validate provider response (partial results preserved)
//   8. Store normalized enrichment + record provider/source/confidence
//   9. Update job status + record usage
//  10. Return a safe result to the UI
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeDomain } from "../domain";
import { IntelligenceError, toIntelligenceError } from "../errors";
import {
  getCompanyEnrichmentProvider,
  getConfiguredProviderId,
} from "../providers/company-enrichment";
import { registerMockProviderIfEnabled } from "../providers/mock";
import { isMockProviderEnabled } from "../config";
import { withRetry, DEFAULT_RETRY_CONFIG } from "../retry";
import { intelligenceLogger } from "../logger";
import { shouldUseExistingEnrichment, shouldCreateJob } from "../job-state";
import { normalizeIntelligenceResult } from "../normalized";
import { calculateConfidence } from "./confidence";
import { detectPartialResult } from "./partial";
import {
  getCompanyEnrichment,
  upsertCompanyEnrichment,
  createIntelligenceJob,
  updateIntelligenceJob,
  getIntelligenceJobs,
  recordIntelligenceUsage,
} from "@/lib/db/intelligence";
import type { CompanyEnrichmentOperationResult } from "./types";
import type {
  CompanyEnrichmentResult,
  IntelligenceProvider,
} from "../types";

// ============================================================================
// Authorization Helper
// ============================================================================

async function getOrgAndUser(): Promise<{ orgId: string; userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new IntelligenceError("AUTHENTICATION_FAILED");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) throw new IntelligenceError("AUTHENTICATION_FAILED");

  return { orgId: membership.organization_id, userId: user.id };
}

/**
 * Resolves a prospect server-side and verifies it belongs to the user's org.
 * Returns null when the prospect is missing or not in the user's workspace.
 */
async function resolveProspect(
  prospectId: string,
  orgId: string
): Promise<{
  id: string;
  organization_id: string;
  company_name: string | null;
  name: string | null;
  domain: string | null;
  website: string | null;
} | null> {
  const supabase = await createClient();
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, organization_id, company_name, name, domain, website")
    .eq("id", prospectId)
    .single();

  if (!prospect || prospect.organization_id !== orgId) return null;
  return prospect;
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
    operation: "company_enrichment",
    provider: providerId,
    status,
  });
}

// ============================================================================
// Provider Resolution
// ============================================================================

function resolveProvider(): { providerId: string; provider: IntelligenceProvider } {
  // Ensure the dev mock provider is registered when explicitly enabled.
  registerMockProviderIfEnabled();

  // Prefer the configured provider; fall back to the mock in development
  // when enabled, otherwise the default "company-enrichment" id.
  const providerId =
    getConfiguredProviderId() ??
    (isMockProviderEnabled() ? "mock" : "company-enrichment");

  const provider = getCompanyEnrichmentProvider(providerId);
  return { providerId, provider };
}

// ============================================================================
// Enrichment Operation
// ============================================================================

/**
 * Enriches a company for an existing prospect.
 *
 * Authorization:
 *  - authenticated user
 *  - workspace membership (resolved server-side)
 *  - company ownership/access (prospect belongs to user's org)
 *
 * Freshness:
 *  - Reuses existing enrichment when it is fresh (no provider call).
 *  - `refresh: true` forces a new provider call.
 *
 * Duplicate prevention:
 *  - Blocks a new job when an identical enrichment is already in progress.
 */
export async function enrichCompanyForProspect(
  prospectId: string,
  domainInput: string,
  options?: { refresh?: boolean }
): Promise<CompanyEnrichmentOperationResult> {
  const startedAt = Date.now();
  try {
    const { orgId, userId } = await getOrgAndUser();

    // Resolve the prospect server-side to verify workspace authorization.
    const prospect = await resolveProspect(prospectId, orgId);
    if (!prospect) {
      return failedResult("Company not found.", "company-enrichment");
    }

    // Normalize the domain (from input, or fall back to the prospect's own).
    const domain = normalizeDomain(domainInput || prospect.domain || prospect.website);
    if (!domain) {
      return failedResult(
        "Please enter a valid company domain.",
        "company-enrichment"
      );
    }

    // Freshness check — reuse existing enrichment when it is fresh.
    if (!options?.refresh) {
      const existing = await getCompanyEnrichment(prospectId, domain);
      const decision = shouldUseExistingEnrichment({
        enrichedAt: existing?.enriched_at ?? null,
        isUsable: existing?.status === "completed" && Boolean(existing.data),
      });

      if (decision.useExisting && existing?.data) {
        return {
          status: "completed",
          message: "Company data is up to date.",
          data: existing.data,
          provider: existing.provider,
          enrichedAt: existing.enriched_at,
          confidence: existing.confidence,
          partial: false,
          warnings: [],
          alreadyInProgress: false,
          usedCached: true,
        };
      }
    }

    // Resolve the provider (registers the dev mock when enabled).
    const { providerId, provider } = resolveProvider();

    // Duplicate prevention — never start a second identical job.
    const jobs = await getIntelligenceJobs(prospectId);
    const companyJobs = jobs.filter((j) => j.job_type === "company_enrichment");
    const duplicateCheck = shouldCreateJob(
      { existingJobs: companyJobs },
      { refresh: options?.refresh }
    );

    if (duplicateCheck.hasActiveJob) {
      return {
        status: "processing",
        message: "Company enrichment is already in progress.",
        data: null,
        provider: providerId,
        enrichedAt: null,
        confidence: null,
        partial: false,
        warnings: [],
        alreadyInProgress: true,
        usedCached: false,
      };
    }

    // Create + start the enrichment job.
    const job = await createIntelligenceJob({
      organization_id: orgId,
      prospect_id: prospectId,
      created_by: userId,
      job_type: "company_enrichment",
      provider: providerId,
      status: "pending",
    });
    if (!job) {
      throw new IntelligenceError("UNKNOWN_PROVIDER_ERROR", { provider: providerId });
    }

    await updateIntelligenceJob(job.id, {
      status: "processing",
      started_at: new Date().toISOString(),
    });
    await trackUsage(orgId, userId, providerId, "pending");

    // Call the provider with bounded retry for transient failures.
    const retryResult = await withRetry<CompanyEnrichmentResult>({
      fn: () =>
        provider.enrichCompany({
          domain,
          companyName: prospect.company_name || prospect.name || null,
        }),
      config: { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2 },
    });

    if (!retryResult.succeeded || !retryResult.data) {
      const error =
        retryResult.error ??
        new IntelligenceError("PROVIDER_UNAVAILABLE", { provider: providerId });
      const intelError = toIntelligenceError(error, providerId);

      await updateIntelligenceJob(job.id, {
        status: "failed",
        error_code: intelError.code,
        error_message: intelError.message,
        completed_at: new Date().toISOString(),
      });
      await trackUsage(orgId, userId, providerId, "failed");
      intelligenceLogger.error("company enrichment failed", {
        operation: "company_enrichment",
        provider: providerId,
        target: domain,
        status: "failed",
        errorCategory: intelError.code,
        durationMs: Date.now() - startedAt,
      });

      return failedResult(intelError.message, providerId);
    }

    const rawResult = retryResult.data;

    // Normalize + validate the provider response. Partial results are
    // preserved and surfaced as warnings — never hidden.
    const { partial, warnings } = detectPartialResult(rawResult);
    const confidence = calculateConfidence(rawResult.confidence, rawResult);
    const normalized = normalizeIntelligenceResult(rawResult, {
      provider: providerId,
      confidence,
      partial,
      warnings,
    });

    // Store the normalized enrichment.
    const record = await upsertCompanyEnrichment({
      organization_id: orgId,
      prospect_id: prospectId,
      domain,
      provider: providerId,
      status: "completed",
      data: normalized.data,
      raw: normalized.raw,
      confidence: normalized.confidence,
      enriched_at: new Date().toISOString(),
    });

    await updateIntelligenceJob(job.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    await trackUsage(orgId, userId, providerId, "completed");
    intelligenceLogger.info("company enrichment completed", {
      operation: "company_enrichment",
      provider: providerId,
      target: domain,
      status: "completed",
      durationMs: Date.now() - startedAt,
      retryCount: retryResult.metadata.retried ? retryResult.metadata.attempts : 0,
    });

    return {
      status: "completed",
      message: partial
        ? "Company enriched with partial data."
        : "Company enriched successfully.",
      data: normalized.data,
      provider: providerId,
      enrichedAt: record?.enriched_at ?? null,
      confidence: normalized.confidence,
      partial,
      warnings,
      alreadyInProgress: false,
      usedCached: false,
    };
  } catch (error) {
    const intelError = toIntelligenceError(error, "company-enrichment");
    intelligenceLogger.error("company enrichment error", {
      operation: "company_enrichment",
      provider: "company-enrichment",
      target: domainInput,
      status: "failed",
      errorCategory: intelError.code,
      durationMs: Date.now() - startedAt,
    });
    return failedResult(intelError.message, "company-enrichment");
  }
}

/**
 * Returns the stored company enrichment for a prospect without calling the
 * provider. Used for cached display on page load. Returns null when no
 * enrichment exists or the user lacks access.
 */
export async function getCompanyEnrichmentForProspect(
  prospectId: string
): Promise<CompanyEnrichmentRecordLike | null> {
  try {
    const { orgId } = await getOrgAndUser();

    const prospect = await resolveProspect(prospectId, orgId);
    if (!prospect) return null;

    const domain = normalizeDomain(prospect.domain || prospect.website);
    if (!domain) return null;

    return await getCompanyEnrichment(prospectId, domain);
  } catch {
    return null;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function failedResult(
  message: string,
  provider: string
): CompanyEnrichmentOperationResult {
  return {
    status: "failed",
    message,
    data: null,
    provider,
    enrichedAt: null,
    confidence: null,
    partial: false,
    warnings: [],
    alreadyInProgress: false,
    usedCached: false,
  };
}

// Minimal structural type for the stored enrichment record returned to the UI.
// Keeps the service decoupled from the full DB record shape.
export interface CompanyEnrichmentRecordLike {
  id: string;
  organization_id: string;
  prospect_id: string;
  domain: string;
  provider: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  data: CompanyEnrichmentResult | null;
  raw: Record<string, unknown> | null;
  confidence: number | null;
  enriched_at: string | null;
  created_at: string;
  updated_at: string;
}