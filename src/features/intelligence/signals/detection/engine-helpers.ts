// ============================================================================
// Prosventa Signals — Detection Helpers
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================

/** Day-level date key used in identities/dedupe keys. */
export function dayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * Deterministic dedupe key for an externally-detected signal. Mirrors the
 * Phase-1 service convention so both pipelines collide on the SAME key for
 * the same event — one logical signal regardless of which pipeline saw it.
 */
export function buildDetectionDedupeKey(input: {
  signalType: string;
  companyKey: string | null;
  sourceRecordId: string | null;
  sourceUrl: string | null;
  occurredAt: string | null;
}): string {
  return [
    "ext",
    input.signalType,
    input.companyKey ?? "no-domain",
    input.sourceRecordId ?? dayKey(input.occurredAt) ?? "undated",
    input.sourceUrl ?? "no-url",
  ].join("|");
}

/**
 * Cross-provider event identity used to attach second-provider EVIDENCE to
 * an existing signal instead of creating a duplicate user-visible signal.
 * Deliberately conservative: same normalized type + same day-level date.
 */
export function buildCrossProviderIdentity(input: {
  signalType: string;
  occurredAt: string | null;
}): string {
  return `${input.signalType}@${dayKey(input.occurredAt) ?? "undated"}`;
}
