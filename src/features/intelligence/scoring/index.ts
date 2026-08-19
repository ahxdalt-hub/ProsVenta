 // ============================================================================
// Prosventa Smart Lead & ICP Scoring — Feature Exports
// Stage 4 — Phase 6: Smart Lead & ICP Scoring
// ============================================================================

export * from "./types";
export * from "./icp-validation";
export { scoreProspectAgainstIcp, DEFAULT_WEIGHTS } from "./engine";
export type { ScoringWeights, ScoreEngineResult } from "./engine";