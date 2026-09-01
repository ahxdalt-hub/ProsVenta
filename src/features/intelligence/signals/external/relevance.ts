// ============================================================================
// Prosventa External Business Signals — Relevance Methodology
// Stage 6 — Phase 5: External Business Signal Engine
// ============================================================================
// Signal EXISTENCE is not signal IMPORTANCE. A company can have many hiring
// events without being an important prospect.
//
// This module implements the documented, explainable importance methodology:
//
//   relevance score = baseWeight(signalType)
//                   × recencyMultiplier(freshness)
//                   × confidenceMultiplier(evidence quality)
//
// Weights reflect how directly each observed event category relates to
// potential sales relevance. They are PRODUCT ASSUMPTIONS stated openly here,
// never presented as provider facts. Scores are banded into importance levels
// and always returned WITH their factors so the UI can explain WHY a signal
// was rated as it was. No arbitrary numbers like "funding = 97".
//
// Signals are never auto-rated "critical" — criticality requires human or
// ICP context this phase does not have.
// ============================================================================

import type { SignalType } from "../types";
import { getExternalSignalFreshness, type SignalFreshnessState } from "./freshness";

type SignalConfidence = "high" | "medium" | "low";
type SignalImportance = "critical" | "high" | "medium" | "low";

/** How directly the event category relates to potential sales relevance. */
const BASE_TYPE_WEIGHTS: Partial<Record<SignalType, number>> = {
  funding_event: 0.9,
  leadership_change: 0.8,
  company_expansion: 0.7,
  new_location: 0.7,
  hiring_activity: 0.7,
  company_growth: 0.7,
  product_announcement: 0.6,
};

const DEFAULT_TYPE_WEIGHT = 0.5;

const RECENCY_MULTIPLIERS: Record<SignalFreshnessState, number> = {
  recent: 1.0,
  aging: 0.6,
  historical: 0.3,
};

const CONFIDENCE_MULTIPLIERS: Record<SignalConfidence, number> = {
  high: 1.0,
  medium: 0.75,
  low: 0.5,
};

export interface ExternalRelevanceInput {
  signalType: SignalType;
  /** Event date ISO (published date preferred over retrieval) */
  publishedAt: string;
  confidence: SignalConfidence;
}

export interface ExternalRelevanceResult {
  importance: SignalImportance;
  /** 0–1 explainable score (never presented as a percentage certainty) */
  score: number;
  /** The exact factors used, for transparent UI explanations */
  factors: {
    typeWeight: number;
    recencyMultiplier: number;
    confidenceMultiplier: number;
  };
}

/** Importance bands (documented): ≥0.68 high · ≥0.38 medium · else low. */
const HIGH_BAND = 0.68;
const MEDIUM_BAND = 0.38;

export function computeExternalImportance(
  input: ExternalRelevanceInput
): ExternalRelevanceResult {
  const typeWeight =
    BASE_TYPE_WEIGHTS[input.signalType] ?? DEFAULT_TYPE_WEIGHT;

  // Recency uses the same configurable freshness thresholds as the UI.
  const freshness = getExternalSignalFreshness(input.publishedAt);
  const recencyMultiplier = RECENCY_MULTIPLIERS[freshness];
  const confidenceMultiplier = CONFIDENCE_MULTIPLIERS[input.confidence];

  const score = round3(typeWeight * recencyMultiplier * confidenceMultiplier);

  const importance: SignalImportance =
    score >= HIGH_BAND ? "high" : score >= MEDIUM_BAND ? "medium" : "low";

  return {
    importance,
    score,
    factors: { typeWeight, recencyMultiplier, confidenceMultiplier },
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
