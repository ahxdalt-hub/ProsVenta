// ============================================================================
// Prosventa Person Enrichment — Service
// Stage 6 - Phase 3: People & Decision-Maker Intelligence
// ============================================================================
// Server-side boundary for person enrichment. UI components never call
// external providers directly — they go through this service.
//
// Authorization is resolved server-side from the authenticated user's
// organization membership. The client-supplied prospectId is never trusted.
//
// Flow:
//   1. Verify organization authorization (prospect belongs to user's org)
//   2. Resolve the strongest available person identifier (INSUFFICIENT_DATA
//      when a name alone / nothing is available — no risky lookups)
//   3. Check freshness — reuse existing enrichment when fresh
//   4. Prevent duplicate simultaneous jobs (repeated clicks = one request)
//   5. Resolve provider via Phase 1 architecture + capability check
//   6. Create/process enrichment job + usage tracking (credit preparation)
//   7. Call provider with bounded retry for transient failures
//   8. Normalize + validate response (partial results preserved; contact
//      information only when legitimately returned)
//   9. Store idempotently by prospect_id (unique) + provenance timestamps
//  10. Feed stored data through the EXISTING ICP scoring engine and its
//      automatic recommendation evaluation (no second scoring system)
//  11. Return a safe result to the UI
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { IntelligenceError, toIntelligenceError } from "../errors";
import { assertProviderCapability } from "../capabilities";
import { registerMockProviderIfEnabled } from "../providers/mock";
import { intelligenceProviderRegistry } from "../providers/registry";
import { isMockProviderEnabled } from "../config";
import { withRetry, DEFAULT_RETRY_CONFIG } from "../retry";
import { intelligenceLogger } from "../logger";
import { shouldCreateJob, shouldUseExistingEnrichment } from "../job-state";
import {
  createIntelligenceJob,
  updateIntelligenceJob,
  getIntelligenceJobs,
  recordIntelligenceUsage,
  getProspectEnrichment,
  upsertProspectEnrichment,
} from "@/lib/db/intelligence";
import { resolveProviderIdForOrg } from "../providers/resolve";
import { requirePersonIdentity, identityToProviderInput } from "./identity";
import {
  normalizePersonResult,
  detectPartialPersonResult,
  calculatePersonConfidence,
} from "./normalize";
import { assessDecisionMakerRelevance } from "./relevance";
import type { ProspectEnrichmentOperationResult, ProspectEnrichmentRecord } from "../types";
import type { IntelligenceProvider } from "../types";

// ============================================================================
// Authorization Helper (same pattern as company enrichment service)
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

interface PersonProspectRow {
  id: string;
  organization_id: string;
  company_name: string | null;
  name: string | null;
  domain: string | null;
  website: string | null;
  contact_name: string | null;
  contact_email: string | null;
}

async function resolveProspect(
  prospectId: string,
  orgId: string
): Promise<PersonProspectRow | null> {
  const supabase = await createClient();
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, organization_id, company_name, name, domain, website, contact_name, contact_email")
    .eq("id", prospectId)
    .single();

  // RLS + explicit org check: a prospect from another organization is
  // indistinguishable from a missing one.
  return prospect && prospect.organization_id === orgId ? prospect : null;
}

// ============================================================================
// Provider Resolution (Phase 1 architecture + capability gate)
// ============================================================================

async function resolveProvider(
  orgId: string
): Promise<{ providerId: string; provider: IntelligenceProvider }> {
  registerMockProviderIfEnabled();

  let providerId = await resolveProviderIdForOrg(orgId, "prospect_enrichment");

  // Development-only mock fallback: when no real provider is configured and
  // the mock flag is explicitly enabled, use the clearly-labelled mock.
  if (!providerId && isMockProviderEnabled()) {
    providerId = "mock";
  }

  const id = providerId?.trim() || "prospect-enrichment";
  const provider = intelligenceProviderRegistry.getProvider(id);
  if (!provider) {
    throw new IntelligenceError("PROVIDER_NOT_CONFIGURED", { provider: id });
  }

  // Capability gate — never send a person request to a provider that does not
  // declare person enrichment support (Phase 1 capability system).
  assertProviderCapability(provider, "person_enrichment");

  return { providerId: id, provider };
}

// ============================================================================
// Intelligence Integration (Stage 6 - Phase 3)
// ============================================================================
// After successful person enrichment, feed the stored data back through the
// EXISTING deterministic ICP scoring engine (which already consumes
// prospect_enrichments fields via buildScoringContext) and its existing
// automatic recommendation evaluation. Fire-and-forget.
// ============================================================================

