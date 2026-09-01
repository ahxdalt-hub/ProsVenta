// ============================================================================
// Prosventa Discovery Service
// Find Matching Leads — Phase 4 hardened
// ============================================================================
// Orchestrates: validate → merge active-ICP defaults → provider query
// (server-side only) → normalize → deduplicate → ICP match scoring → sort →
// usage record. Includes bounded retries with exponential backoff, structured
// error codes, and internal observability (no secrets, no raw provider data).
// ============================================================================

// ============================================================================
// NOTE (Phase 4 architecture audit): the legacy Phase 7 discovery path
// (validateDiscoveryRequest / normalizeDiscoveryRequest / submitDiscoveryRequest /
// updateDiscoverySearchStatus) was removed. It duplicated the hardened
// runLeadSearch pipeline without its security, resilience, or matching logic
// and had no remaining callers. All searches flow exclusively through
// searchMatchingLeadsAction → runLeadSearch → provider registry.
// ============================================================================

// ============================================================================
// Phase 8: Real Lead Discovery Orchestration
// ============================================================================
// The saved ICP is only READ here — a search never mutates it.
// ============================================================================

import { getActiveLeadProvider } from "@/features/prospects/providers/registry";
import {
  DiscoveryError,
  type LeadSearchPage,
  type LeadSearchRequest,
  type NormalizedLead,
  type ScoredLead,
  type LeadSortOption,
} from "@/features/prospects/types/discovery";
import { scoreLeadAgainstIcp } from "./icp-match";
import type { IcpCriteria } from "@/features/intelligence/scoring/types";
import { recordProviderUsage } from "./provider-usage";

const DEFAULT_PAGE_SIZE = 25;

