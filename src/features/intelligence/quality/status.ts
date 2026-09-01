// ============================================================================
// Prosventa Data Quality Layer — Quality Status, Freshness & Verification
// Stage 6 - Phase 4: Data Normalization, Verification & Quality Engine
// ============================================================================
// Simple internal quality states that the UI can translate into concise,
// non-technical explanations. Reuses the EXISTING freshness model
// (checkFreshness from ../normalized) and existing confidence conventions —
// no second freshness system, no fabricated percentages.
// ============================================================================

import { checkFreshness } from "../normalized";
import type { IntelligenceFreshness } from "../normalized";

/** Internal data-quality state. UI maps these to friendly copy. */
export type DataQualityStatus =
  | "complete" // all key fields present, recent, no conflicts
  | "partial" // some information unavailable
  | "stale" // may need refreshing
  | "conflicted" // sources report different information
  | "unverified" // not independently verified
  | "unavailable"; // no data

/** Qualitative verification level — never a fabricated percentage. */
export type VerificationLevel =
  | "verified" // provider directly returned the value
  | "high_confidence"
  | "medium_confidence"
  | "low_confidence"
  | "unknown";

export interface QualityStatusInput {
  /** Number of key fields actually present in the normalized record */
  presentFields: number;
  /** Total number of key fields for this record kind */
  totalFields: number;
  /** Whether any source conflicts were detected */
  hasConflicts: boolean;
  /** Stored retrieval timestamp (ISO) or null */
  retrievedAt: string | null;
  /** Confidence 0-100 as reported/derived by the existing rules, or null */
  confidence: number | null;
  /** Maximum tolerated age in ms (configurable; defaults to 30 days) */
  maxAgeMs?: number;
}

export const DEFAULT_DATA_QUALITY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Computes the internal quality state from ACTUAL evidence only.
 * Precedence: unavailable > conflicted > stale > unverified > partial > complete.
 */
export function computeDataQualityStatus(
  input: QualityStatusInput
): { status: DataQualityStatus; freshness: IntelligenceFreshness } {
  const freshness = checkFreshness({
    retrievedAt: input.retrievedAt,
    maxAgeMs: input.maxAgeMs ?? DEFAULT_DATA_QUALITY_MAX_AGE_MS,
  });

  if (!input.retrievedAt || input.presentFields === 0) {
    return { status: "unavailable", freshness };
  }
  if (input.hasConflicts) return { status: "conflicted", freshness };
  if (freshness.isStale) return { status: "stale", freshness };

  const verification = computeVerificationLevel(input.confidence);
  if (verification === "unknown") return { status: "unverified", freshness };
  if (input.presentFields < input.totalFields) return { status: "partial", freshness };
  return { status: "complete", freshness };
}

/**
 * Maps an existing 0-100 confidence value to a qualitative verification
 * level using the SAME thresholds as company-enrichment/confidence.ts
 * (>=80 High, >=50 Medium, else Low). Null → unknown. No new methodology.
 */
export function computeVerificationLevel(confidence: number | null): VerificationLevel {
  if (confidence === null) return "unknown";
  if (confidence >= 80) return "high_confidence";
  if (confidence >= 50) return "medium_confidence";
  return "low_confidence";
}

/**
 * Client-facing explanation strings. Non-frightening, trust-building copy.
 * Keys mirror DataQualityStatus so the UI can translate mechanically.
 */
export const DATA_QUALITY_EXPLANATIONS: Record<DataQualityStatus, string> = {
  complete: "Company information verified from provider.",
  partial: "Some company information is unavailable.",
  stale: "This information may need refreshing.",
  conflicted: "Some sources report different information.",
  unverified: "This information has not been independently verified.",
  unavailable: "No enrichment information is available yet.",
};

/**
 * Structured explanation for an important intelligence field ("What / Value /
   Source / Retrieved / Status") — trust without database archaeology.
 */
export interface FieldProvenanceExplanation {
  what: string;
  value: string;
  source: string;
  retrievedAt: string | null;
  origin: string;
}

export function explainField(options: {
  what: string;
  value: unknown;
  source: string;
  retrievedAt?: string | null;
  derived?: boolean;
}): FieldProvenanceExplanation {
  return {
    what: options.what,
    value:
      options.value === null || options.value === undefined
        ? "Not available"
        : String(options.value),
    source: options.source,
    retrievedAt: options.retrievedAt ?? null,
    origin: options.derived ? "Prosventa-derived" : "Provider-sourced",
  };
}
