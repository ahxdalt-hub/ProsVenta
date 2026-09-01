// ============================================================================
// Prosventa Signals — Greenhouse Job Board Adapter
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================
// REAL data source: the PUBLIC, documented Greenhouse job board API
//   GET https://boards-api.greenhouse.io/v1/board/{slug}/jobs
// No API key required; one request per company per detection run.
//
// Board slugs are NOT guessed. A slug is used only when it has been explicitly
// configured for the domain via SIGNALS_GREENHOUSE_BOARDS ("domain=slug,...")
// or provided through existing identifiers. Without a slug the adapter
// honestly reports nothing detectable.
//
// Rate limiting / retries / error classification are owned by http.ts.
// ============================================================================

import { fetchProviderJson } from "../http";
import type { AtsJobPosting } from "../detectors/hiring";
import type { ExternalSignalDetectionRequest } from "../../external/types";

export const GREENHOUSE_PROVIDER_ID = "greenhouse-board";

interface GreenhouseJob {
  id?: number | string;
  title?: string;
  updated_at?: string;
  absolute_url?: string;
  location?: { name?: string };
}

interface GreenhouseBoardResponse {
  jobs?: GreenhouseJob[];
}

/**
 * Resolves the configured Greenhouse board slug for a domain.
 * Returns null when no explicit mapping exists — never guesses.
 */
export function resolveGreenhouseSlug(
  request: ExternalSignalDetectionRequest
): string | null {
  const fromIdentifiers =
    request.existingIdentifiers?.providerCompanyIds?.[GREENHOUSE_PROVIDER_ID];
  if (fromIdentifiers?.trim()) return fromIdentifiers.trim();

  const map = process.env.SIGNALS_GREENHOUSE_BOARDS ?? "";
  const domain = request.domain?.toLowerCase();
  if (!domain) return null;

  for (const pair of map.split(",")) {
    const [mappedDomain, slug] = pair.split("=").map((s) => s.trim().toLowerCase());
    if (mappedDomain === domain && slug) return slug;
  }
  return null;
}

/** Fetches and normalizes current board postings. Null = provider failed. */
export async function fetchGreenhousePostings(
  slug: string,
  options: { maxAttempts?: number; fetchImpl?: typeof fetch } = {}
): Promise<{ postings: AtsJobPosting[] | null; attempts: number; errorCode: string | null }> {
  const url = `https://boards-api.greenhouse.io/v1/board/${encodeURIComponent(slug)}/jobs`;
  const response = await fetchProviderJson<GreenhouseBoardResponse>(url, {
    providerId: GREENHOUSE_PROVIDER_ID,
    maxAttempts: options.maxAttempts,
    fetchImpl: options.fetchImpl,
  });

  if (response.error || !response.data) {
    return {
      postings: null,
      attempts: response.attempts,
      errorCode: response.error?.code ?? "UNKNOWN_PROVIDER_ERROR",
    };
  }

  const postings: AtsJobPosting[] = (response.data.jobs ?? [])
    .filter((job) => typeof job.title === "string" && job.title.trim())
    .map((job) => ({
      id: String(job.id ?? job.title ?? ""),
      title: (job.title as string).trim(),
      location: job.location?.name ?? null,
      url: job.absolute_url ?? null,
      updatedAt: job.updated_at ?? null,
    }));

  return { postings, attempts: response.attempts, errorCode: null };
}

export function greenhouseBoardUrl(slug: string): string {
  return `https://boards.greenhouse.io/${encodeURIComponent(slug)}`;
}
