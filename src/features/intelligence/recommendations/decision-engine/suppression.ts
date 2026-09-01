// ============================================================================
// Prosventa Recommendations — Feature 5: Phase 2
// Suppression, Dismissal Tracking & Context Fingerprints (§21–25)
// ============================================================================
// Pure deterministic helpers. Existing active recommendations suppress new
// duplicates; dismissed recommendations stay suppressed until the underlying
// context MATERIALLY changes or enough time passes.
// ============================================================================

import type { CandidateType } from "./types";

/** A dismissed recommendation stops regeneration for this long (days). */
export const DISMISSAL_SUPPRESSION_DAYS = 30;

/**
 * Stable fingerprint of the underlying context that produced a candidate.
 * Two runs with the same fingerprint produce materially identical
 * recommendations → the second is suppressed.
 */
export function buildContextFingerprint(input: {
  candidateType: CandidateType;
  sourceSignalIds: string[];
  intelligenceUpdatedAt: string | null;
  icpScore: number | null;
  /** Bucketed to avoid churn from trivial enrichment timestamp changes. */
  enrichmentBucket: string | null;
}): string {
  const parts = [
    input.candidateType,
    [...input.sourceSignalIds].sort().join(",") || "nosig",
    input.intelligenceUpdatedAt ?? "nointel",
    // ICP bucketed in bands of 5 so a ±1 scoring drift doesn't resurrect recs.
    input.icpScore === null ? "noicp" : String(Math.floor(input.icpScore / 5)),
    input.enrichmentBucket ?? "noenrich",
  ];
  return parts.join("|");
}

export function buildDedupeKey(candidateType: CandidateType, fingerprint: string): string {
  return `${candidateType}:${fingerprint}`;
}

export interface DismissalState {
  status: string;
  dismissed_at?: string | null;
}

/**
 * Whether a previously dismissed recommendation still blocks regeneration.
 * A new recommendation is allowed only when:
 *   - the context fingerprint materially changed, OR
 *   - the dismissal suppression window has passed.
 */
export function isDismissalBlocking(
  existing: DismissalState,
  options: { fingerprintChanged: boolean }
): boolean {
  if (existing.status !== "dismissed") return false;
  if (options.fingerprintChanged) return false;

  const dismissedAt = existing.dismissed_at
    ? new Date(existing.dismissed_at).getTime()
    : NaN;
  if (Number.isNaN(dismissedAt)) return true; // no timestamp → block conservatively

  const elapsedDays = (Date.now() - dismissedAt) / (24 * 60 * 60 * 1000);
  return elapsedDays < DISMISSAL_SUPPRESSION_DAYS;
}

export interface ExistingRecommendationLike {
  id: string;
  recommendation_type?: string;
  dedupe_key?: string | null;
  status: string;
  expires_at?: string | null;
  superseded_by_id?: string | null;
}

/**
 * Finds an ACTIVE duplicate for the same dedupe key. Accepted/dismissed/
 * expired/superseded rows never count as blocking duplicates.
 */
export function findActiveDuplicate(
  existing: ExistingRecommendationLike[],
  dedupeKey: string
): ExistingRecommendationLike | null {
  return (
    existing.find(
      (r) =>
        r.dedupe_key === dedupeKey &&
        (r.status === "new" || r.status === "viewed")
    ) ?? null
  );
}

/**
 * Decides whether an existing recommendation of the same type should be
 * superseded by a new one: only when its supporting evidence is materially
 * different (fingerprint changed). Otherwise it stays untouched.
 */
export function shouldSupersedeExisting(
  existing: ExistingRecommendationLike,
  newFingerprint: string,
  oldFingerprint: string | null
): boolean {
  if (existing.status !== "new" && existing.status !== "viewed") return false;
  return oldFingerprint !== null && oldFingerprint !== newFingerprint;
}