export interface DiscoveryValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Field-level validation mirroring what the UI checks client-side. */
export function validateLeadSearchRequest(
  request: LeadSearchRequest
): DiscoveryValidationResult {
  const errors: Record<string, string> = {};

  const hasQuery = Boolean(request.query?.trim());
  const hasIndustries = (request.industries ?? []).some((i) => i.trim());
  const hasLocations = (request.locations ?? []).some((l) => l.trim());
  const hasTitles = (request.jobTitles ?? []).some((t) => t.trim());

  if (!hasQuery && !hasIndustries && !hasLocations && !hasTitles) {
    errors.general =
      "Provide a search query or at least one filter to find matching leads.";
  }

  if (request.limit != null && (!Number.isFinite(request.limit) || request.limit < 1 || request.limit > 100)) {
    errors.limit = "Page size must be between 1 and 100.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Merges the user's search controls with their active ICP targeting criteria.
 * ICP values fill gaps ONLY — explicit user input always wins, and the saved
 * ICP itself is never modified by running a search.
 */
export function applyIcpDefaults(
  request: LeadSearchRequest,
  icpCriteria: IcpCriteria | null
): LeadSearchRequest & { usedIcpDefaults: boolean } {
  if (!icpCriteria) return { ...request, usedIcpDefaults: false };

  const merged: LeadSearchRequest = {
    ...request,
    industries:
      request.industries && request.industries.length > 0
        ? request.industries
        : icpCriteria.company.targetIndustries.slice(0, 5),
    locations:
      request.locations && request.locations.length > 0
        ? request.locations
        : icpCriteria.company.targetCountries.slice(0, 5),
    jobTitles:
      request.jobTitles && request.jobTitles.length > 0
        ? request.jobTitles
        : icpCriteria.prospect.targetJobTitles.slice(0, 5),
  };

  const usedIcpDefaults =
    merged.industries !== request.industries ||
    merged.locations !== request.locations ||
    merged.jobTitles !== request.jobTitles;

  return { ...merged, usedIcpDefaults };
}

function normalizeIdentity(value: string | null | undefined): string {
  return norm(value).replace(/\s+/g, " ");
}

/**
 * Deduplicates results preferring stable provider IDs and falling back to a
 * normalized person+company identity — never display names alone.
 */
export function dedupeLeads(leads: NormalizedLead[]): NormalizedLead[] {
  const seenProviderIds = new Set<string>();
  const seenIdentities = new Set<string>();
  const unique: NormalizedLead[] = [];

  for (const lead of leads) {
    if (lead.providerLeadId) {
      if (seenProviderIds.has(lead.providerLeadId)) continue;
      seenProviderIds.add(lead.providerLeadId);
    }
    const identity =
      `${normalizeIdentity(lead.personName)}|${normalizeIdentity(lead.companyName)}|${normalizeIdentity(lead.companyDomain)}`;
    if (identity !== "||") {
      if (seenIdentities.has(identity)) continue;
      seenIdentities.add(identity);
    }
    unique.push(lead);
  }

  return unique;
}

export function sortScoredLeads(leads: ScoredLead[], sortBy: LeadSortOption): ScoredLead[] {
  const sorted = [...leads];
  switch (sortBy) {
    case "company-size":
      sorted.sort((a, b) => (b.lead.employeeCount ?? -1) - (a.lead.employeeCount ?? -1));
      break;
    case "company-name":
      sorted.sort((a, b) =>
        norm(a.lead.companyName ?? a.lead.personName ?? "").localeCompare(
          norm(b.lead.companyName ?? b.lead.personName ?? "")
        )
      );
      break;
    case "best-match":
    default:
      sorted.sort((a, b) => b.match.score - a.match.score);
      break;
  }
  return sorted;
}

/** Client-safe result shape returned by runLeadSearch. */
export interface LeadSearchResult {
  leads: ScoredLead[];
  nextCursor: string | null;
  total: number | null;
  provider: string | null;
  usedIcpDefaults: boolean;
}

/**
 * Executes a full discovery search against the active provider.
 * Throws DiscoveryError with a structured code — callers map codes to
 * user-facing messages so provider internals never leak.
 */
export async function runLeadSearch(input: {
  organizationId: string;
  userId: string;
  request: LeadSearchRequest;
  icpCriteria: IcpCriteria | null;
}): Promise<LeadSearchResult> {
  const { organizationId, userId, request, icpCriteria } = input;

  const validation = validateLeadSearchRequest(request);
  if (!validation.valid) {
    throw new DiscoveryError("INVALID_REQUEST", Object.values(validation.errors)[0]);
  }

  const provider = getActiveLeadProvider();
  if (!provider) {
    throw new DiscoveryError("PROVIDER_NOT_CONFIGURED");
  }

  const effective = applyIcpDefaults(request, icpCriteria);
  const providerId = provider.getConfig().id;
  const startedAt = Date.now();

  // ---- Bounded provider resilience (Phase 4) ---------------------------------
  // Transient failures (timeout / unavailable / upstream error) are retried at
  // most ONCE with exponential backoff. Rate limits and auth problems are never
  // retried automatically — the UI offers an explicit, user-controlled retry.
  const RETRYABLE = new Set(["TIMEOUT", "PROVIDER_UNAVAILABLE", "UPSTREAM_ERROR"]);
  const MAX_ATTEMPTS = 2;
  async function searchOnce(): Promise<LeadSearchPage> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        return await provider!.searchLeads({
          ...effective,
          limit: effective.limit ?? DEFAULT_PAGE_SIZE,
        });
      } catch (error) {
        lastError = error;
        const code =
          error instanceof DiscoveryError ? error.code : "PROVIDER_UNAVAILABLE";
        if (!RETRYABLE.has(code) || attempt === MAX_ATTEMPTS - 1) throw error;
        // Exponential backoff: 500ms, then 2× per retry — bounded, no loops.
        await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt)));
      }
    }
    throw lastError;
  }

  try {
    const page = await searchOnce();

    const scored: ScoredLead[] = dedupeLeads(page.leads).map((lead) => ({
      lead,
      dedupeKey:
        lead.providerLeadId ??
        `${normalizeIdentity(lead.personName)}|${normalizeIdentity(lead.companyName)}|${normalizeIdentity(lead.companyDomain)}`,
      match: scoreLeadAgainstIcp(lead, icpCriteria),
    }));

    // Credits preparation: measure every operation. No charging in this phase.
    void recordProviderUsage({
      organizationId,
      userId,
      operation: "lead_search",
      provider: providerId,
      providerRequestId: page.providerRequestId,
      estimatedCost: 0,
      actualCost: null,
      status: "completed",
    });

    // ---- Observability --------------------------------------------------------
    // Internal debugging metadata only. No secrets, API keys, or raw provider
    // payloads are ever logged.
    console.info(
      `[discovery] lead_search completed ` +
        `{ org: ${organizationId}, user: ${userId}, provider: ${providerId}, ` +
        `requestId: ${page.providerRequestId ?? "n/a"}, results: ${scored.length}, ` +
        `total: ${page.total ?? "unknown"}, durationMs: ${Date.now() - startedAt} }`
    );

    return {
      leads: sortScoredLeads(scored, effective.sortBy ?? "best-match"),
      nextCursor: page.nextCursor,
      total: page.total,
      provider: providerId,
      usedIcpDefaults: effective.usedIcpDefaults,
    };
  } catch (error) {
    void recordProviderUsage({
      organizationId,
      userId,
      operation: "lead_search",
      provider: providerId,
      providerRequestId: null,
      estimatedCost: 0,
      actualCost: null,
      status: "failed",
    });

    const category =
      error instanceof DiscoveryError ? error.code : "UNKNOWN";
    console.error(
      `[discovery] lead_search failed ` +
        `{ org: ${organizationId}, user: ${userId}, provider: ${providerId}, ` +
        `category: ${category}, durationMs: ${Date.now() - startedAt} }`
    );
    throw error;
  }
}

