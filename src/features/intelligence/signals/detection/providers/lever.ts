// ============================================================================
// Prosventa Signals — Lever Job Board Adapter
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================
// REAL data source: the PUBLIC, documented Lever postings API
//   GET https://api.lever.co/v0/postings/{slug}?mode=json
// No API key required; one request per company per detection run.
//
// Board slugs are NOT guessed (same policy as the Greenhouse adapter):
// SIGNALS_LEVER_BOARDS ("domain=slug,...") or existing identifiers only.
// ============================================================================

import { fetchProviderJson } from "../http";
import type { AtsJobPosting } from "../detectors/hiring";
import type { ExternalSignalDetectionRequest } from "../../external/types";

export const LEVER_PROVIDER_ID = "lever-board";

interface LeverPosting {
  id?: string;
  text?: string;
  createdAt?: number;
  hostedUrl?: string;
  categories?: { commitment?: string; category?: string; location?: string };
}

/**
 * Resolves the configured Lever board slug for a domain.
 * Returns null when no explicit mapping exists — never guesses.
 */
export function resolveLeverSlug(request: ExternalSignalDetectionRequest): string | null {
  const fromIdentifiers =
    request.existingIdentifiers?.providerCompanyIds?.[LEVER_PROVIDER_ID];
  if (fromIdentifiers?.trim()) return fromIdentifiers.trim();

  const map = process.env.SIGNALS_LEVER_BOARDS ?? "";
  const domain = request.domain?.toLowerCase();
  if (!domain) return null;

  for (const pair of map.split(",")) {
    const [mappedDomain, slug] = pair.split("=").map((s) => s.trim().toLowerCase());
    if (mappedDomain === domain && slug) return slug;
  }
  return null;
}

/** Fetches and normalizes current board postings. Null = provider failed. */
export async function fetchLeverPostings(
  slug: string,
  options: { maxAttempts?: number; fetchImpl?: typeof fetch } = {}
): Promise<{ postings: AtsJobPosting[] | null; attempts: number; errorCode: string | null }> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
  const response = await fetchProviderJson<LeverPosting[]>(url, {
    providerId: LEVER_PROVIDER_ID,
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

  const postings: AtsJobPosting[] = response.data
    .filter((p) => typeof p.text === "string" && p.text.trim())
    .map((p) => ({
      id: String(p.id ?? p.text ?? ""),
      title: (p.text as string).trim(),
      location: p.categories?.location ?? null,
      url: p.hostedUrl ?? null,
      updatedAt: typeof p.createdAt === "number" ? new Date(p.createdAt).toISOString() : null,
    }));

  return { postings, attempts: response.attempts, errorCode: null };
}

export function leverBoardUrl(slug: string): string {
  return `https://jobs.lever.co/${encodeURIComponent(slug)}`;
}