async function rescoreAfterEnrichment(prospectId: string): Promise<void> {
  try {
    const { autoScoreNewProspects } = await import("../scoring/auto-score");
    const result = await autoScoreNewProspects([prospectId]);
    intelligenceLogger.info("post-person-enrichment re-scoring finished", {
      operation: "prospect_enrichment",
      target: prospectId,
      status: result.scored > 0 ? "completed" : "skipped",
      reason: result.reason ?? null,
    });
  } catch (error) {
    console.error("[person-enrichment] Post-enrichment re-scoring failed:", error);
  }
}

// ============================================================================
// Result Helpers
// ============================================================================

function failedResult(
  message: string,
  provider: string,
  identityUsed: ProspectEnrichmentOperationResult["identityUsed"] = null
): ProspectEnrichmentOperationResult {
  return {
    status: "failed",
    message,
    data: null,
    provider,
    enrichedAt: null,
    identityUsed,
    relevance: null,
    warnings: [],
    alreadyInProgress: false,
    usedCached: false,
  };
}

function completedFromRecord(
  record: ProspectEnrichmentRecord | null,
  message: string,
  identityUsed: ProspectEnrichmentOperationResult["identityUsed"],
  options?: { usedCached?: boolean }
): ProspectEnrichmentOperationResult {
  return {
    status: "completed",
    message,
    data: record?.data ?? null,
    provider: record?.provider ?? "person-enrichment",
    enrichedAt: record?.enriched_at ?? null,
    identityUsed,
    relevance: record?.data ? assessDecisionMakerRelevance(record.data) : null,
    warnings: record?.data ? detectPartialPersonResult(record.data).warnings : [],
    alreadyInProgress: false,
    usedCached: Boolean(options?.usedCached),
  };
}

