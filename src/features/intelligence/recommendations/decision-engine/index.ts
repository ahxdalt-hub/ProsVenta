// ============================================================================
// Prosventa Recommendations — Feature 5: Phase 2
// Decision Engine — Public API
// ============================================================================

export * from "./types";
export * from "./candidate-detection";
export * from "./scoring";
export * from "./suppression";
export * from "./ai-reasoning";
export * from "./observability";

// Server-side orchestrator (imports db layers) — exported last for clarity.
export {
  runDecisionEngine,
  buildDecisionContext,
  evaluateRecommendationsForNewSignal,
  evaluateRecommendationsForEnrichmentUpdate,
  evaluateRecommendationsForIntelligenceUpdate,
  evaluateRecommendationsForIcpUpdate,
  type DecisionEngineResult,
  type RunDecisionEngineOptions,
} from "./decision-service";
