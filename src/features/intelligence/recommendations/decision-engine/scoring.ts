// ============================================================================
// Prosventa Recommendations — Feature 5: Phase 2
// Scoring Engine: Priority, Confidence & Evidence Selection
// ============================================================================
// Deterministic and authoritative. AI NEVER chooses the final priority or
// confidence. Priority and confidence are computed SEPARATELY so that
//
//   High Priority + Low Confidence  → important but evidence incomplete
//   Low Priority  + High Confidence → reliable but simply not important now
//
// are both valid, explainable outcomes.
// ============================================================================

import type {
  RecommendationEvidence,
  RecommendationPriority,
} from "../types";
import type {
  CandidateType,
  ConfidenceTier,
  DetectedCandidate,
  DecisionContext,
  EvidenceConflict,
  PriorityDimensions,
  ScoredCandidate,
  WeightedEvidence,
} from "./types";
import { confidenceFromScore } from "./types";
import { daysSince } from "../lifecycle";

// ============================================================================
// Priority dimension weights (NOT a blind average — ICP fit leads)
// ============================================================================

const DIMENSION_WEIGHTS = {
  icpFit: 0.3,
  businessRelevance: 0.2,
  timing: 0.2,
  evidenceStrength: 0.15,
  freshness: 0.1,
  signalImportance: 0.05,
} as const;

/** Deterministic tier thresholds for the raw priority score. */
export const PRIORITY_TIER_THRESHOLDS: Record<RecommendationPriority, number> = {
  very_high: 80,
  high: 65,
  medium: 50,
  low: 35,
  very_low: 0,
};

export function priorityFromScore(score: number): RecommendationPriority {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= PRIORITY_TIER_THRESHOLDS.very_high) return "very_high";
  if (clamped >= PRIORITY_TIER_THRESHOLDS.high) return "high";
  if (clamped >= PRIORITY_TIER_THRESHOLDS.medium) return "medium";
  if (clamped >= PRIORITY_TIER_THRESHOLDS.low) return "low";
  return "very_low";
}

// ============================================================================
// Dimension computation
// ============================================================================

const IMPORTANCE_SCORES: Record<string, number> = {
  critical: 100,
  high: 80,
  medium: 50,
  low: 20,
};

function recencyScore(dateString: string | null | undefined): number {
  const days = daysSince(dateString);
  if (days === null) return 30; // unknown age scores conservatively
  if (days <= 7) return 100;
  if (days <= 14) return 85;
  if (days <= 30) return 70;
  if (days <= 60) return 50;
  if (days <= 90) return 35;
  return 20;
}

/**
 * Computes the six Intelligence-aligned dimensions for one candidate.
 * Uses ONLY existing Prosventa outputs (ICP score, enrichment/research
 * presence, signal importance). No new scoring engine.
 */
export function computePriorityDimensions(
  candidate: DetectedCandidate,
  context: DecisionContext
): PriorityDimensions {
  const icpFit = context.icpScore ?? 0;

  // Business relevance: depth of corroborating research/enrichment data.
  let relevance = 40;
  if (context.hasCompanyEnrichment) relevance += 10;
  if (context.hasProspectEnrichment) relevance += 10;
  if (context.hasCompanyResearch) relevance += 20;
  if (context.hasProspectResearch) relevance += 20;

  // Timing: newest driving signal or evidence timestamp.
  const candidateNewest = candidate.evidencePool.reduce<string | null>((newest, e) => {
    if (!e.retrievedAt) return newest;
    if (!newest || new Date(e.retrievedAt) > new Date(newest)) return e.retrievedAt;
    return newest;
  }, null);
  const timing = recencyScore(candidateNewest);

  // Evidence strength: count × source quality of the pool.
  const countFactor = Math.min(candidate.evidencePool.length / 4, 1);
  const sourceFactor = candidate.sourceSignalIds.length > 0 ? 0.8 : 0.5;
  const evidenceStrength = Math.round(countFactor * 100 * sourceFactor);

  // Freshness of the underlying context as a whole.
  const contextNewest = [
    context.intelligenceUpdatedAt,
    context.companyEnrichmentUpdatedAt,
    context.prospectEnrichmentUpdatedAt,
    ...context.signals.map((s) => s.detected_at),
  ].reduce<string | null>((newest, d) => {
    if (!d) return newest;
    if (!newest || new Date(d) > new Date(newest)) return d;
    return newest;
  }, null);
  const freshness = recencyScore(contextNewest);

  // Signal importance from the strongest relevant driving signal.
  const drivingSignals = context.signals.filter((s) =>
    candidate.sourceSignalIds.includes(s.id)
  );
  const signalImportance = drivingSignals.reduce((max, s) => {
    const value = IMPORTANCE_SCORES[s.importance] ?? 0;
    return Math.max(max, value);
  }, 0);

  return {
    icpFit,
    businessRelevance: relevance,
    timing,
    evidenceStrength,
    freshness,
    signalImportance,
  };
}

