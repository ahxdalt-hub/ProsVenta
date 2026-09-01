// ============================================================================
// Prosventa Recommendations — Lifecycle, Freshness & Ranking
// Feature 5: Phase 1 — Foundation
// ============================================================================
// Pure, deterministic helpers (NO AI calls, NO network) for:
//
//   * freshness      → fresh | aging | stale | expired from evidence age
//   * expiration     → per-category/type TTL; signal reviews expire fast,
//                      ICP-fit priorities stay valid longer
//   * ranking        → priority + confidence + evidence strength + freshness
//                      (never creation time alone)
//   * invalidation   → supersede instead of delete (history preserved)
//
// These functions consume existing Intelligence/scoring outputs only. They
// never invent thresholds outside the engine's scoring architecture.
// ============================================================================

import type {
  RecommendationCategory,
  RecommendationEvidence,
  RecommendationInput,
  RecommendationPriority,
  RecommendationRecord,
  RecommendationStatus,
} from "./types";
import { RECOMMENDATION_PRIORITY_WEIGHTS, RECOMMENDATION_TYPE_CATEGORIES } from "./types";

// ============================================================================
// Freshness
// ============================================================================

export type RecommendationFreshness = "fresh" | "aging" | "stale" | "expired";

/** Age boundaries in days for each freshness bucket. */
const FRESH_DAYS = 7;
const AGING_DAYS = 30;
const STALE_DAYS = 90;

export function daysSince(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  const date = new Date(dateString).getTime();
  if (Number.isNaN(date)) return null;
  return Math.floor((Date.now() - date) / (24 * 60 * 60 * 1000));
}

/**
 * Derives freshness from the age of the underlying intelligence/evidence.
 * A missing timestamp means freshness is unknown → treated as stale so it
 * never masquerades as current.
 */
export function computeFreshness(
  evidenceUpdatedAt: string | null | undefined
): RecommendationFreshness {
  const days = daysSince(evidenceUpdatedAt);
  if (days === null) return "stale";
  if (days < FRESH_DAYS) return "fresh";
  if (days < AGING_DAYS) return "aging";
  if (days < STALE_DAYS) return "stale";
  return "expired";
}

export function isFreshnessAtLeast(
  actual: RecommendationFreshness,
  threshold: RecommendationFreshness
): boolean {
  const order: RecommendationFreshness[] = ["fresh", "aging", "stale", "expired"];
  return order.indexOf(actual) <= order.indexOf(threshold);
}

// ============================================================================
// Expiration
// ============================================================================
// Time-to-live per category, in days. Signal-driven recommendations decay
// quickly; ICP-fit prioritization remains useful much longer.

const CATEGORY_TTL_DAYS: Record<RecommendationCategory, number> = {
  signal: 14,
  intelligence: 30,
  research: 60,
  data_quality: 90,
  priority: 120,
};

/**
 * Computes the expiry timestamp for a recommendation.
 * An explicit `expiresAt` override always wins; otherwise the TTL comes from
 * the recommendation's category. Returns null when the recommendation should
 * not auto-expire.
 */
export function computeExpiresAt(
  type: RecommendationInput["recommendation_type"],
  options: { createdAt?: string | null; expiresAtOverride?: string | null } = {}
): string | null {
  if (options.expiresAtOverride !== undefined) {
    return options.expiresAtOverride;
  }
  const category = RECOMMENDATION_TYPE_CATEGORIES[type];
  const ttlDays = CATEGORY_TTL_DAYS[category] ?? 60;
  const baseMs = options.createdAt ? new Date(options.createdAt).getTime() : Date.now();
  if (Number.isNaN(baseMs)) return null;
  return new Date(baseMs + ttlDays * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Whether an active recommendation has passed its expiry point.
 * Deterministic: no AI involved.
 */
export function isExpired(
  record: Pick<RecommendationRecord, "expires_at"> & { status?: RecommendationStatus }
): boolean {
  if (!record.expires_at) return false;
  const expiry = new Date(record.expires_at).getTime();
  if (Number.isNaN(expiry)) return false;
  return Date.now() >= expiry;
}

// ============================================================================
// Ranking
// ============================================================================
// Ranking score components (deterministic, explainable):
//   priority weight   0–50   (from Intelligence-derived priority)
//   confidence        0–25   (evidence strength, scaled)
//   evidence count    0–15   (more corroborating items rank higher)
//   freshness bonus   0–10   (fresh evidence ranks higher)

const CONFIDENCE_WEIGHT_SCALE = 0.25;
const EVIDENCE_MAX_BONUS = 15;
const EVIDENCE_FULL_COUNT = 4;
const FRESHNESS_BONUS: Record<RecommendationFreshness, number> = {
  fresh: 10,
  aging: 6,
  stale: 2,
  expired: 0,
};

export interface RankableRecommendation {
  priority: RecommendationPriority;
  confidence: number;
  evidence?: RecommendationEvidence[] | null;
  intelligence_updated_at?: string | null;
}

export function computeRankingScore(recommendation: RankableRecommendation): number {
  const priorityScore = RECOMMENDATION_PRIORITY_WEIGHTS[recommendation.priority] ?? 0;
  const confidenceScore =
    Math.max(0, Math.min(100, recommendation.confidence)) * CONFIDENCE_WEIGHT_SCALE;
  const evidenceCount = recommendation.evidence?.length ?? 0;
  const evidenceScore =
    (Math.min(evidenceCount, EVIDENCE_FULL_COUNT) / EVIDENCE_FULL_COUNT) * EVIDENCE_MAX_BONUS;
  const freshness = computeFreshness(recommendation.intelligence_updated_at);
  return priorityScore + confidenceScore + evidenceScore + FRESHNESS_BONUS[freshness];
}

/**
 * Ranks recommendations by deterministic relevance score (highest first).
 * Ties break on created_at descending — recency is a tiebreaker, not the
 * primary ordering.
 */
export function rankRecommendations<T extends RankableRecommendation & { created_at?: string }>(
  recommendations: T[]
): T[] {
  return [...recommendations].sort((a, b) => {
    const diff = computeRankingScore(b) - computeRankingScore(a);
    if (diff !== 0) return diff;
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
}

// ============================================================================
// Invalidation support
// ============================================================================

/**
 * Builds the update payload that marks a recommendation as superseded by a
 * newer one. History is preserved — the old row is never deleted.
 */
export function buildSupersedeUpdate(supersedingId: string): {
  status: RecommendationStatus;
  superseded_by_id: string;
} {
  return { status: "superseded", superseded_by_id: supersedingId };
}

