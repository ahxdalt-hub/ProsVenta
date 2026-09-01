// ============================================================================
// Prosventa Intelligence — Reasoning Types
// Feature 4 — Phase 1: Intelligence Foundation & Reasoning Architecture
// ============================================================================
// The normalized contract for evidence-grounded Intelligence. Intelligence is
// NOT enrichment, NOT a signal, NOT an ICP score and NOT an invented prediction.
//
//   Facts + ICP + Verified Signals + Historical context → Reasoning Input
//                                                       → Intelligence Engine
//                                                       → Evidence-backed
//                                                         interpretation
//
// Core principles encoded here:
//   * Every conclusion traces to evidence references (no unsupported claims).
//   * Unknown data is distinct from mismatched data.
//   * Positive AND negative factors are both supported.
//   * Scores are structured 0–100 components, never one mysterious number.
//   * Confidence structure exists; values are only set by real logic later.
// ============================================================================

import type { SignalFreshnessState } from "../signals/external/freshness";

// ============================================================================
// Lifecycle (centralized — do not introduce more states)
// ============================================================================

export type IntelligenceStatus =
  | "pending"
  | "processing"
  | "ready"
  | "stale"
  | "failed";

export const INTELLIGENCE_STATUSES: IntelligenceStatus[] = [
  "pending",
  "processing",
  "ready",
  "stale",
  "failed",
];

export const INTELLIGENCE_STATUS_LABELS: Record<IntelligenceStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  ready: "Ready",
  stale: "Stale",
  failed: "Failed",
};

/** Statuses in which a subject currently has an in-flight generation. */
export const ACTIVE_INTELLIGENCE_STATUSES: IntelligenceStatus[] = [
  "pending",
  "processing",
];

// ============================================================================
// Scope
// ============================================================================

export type IntelligenceScope = "prospect" | "company";

export const INTELLIGENCE_SCOPES: IntelligenceScope[] = ["prospect", "company"];

// ============================================================================
// Dimensions & scores
// ============================================================================

/**
 * Structured intelligence dimensions. Phase 1 defines the architecture only;
 * the Phase 2 engine computes real values. All scores use ONE normalized
 * 0–100 scale. A dimension with insufficient evidence has score=null.
 */
export type IntelligenceDimension =
  | "icp_fit"
  | "business_relevance"
  | "timing"
  | "evidence_strength"
  | "overall_priority";

export const INTELLIGENCE_DIMENSIONS: IntelligenceDimension[] = [
  "icp_fit",
  "business_relevance",
  "timing",
  "evidence_strength",
  "overall_priority",
];

export const INTELLIGENCE_DIMENSION_LABELS: Record<IntelligenceDimension, string> = {
  icp_fit: "ICP Fit",
  business_relevance: "Business Relevance",
  timing: "Timing",
  evidence_strength: "Evidence Strength",
  overall_priority: "Overall Priority",
};

/** Whether a fact matched, mismatched, or was simply unknown. */
export type IntelligenceFactorStatus = "match" | "mismatch" | "unknown";

export interface IntelligenceFactor {
  /** Stable machine id, e.g. "icp.industry.match" / "icp.industry.mismatch". */
  id: string;
  label: string;
  detail?: string | null;
  polarity: "positive" | "negative";
  status: IntelligenceFactorStatus;
  /** Evidence ref ids supporting this factor. Never invented. */
  evidenceRefIds?: string[];
}

/**
 * One scored dimension. score is null when there is not enough evidence —
 * unknown is NEVER coerced into a low number or a fake match.
 */
export interface DimensionAssessment {
  dimension: IntelligenceDimension;
  /** 0–100, or null when unknown / not evaluable (e.g. no ICP configured). */
  score: number | null;
  status: IntelligenceFactorStatus | "not_applicable";
  summary: string | null;
  positiveFactors: IntelligenceFactor[];
  negativeFactors: IntelligenceFactor[];
  /** Fields that could not be evaluated because data was missing. */
  unknownFields: string[];
}

/** Normalized structured score block stored on the insight row. */
export interface IntelligenceScoreBlock {
  dimensions: Partial<Record<IntelligenceDimension, DimensionAssessment>>;
}

// ============================================================================
// Confidence structure (Phase 1 = shape only; no manufactured values)
// ============================================================================

export interface ConfidenceComponent {
  /** null until real logic (Phase 2) computes it — never invented. */
  value: number | null;
  note?: string | null;
}

export interface ConfidenceBreakdown {
  /** 0–100 overall confidence, or null when not yet computable. */
  overall: number | null;
  level: "high" | "medium" | "low" | "unknown";
  components: {
    evidence_quality: ConfidenceComponent;
    evidence_quantity: ConfidenceComponent;
    source_reliability: ConfidenceComponent;
    freshness: ConfidenceComponent;
    consistency: ConfidenceComponent;
  };
}

export function createUnknownConfidence(): ConfidenceBreakdown {
  return {
    overall: null,
    level: "unknown",
    components: {
      evidence_quality: { value: null },
      evidence_quantity: { value: null },
      source_reliability: { value: null },
      freshness: { value: null },
      consistency: { value: null },
    },
  };
}

// ============================================================================
// Evidence references (the graph edges)
// ============================================================================

export type EvidenceRefType =
  | "icp"
  | "prospect"
  | "company"
  | "enrichment"
  | "signal"
  | "score"
  | "activity";

export const EVIDENCE_REF_TYPES: EvidenceRefType[] = [
  "icp",
  "prospect",
  "company",
  "enrichment",
  "signal",
  "score",
  "activity",
];

/**
 * A reference to an EXISTING record. No payload copies — just identity,
 * provenance, observation time and freshness.
 */
export interface EvidenceRefInput {
  refType: EvidenceRefType;
  tableName: string;
  recordId: string;
  source?: string | null;
  occurredAt?: string | null;
  capturedAt?: string | null;
  freshness?: SignalFreshnessState | null;
  note?: string | null;
}