function cleanId(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

// ============================================================================
// Enrichment Operation
// ============================================================================

export async function enrichPersonForProspect(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<ProspectEnrichmentOperationResult> {
  const startedAt = Date.now();
  try {
    const { orgId, userId } = await getOrgAndUser();

    // 1. Resolve + authorize the prospect server-side.
    const prospect = await resolveProspect(prospectId, orgId);
    if (!prospect) {
      return failedResult("Prospect not found in your workspace.", "person-enrichment");
    }

    // 2. Resolve the strongest available identifier. Name alone is refused —
    // common names must never trigger risky lookups or merges.
    let identity;
    try {
      identity = requirePersonIdentity({
        contactEmail: prospect.contact_email,
        contactName: prospect.contact_name || prospect.name,
        domain: prospect.domain || prospect.website,
        companyName: prospect.company_name,
      });
    } catch {
      intelligenceLogger.warn("person enrichment skipped — insufficient identity", {
        operation: "prospect_enrichment",
        target: prospectId,
        status: "skipped",
        errorCategory: "INSUFFICIENT_DATA",
      });
      return failedResult(
        "There isn't enough identifying information to enrich this person safely. Add an email or company domain first.",
        "person-enrichment"
      );
    }

    // 3. Freshness check — reuse fresh stored data without a provider call.
    if (!options?.refresh) {
      const existing = await getProspectEnrichment(prospectId);
      const freshness = shouldUseExistingEnrichment({
        enrichedAt: existing?.last_retrieved_at ?? existing?.enriched_at ?? null,
        isUsable: existing?.status === "completed" && Boolean(existing.data),
      });
      if (freshness.useExisting && existing) {
        return completedFromRecord(existing, "Person already enriched.", identity.strength, {
          usedCached: true,
        });
      }
    }

    // 4. Provider resolution + capability check (Phase 1 systems).
    const { providerId, provider } = await resolveProvider(orgId);

    // 5. Duplicate prevention — repeated clicks produce ONE logical request.
    const jobs = await getIntelligenceJobs(prospectId);
    const jobCheck = shouldCreateJob(
      {
        existingJobs: jobs
          .filter((j) => j.job_type === "prospect_enrichment" && j.provider === providerId)
          .map((j) => ({
            id: j.id,
            status: j.status,
            attempt_count: j.attempt_count,
            max_attempts: j.max_attempts,
          })),
      },
      { refresh: options?.refresh }
    );

    if (!jobCheck.shouldCreate && jobCheck.hasActiveJob) {
      return {
        status: "processing",
        message: "Person enrichment is already in progress.",
        data: null,
        provider: providerId,
        enrichedAt: null,
        identityUsed: identity.strength,
        relevance: null,
        warnings: [],
        alreadyInProgress: true,
        usedCached: false,
      };
    }

    // 6. Job + usage tracking (usage metadata prepared for Stage 8 Credits).
    const job = await createIntelligenceJob({
      organization_id: orgId,
      prospect_id: prospectId,
      created_by: userId,
      job_type: "prospect_enrichment",
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
    await recordIntelligenceUsage({
      organization_id: orgId,
      user_id: userId,
      operation: "prospect_enrichment",
      provider: providerId,
      status: "pending",
    });

    // 7. Call the provider with bounded retry for transient failures.
    const retryResult = await withRetry({
      fn: () => provider.enrichProspect(identityToProviderInput(identity)),
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
      await recordIntelligenceUsage({
        organization_id: orgId,
        user_id: userId,
        operation: "prospect_enrichment",
        provider: providerId,
        status: "failed",
      });
      intelligenceLogger.error("person enrichment failed", {
        operation: "prospect_enrichment",
        provider: providerId,
        target: prospectId,
        status: "failed",
        errorCategory: intelError.code,
        durationMs: Date.now() - startedAt,
      });

      return failedResult(intelError.message, providerId, identity.strength);
    }

    // 8. Normalize + validate. Only legitimately returned data is stored —
    // no invented emails, no guessed titles.
    const rawResult = retryResult.data;
    const normalized = normalizePersonResult(rawResult);

    const hasAnyData = Object.entries(normalized).some(
      ([key, value]) => key !== "confidence" && value !== null
    );
    if (!hasAnyData) {
      await updateIntelligenceJob(job.id, {
        status: "failed",
        error_code: "NOT_FOUND",
        error_message: "The provider could not identify this person.",
        completed_at: new Date().toISOString(),
      });
      await recordIntelligenceUsage({
        organization_id: orgId,
        user_id: userId,
        operation: "prospect_enrichment",
        provider: providerId,
        status: "failed",
      });
      return failedResult(
        "The provider couldn't identify this person with the information available.",
        providerId,
        identity.strength
      );
    }

    // 9. Idempotent store — unique on prospect_id, so refreshes update the
    // existing row instead of creating duplicate people. Provenance
    // (first_retrieved_at anchor, source='provider') is preserved by the DB layer.
    const confidence = calculatePersonConfidence(normalized.confidence, normalized);
    const { warnings } = detectPartialPersonResult(normalized);
    const relevance = assessDecisionMakerRelevance(normalized);

    const record = await upsertProspectEnrichment({
      organization_id: orgId,
      prospect_id: prospectId,
      provider: providerId,
      status: "completed",
      data: normalized,
      raw:
        typeof rawResult === "object" && rawResult !== null
          ? (rawResult as unknown as Record<string, unknown>)
          : null,
      confidence,
      enriched_at: new Date().toISOString(),
      provider_person_id: cleanId(
        (rawResult as unknown as Record<string, unknown> | null)?.providerPersonId
      ),
      source: "provider",
    });

    await updateIntelligenceJob(job.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    await recordIntelligenceUsage({
      organization_id: orgId,
      user_id: userId,
      operation: "prospect_enrichment",
      provider: providerId,
      status: "completed",
    });

    // 10. Existing ICP scoring engine + recommendation re-evaluation.
    await rescoreAfterEnrichment(prospectId);

    intelligenceLogger.info("person enrichment completed", {
      operation: "prospect_enrichment",
      provider: providerId,
      target: prospectId,
      status: "completed",
      relevanceLevel: relevance.level,
      durationMs: Date.now() - startedAt,
    });

    return {
      status: "completed",
      message:
        warnings.length > 0
          ? "Person enriched with partial data."
          : "Person enriched successfully.",
      data: normalized,
      provider: providerId,
      enrichedAt: record?.enriched_at ?? new Date().toISOString(),
      identityUsed: identity.strength,
      relevance,
      warnings,
      alreadyInProgress: false,
      usedCached: false,
    };
  } catch (error) {
    const intelError = toIntelligenceError(error, "person-enrichment");
    intelligenceLogger.error("person enrichment error", {
      operation: "prospect_enrichment",
      provider: "person-enrichment",
      target: prospectId,
      status: "failed",
      errorCategory: intelError.code,
      durationMs: Date.now() - startedAt,
    });
    return failedResult(intelError.message, "person-enrichment");
  }
}

/**
 * Returns the stored person enrichment for a prospect without calling the
 * provider. Used for cached display on page load. Returns null when no
 * enrichment exists or the user lacks access.
 */
export async function getPersonEnrichmentForProspect(
  prospectId: string
): Promise<ProspectEnrichmentRecord | null> {
  try {
    const { orgId } = await getOrgAndUser();
    const prospect = await resolveProspect(prospectId, orgId);
    if (!prospect) return null;
    return await getProspectEnrichment(prospectId);
  } catch {
    return null;
  }
}