// ============================================================================
// Confidence — computed independently of priority
// ============================================================================

export interface ConfidenceComponents {
  evidenceCountScore: number; // 0–25
  qualityScore: number; // 0–25
  freshnessScore: number; // 0–20
  completenessScore: number; // 0–10
  consistencyScore: number; // 0–20
}

/**
 * Confidence measures how much the evidence can be trusted — never how
 * important the prospect is. Conflicting evidence explicitly lowers it.
 */
export function computeConfidence(
  candidate: DetectedCandidate,
  dimensions: PriorityDimensions,
  conflicts: EvidenceConflict[]
): { score: number; components: ConfidenceComponents } {
  const count = candidate.evidencePool.filter(
    (e) => e.type !== "data_quality"
  ).length;
  const evidenceCountScore = Math.min(count, 4) * 6.25; // max 25

  // Source reliability: signal-backed candidates weigh most.
  const qualityBase = candidate.sourceSignalIds.length > 0 ? 18 : 12;
  const qualityBonus = dimensions.businessRelevance >= 70 ? 7 : 0;
  const qualityScore = Math.min(25, qualityBase + qualityBonus);

  const freshnessScore = (dimensions.freshness / 100) * 20;
  const completenessScore = dimensions.businessRelevance >= 60 ? 10 : 4;
  const consistencyScore = conflicts.length > 0 ? 5 : 20;

  const score = Math.round(
    evidenceCountScore + qualityScore + freshnessScore + completenessScore + consistencyScore
  );
  return {
    score: Math.max(0, Math.min(100, score)),
    components: {
      evidenceCountScore: Math.round(evidenceCountScore),
      qualityScore,
      freshnessScore: Math.round(freshnessScore),
      completenessScore,
      consistencyScore,
    },
  };
}

// ============================================================================
// Evidence selection & weighting (§14–15)
// ============================================================================

/** Maximum attached evidence items — evidence must EXPLAIN the recommendation. */
export const MAX_EVIDENCE_ITEMS = 4;

const SOURCE_RELIABILITY: Record<string, number> = {
  icp_score: 0.9,
  signal: 0.85,
  research: 0.8,
  enrichment: 0.7,
  data_quality: 0.6,
};

