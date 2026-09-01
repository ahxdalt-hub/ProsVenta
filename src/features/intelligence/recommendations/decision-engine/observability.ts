// ============================================================================
// Prosventa Recommendations — Feature 5: Phase 2
// Observability (§39)
// ============================================================================
// In-process counters for engine health. No admin dashboard — metrics are
// exposed programmatically and logged via the existing intelligence logger.
// Never logs prospect data or identifiers.
// ============================================================================

import { intelligenceLogger } from "../../logger";

export type RecommendationEngineTrigger =
  | "manual"
  | "new_signal"
  | "enrichment_update"
  | "intelligence_update"
  | "icp_update"
  | "prospect_opened";

interface RecommendationEngineMetrics {
  evaluations: number;
  candidateCount: number;
  generatedRecommendations: number;
  rejectedRecommendations: number;
  suppressedDuplicates: number;
  dismissedSuppressed: number;
  aiCalls: number;
  aiFailures: number;
  validationFailures: number;
  totalGenerationTimeMs: number;
  typeDistribution: Record<string, number>;
}

const EMPTY_METRICS = (): RecommendationEngineMetrics => ({
  evaluations: 0,
  candidateCount: 0,
  generatedRecommendations: 0,
  rejectedRecommendations: 0,
  suppressedDuplicates: 0,
  dismissedSuppressed: 0,
  aiCalls: 0,
  aiFailures: 0,
  validationFailures: 0,
  totalGenerationTimeMs: 0,
  typeDistribution: {},
});

let metrics: RecommendationEngineMetrics = EMPTY_METRICS();

function bump(key: keyof Omit<RecommendationEngineMetrics, "typeDistribution" | "totalGenerationTimeMs">): void {
  metrics[key] += 1;
}

export function recordEvaluation(): void {
  metrics.evaluations += 1;
}

export function recordCandidates(count: number): void {
  metrics.candidateCount += count;
}

export function recordGenerated(type: string): void {
  bump("generatedRecommendations");
  metrics.typeDistribution[type] = (metrics.typeDistribution[type] ?? 0) + 1;
}

export function recordRejected(reason: string): void {
  if (reason.startsWith("validation")) bump("validationFailures");
  bump("rejectedRecommendations");
}

export function recordSuppressedDuplicate(): void {
  bump("suppressedDuplicates");
}

export function recordDismissalSuppressed(): void {
  bump("dismissedSuppressed");
}

export function recordAiCall(success: boolean): void {
  bump("aiCalls");
  if (!success) bump("aiFailures");
}

export function recordGenerationTime(durationMs: number): void {
  metrics.totalGenerationTimeMs += durationMs;
}

/** Point-in-time snapshot; does not reset counters. */
export function getRecommendationEngineMetrics(): RecommendationEngineMetrics {
  return { ...metrics, typeDistribution: { ...metrics.typeDistribution } };
}

/** Test helper — resets all counters. */
export function resetRecommendationEngineMetrics(): void {
  metrics = EMPTY_METRICS();
}

export function averageGenerationTimeMs(): number {
  return metrics.generatedRecommendations > 0
    ? Math.round(metrics.totalGenerationTimeMs / metrics.generatedRecommendations)
    : 0;
}

/** Structured log line via the existing intelligence logger. */
export function logEngineRun(fields: {
  trigger: RecommendationEngineTrigger;
  candidates: number;
  created: number;
  duplicates: number;
  durationMs: number;
}): void {
  intelligenceLogger.info("recommendation_decision_engine_run", {
    operation: "recommendation_decision_engine",
    ...fields,
    averageGenerationMs: averageGenerationTimeMs(),
  });
}
