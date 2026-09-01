// ============================================================================
// Prosventa Recommendations — Feature 5: Phase 2
// Decision Engine Types
// ============================================================================
// The decision engine answers:
//   What deserves attention right now, WHY, and what should be considered next?
//
// Deterministic logic is authoritative. AI is used ONLY to phrase contextual
// explanations and its output is strictly validated before use.
//
// Candidate types are an internal concept. Each maps onto ONE existing
// recommendation_type from the controlled taxonomy (Phase 1) so nothing new
// competes with the established data model.
// ============================================================================

import type {
  RecommendationEvidence,
  RecommendationPriority,
  RecommendationType,
} from "../types";

// ============================================================================
// Candidate Types
// ============================================================================

export type CandidateType =
  | "PRIORITIZE_PROSPECT"
  | "RESEARCH_PROSPECT"
  | "REVIEW_SIGNAL"
  | "REFRESH_ENRICHMENT"
  | "REFRESH_INTELLIGENCE"
  | "REASSESS_PROSPECT";

/**
 * Controlled mapping from internal candidates onto the EXISTING Phase 1
 * recommendation taxonomy. No new database enum values are introduced.
 */
export const CANDIDATE_RECOMMENDATION_TYPE: Record<CandidateType, RecommendationType> = {
  PRIORITIZE_PROSPECT: "review_high_fit",
  RESEARCH_PROSPECT: "research_prospect",
  REVIEW_SIGNAL: "review_recent_signal",
  REFRESH_ENRICHMENT: "verify_company_info",
  REFRESH_INTELLIGENCE: "refresh_intelligence",
  REASSESS_PROSPECT: "reassess_prospect",
};

/** Human-facing action wording — always cautious, never sales-pressure. */
export const CANDIDATE_ACTION_LABELS: Record<CandidateType, string> = {
  PRIORITIZE_PROSPECT: "Prioritize this prospect",
  RESEARCH_PROSPECT: "Research missing company information",
  REVIEW_SIGNAL: "Review this recent signal",
  REFRESH_ENRICHMENT: "Refresh outdated enrichment",
  REFRESH_INTELLIGENCE: "Refresh Intelligence",
  REASSESS_PROSPECT: "Reassess this prospect",
};

// ============================================================================
// Decision Context — structured input assembled from EXISTING Prosventa data
// ============================================================================

export interface DecisionSignal {
  id: string;
  signal_type: string;
  title: string;
  description: string;
  detected_at: string;
  /** "high" | "medium" | "low" */
  confidence: string;
  /** "critical" | "high" | "medium" | "low" */
  importance: string;
  /** e.g. company_change | external_event | prosventa_activity */
  category: string;
}

// ============================================================================
// Priority Dimensions (from existing Intelligence architecture)
// ============================================================================

export interface PriorityDimensions {
  /** Directly from the ICP score (0–100) */
  icpFit: number;
  /** Business relevance: research/enrichment depth supporting the case (0–100) */
  businessRelevance: number;
  /** Timing: how current the driving evidence is (0–100) */
  timing: number;
  /** Evidence strength: count × quality of supporting items (0–100) */
  evidenceStrength: number;
  /** Freshness of the newest driving data (0–100) */
  freshness: number;
  /** Importance of the strongest relevant signal (0–100; 0 without signals) */
  signalImportance: number;
}

// ============================================================================
// Tiers
// ============================================================================

export type PriorityTier = RecommendationPriority; // very_high … very_low
export type ConfidenceTier = "very_high" | "high" | "medium" | "low" | "very_low";

export const CONFIDENCE_TIER_THRESHOLDS: Record<ConfidenceTier, number> = {
  very_high: 85,
  high: 70,
  medium: 50,
  low: 30,
  very_low: 0,
};

export function confidenceFromScore(score: number): ConfidenceTier {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  if (clamped >= CONFIDENCE_TIER_THRESHOLDS.very_high) return "very_high";
  if (clamped >= CONFIDENCE_TIER_THRESHOLDS.high) return "high";
  if (clamped >= CONFIDENCE_TIER_THRESHOLDS.medium) return "medium";
  if (clamped >= CONFIDENCE_TIER_THRESHOLDS.low) return "low";
  return "very_low";
}