/** Evidence types most directly relevant per candidate type. */
const TYPE_EVIDENCE_RELEVANCE: Record<CandidateType, Record<string, number>> = {
  PRIORITIZE_PROSPECT: { icp_score: 1.0, signal: 1.0, research: 0.9, enrichment: 0.8, data_quality: 0.2 },
  RESEARCH_PROSPECT: { icp_score: 1.0, research: 0.7, enrichment: 0.5, signal: 0.4, data_quality: 0.9 },
  REVIEW_SIGNAL: { signal: 1.0, icp_score: 0.7, research: 0.5, enrichment: 0.4, data_quality: 0.2 },
  REFRESH_ENRICHMENT: { data_quality: 1.0, enrichment: 0.9, icp_score: 0.5, research: 0.4, signal: 0.3 },
  REFRESH_INTELLIGENCE: { data_quality: 1.0, signal: 0.9, icp_score: 0.5, research: 0.4, enrichment: 0.3 },
  REASSESS_PROSPECT: { signal: 1.0, data_quality: 0.8, icp_score: 0.8, research: 0.6, enrichment: 0.4 },
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Selects only the strongest relevant evidence. Newer is not automatically
 * more important — relevance and source reliability weigh equally.
 */
export function selectEvidence(
  candidate: DetectedCandidate,
  dimensions: PriorityDimensions
): WeightedEvidence[] {
  const relevanceMap = TYPE_EVIDENCE_RELEVANCE[candidate.type] ?? {};
  const seen = new Set<string>();

  const weighted = candidate.evidencePool.map((evidence) => {
    const key = `${evidence.type}:${evidence.label}`;
    const isDuplicate = seen.has(key);
    seen.add(key);

    // Relevance to THIS recommendation type.
    const typeRelevance = relevanceMap[evidence.type] ?? 0.3;

    // Recency — capped contribution so an old but vital fact still matters.
    const age = daysSince(evidence.retrievedAt);
    const recency =
      age === null ? 0.5 : age <= 30 ? 1 : age <= 90 ? 0.8 : age <= 180 ? 0.6 : 0.4;

    const reliability = SOURCE_RELIABILITY[evidence.type] ?? 0.5;
    const weight = clamp01(typeRelevance * 0.55 + recency * 0.2 + reliability * 0.25);

    return { evidence, relevance: typeRelevance, sourceReliability: reliability, weight, isDuplicate };
  })
    .filter((item) => !item.isDuplicate)
    .sort((a, b) => b.weight - a.weight);

  return weighted.slice(0, MAX_EVIDENCE_ITEMS).map(({ evidence, relevance, sourceReliability, weight }) => ({
    evidence,
    relevance,
    sourceReliability,
    weight,
  }));
}

// ============================================================================
// Deterministic explanation & confidence reason (§30–31)
// ============================================================================

const ACTION_LABELS: Record<CandidateType, string> = {
  PRIORITIZE_PROSPECT: "Prioritize this prospect",
  RESEARCH_PROSPECT: "Research missing company information",
  REVIEW_SIGNAL: "Review this recent signal",
  REFRESH_ENRICHMENT: "Refresh outdated enrichment",
  REFRESH_INTELLIGENCE: "Refresh Intelligence",
  REASSESS_PROSPECT: "Reassess this prospect",
};

/**
 * Builds a concise, evidence-grounded explanation from the candidate's own
 * reasons. Cautious wording only — no sales pressure, no guarantees.
 */
export function buildDeterministicExplanation(
  candidate: DetectedCandidate,
  _selectedEvidence: WeightedEvidence[],
  conflicts: EvidenceConflict[]
): string {
  const action = ACTION_LABELS[candidate.type];
  const primaryReasons = candidate.reasons.slice(0, 2).join("; ").replace(/\.$/, "");
  const conflictNote =
    conflicts.length > 0
      ? ` Note: ${conflicts[0].summary.toLowerCase()} Consider both before deciding.`
      : "";
  return `${action}: ${primaryReasons}.${conflictNote}`;
}

export function buildConfidenceReason(
  confidence: ConfidenceTier,
  components: ConfidenceComponents,
  conflicts: EvidenceConflict[]
): string {
  const parts: string[] = [];
  if (conflicts.length > 0) parts.push("recent signals point in different directions");
  if (components.evidenceCountScore < 15) parts.push("limited supporting evidence");
  if (components.qualityScore >= 18) parts.push("signal-backed sources");
  if (components.freshnessScore >= 14) parts.push("fresh underlying data");
  if (parts.length === 0) parts.push("evidence is adequate for this assessment");
  return `${confidence} confidence — ${parts.join(", ")}.`;
}

// ============================================================================
// Full scoring pipeline for one candidate
// ============================================================================

/**
 * Scores one detected candidate end-to-end:
 * dimensions → raw priority score → confidence discount → tiers →
 * evidence selection → deterministic explanation.
 *
 * The confidence discount is DOCUMENTED in adjustmentNote so recommendation
 * priority and Intelligence priority never contradict without explanation.
 */
export function scoreCandidate(
  candidate: DetectedCandidate,
  context: DecisionContext
): ScoredCandidate {
  const dimensions = computePriorityDimensions(candidate, context);
  const conflicts = candidate.conflicts ?? [];

  // Raw weighted dimension score (deterministic, ICP-fit-led).
  const rawScore =
    dimensions.icpFit * DIMENSION_WEIGHTS.icpFit +
    dimensions.businessRelevance * DIMENSION_WEIGHTS.businessRelevance +
    dimensions.timing * DIMENSION_WEIGHTS.timing +
    dimensions.evidenceStrength * DIMENSION_WEIGHTS.evidenceStrength +
    dimensions.freshness * DIMENSION_WEIGHTS.freshness +
    dimensions.signalImportance * DIMENSION_WEIGHTS.signalImportance;

  const { score: confidenceScore, components } = computeConfidence(candidate, dimensions, conflicts);
  const confidence = confidenceFromScore(confidenceScore);

  // Priority/confidence consistency (§32): conflicting evidence or low
  // confidence discounts the raw score — never by more than one tier step,
  // and always with a documented reason.
  let priorityScore = rawScore;
  let adjustmentNote: string | null = null;
  const tierOf = (s: number) => priorityFromScore(s);
  if (conflicts.length > 0) {
    priorityScore -= 10;
    adjustmentNote = "Priority reduced because evidence is conflicting.";
  } else if (confidence === "low" || confidence === "very_low") {
    const discounted = priorityScore - 12;
    if (tierOf(discounted) !== tierOf(priorityScore)) {
      priorityScore = discounted;
      adjustmentNote =
        "Raw intelligence dimensions suggested a higher tier; reduced due to low evidence confidence.";
    }
  }

  const priority = priorityFromScore(priorityScore);
  const selectedEvidence = selectEvidence(candidate, dimensions);
  const explanation = buildDeterministicExplanation(candidate, selectedEvidence, conflicts);

  return {
    ...candidate,
    dimensions,
    priorityScore: Math.round(priorityScore),
    priority,
    confidenceScore,
    confidence,
    adjustmentNote,
    selectedEvidence,
    explanation,
    confidenceReason: buildConfidenceReason(confidence, components, conflicts),
    aiGenerated: false,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  };
}

// ============================================================================
// Ranking & outcome assembly (§19–20)
// ============================================================================

function rankWeight(c: ScoredCandidate): number {
  // Confidence contributes but never outweighs a full priority tier step.
  return PRIORITY_RANK_WEIGHTS[c.priority] + c.confidenceScore / 20;
}

const PRIORITY_RANK_WEIGHTS: Record<string, number> = {
  very_high: 50,
  high: 40,
  medium: 30,
  low: 20,
  very_low: 10,
};

/**
 * Ranks scored candidates deterministically. Only ONE primary candidate is
 * ever returned — the single most useful next consideration.
 */
export function buildDecisionOutcome(candidates: ScoredCandidate[]): {
  candidates: ScoredCandidate[];
  primary: ScoredCandidate | null;
  noRecommendation: { reason: string } | null;
} {
  if (candidates.length === 0) {
    return {
      candidates: [],
      primary: null,
      noRecommendation: { reason: "No actionable recommendation at this time." },
    };
  }

  const ranked = [...candidates].sort((a, b) => {
    const weightDiff = rankWeight(b) - rankWeight(a);
    if (weightDiff !== 0) return weightDiff;
    return b.confidenceScore - a.confidenceScore;
  });

  return { candidates: ranked, primary: ranked[0], noRecommendation: null };
}
