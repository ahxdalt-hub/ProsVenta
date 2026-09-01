// ============================================================================
// Prosventa Enrichment — Idempotency Keys
// Feature 2: Enrichment - Phase 1 of 4
// ============================================================================
// Server-side duplicate protection for enrichment operations. Repeated clicks
// or retried requests within one time window produce the SAME key, so the
// unique index on intelligence_jobs.idempotency_key collapses them into ONE
// logical operation (and eventually ONE credit charge).
//
// Frontend button-disabling is UX only — this is the enforcement mechanism.
// Mirrors the proven buildOperationIdempotencyKey pattern in
// src/features/credits/operations.ts so behavior stays consistent across
// billable features. Pure module.
// ============================================================================

import type { EnrichmentOperation } from "./operations";

/** Default duplicate-request window (ms). Matches the credits pipeline. */
export const ENRICHMENT_IDEMPOTENCY_WINDOW_MS = 10_000;

/**
 * Builds the stable idempotency key for one logical enrichment instance.
 * Same prospect + operation + provider (+ scope) within the window => same key.
 */
export function buildEnrichmentIdempotencyKey(params: {
  prospectId: string;
  operation: EnrichmentOperation;
  provider: string;
  scope?: string | null;
  windowMs?: number;
  now?: number;
}): string {
  const windowMs = params.windowMs ?? ENRICHMENT_IDEMPOTENCY_WINDOW_MS;
  const bucket = Math.floor((params.now ?? Date.now()) / windowMs);
  return [
    "enrichment",
    params.operation,
    params.provider,
    params.prospectId,
    params.scope ?? "default",
    String(bucket),
  ].join(":");
}