// ============================================================================
// Evidence Selection
// ============================================================================

/** A piece of candidate evidence with its computed relevance weight (0–1). */
export interface WeightedEvidence {
  evidence: RecommendationEvidence;
  /** Relevance to THIS candidate (not global quality) */
  relevance: number;
  /** Source reliability: verified > enriched > derived > unknown (0–1) */
  sourceReliability: number;
  /** Final weight used for ranking selection (0–1) */
  weight: number;
}

export interface EvidenceConflict {
  /** Human-readable summary shown to users when conflicts remain unresolved */
  summary: string;
  evidenceA: RecommendationEvidence;
  evidenceB: RecommendationEvidence;
}

// ============================================================================
// Candidates & Decisions
// ============================================================================

export interface DetectedCandidate {
  type: CandidateType;
  /** Why this candidate was detected (deterministic rule names) */
  reasons: string[];
  /** Raw evidence pool relevant to this candidate */
  evidencePool: RecommendationEvidence[];
  /** Signal IDs directly driving this candidate */
  sourceSignalIds: string[];
  /** When true, deterministic wording may be improved with validated AI */
  benefitsFromAiExplanation: boolean;
  /** Optional explicit conflict report affecting priority/confidence */
  conflicts?: EvidenceConflict[];
}

export interface ScoredCandidate extends DetectedCandidate {
  dimensions: PriorityDimensions;
  priorityScore: number;
  priority: PriorityTier;
  confidenceScore: number;
  confidence: ConfidenceTier;
  /**
   * Documented reason when recommendation priority differs from what raw
   * Intelligence dimensions would suggest (spec §32).
   */
  adjustmentNote: string | null;
  selectedEvidence: WeightedEvidence[];
  explanation: string;
  confidenceReason: string;
  /** True when the explanation came from validated AI reasoning */
  aiGenerated: boolean;
}

export interface DecisionOutcome {
  /** Ranked scored candidates (best first) */
  candidates: ScoredCandidate[];
  /** The single primary candidate, when one qualifies */
  primary: ScoredCandidate | null;
  /**
   * Explicit no-recommendation result. This is VALID and expected for most
   * prospects — the engine never fabricates filler.
   */
  noRecommendation: { reason: string } | null;
}

// ============================================================================
// AI Reasoning Output Schema (strict)
// ============================================================================

export interface AiRecommendationExplanation {
  recommendation_type: RecommendationType;
  /** Concise explanation — one sentence, actual reasoning, no fluff */
  explanation: string;
  /** Why the assigned confidence level is appropriate */
  confidence_reason: string;
  /** Must reference ONLY evidence IDs supplied to the model */
  evidence_ids: string[];
}

export interface AiExplanationRequest {
  candidateType: CandidateType;
  recommendationType: RecommendationType;
  /** Structured, bounded evidence — NEVER unrestricted database data */
  evidence: Array<{ id: string; label: string; detail: string }>;
  companyName: string | null;
  confidence: ConfidenceTier;
  conflicts: EvidenceConflict[];
}

/**
 * Injected transport so the pure validation logic stays fully testable and
 * no AI call ever happens for deterministic paths.
 */
export type AiExplanationProvider = (
  request: AiExplanationRequest
) => Promise<string | null>;

export interface AiExplanationResult {
  ok: boolean;
  value: AiRecommendationExplanation | null;
  /** Rejection reason when invalid (malformed, unsupported claim, bad IDs…) */
  rejectedBecause?: string;
}

export interface DecisionContext {
  prospectId: string;
  organizationId: string;
  companyName: string | null;
  /** ICP score (0–100) from the existing ICP scoring system, when scored */
  icpScore: number | null;
  /** When the ICP score was computed */
  icpScoredAt: string | null;
  hasCompanyEnrichment: boolean;
  hasProspectEnrichment: boolean;
  hasCompanyResearch: boolean;
  hasProspectResearch: boolean;
  companyEnrichmentUpdatedAt: string | null;
  prospectEnrichmentUpdatedAt: string | null;
  /** When Intelligence was last refreshed for this prospect */
  intelligenceUpdatedAt: string | null;
  /** When company research was last completed for this prospect */
  companyResearchUpdatedAt: string | null;
  signals: DecisionSignal[];
}
