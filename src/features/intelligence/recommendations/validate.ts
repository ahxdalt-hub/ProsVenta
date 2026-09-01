// ============================================================================
// Prosventa Intelligence Recommendations — Validation & Deduplication
// Stage 4 — Phase 8: Intelligence Recommendations
// ============================================================================
// Validates recommendation inputs and builds stable deduplication keys.
// Running intelligence research again must not create identical recommendations.
// ============================================================================

import {
  RECOMMENDATION_PRIORITIES,
  RECOMMENDATION_SOURCE_TYPES,
  RECOMMENDATION_TYPES,
  type RecommendationInput,
  type RecommendationType,
} from "./types";

// ============================================================================
// Validation
// ============================================================================

export interface RecommendationValidationError {
  field: string;
  message: string;
}

/**
 * Validates a single recommendation input. Returns an array of validation errors.
 * An empty array means the recommendation is valid.
 */
export function validateRecommendationInput(input: RecommendationInput): RecommendationValidationError[] {
  const errors: RecommendationValidationError[] = [];

  if (!RECOMMENDATION_TYPES.includes(input.recommendation_type)) {
    errors.push({ field: "recommendation_type", message: "Unknown recommendation type." });
  }

  if (!input.title || input.title.trim().length === 0) {
    errors.push({ field: "title", message: "Title is required." });
  }

  if (!input.summary || input.summary.trim().length === 0) {
    errors.push({ field: "summary", message: "Summary is required." });
  }

  if (!input.reasoning || input.reasoning.trim().length === 0) {
    errors.push({ field: "reasoning", message: "Reasoning is required." });
  }

  // Evidence-grounding is mandatory: a recommendation without evidence is
  // rejected before it ever reaches the database.
  if (!input.evidence || input.evidence.length === 0) {
    errors.push({ field: "evidence", message: "At least one evidence item is required." });
  } else if (
    input.evidence.some(
      (item) => !item.type || !item.label || item.label.trim().length === 0
    )
  ) {
    errors.push({
      field: "evidence",
      message: "Every evidence item must have a type and a human-readable label.",
    });
  }

  if (!RECOMMENDATION_PRIORITIES.includes(input.priority)) {
    errors.push({
      field: "priority",
      message: "Priority must be very_high, high, medium, low, or very_low.",
    });
  }

  if (typeof input.confidence !== "number" || input.confidence < 0 || input.confidence > 100) {
    errors.push({ field: "confidence", message: "Confidence must be between 0 and 100." });
  }

  if (!input.dedupe_key || input.dedupe_key.trim().length === 0) {
    errors.push({ field: "dedupe_key", message: "Deduplication key is required." });
  }

  if (
    input.source_type !== undefined &&
    !RECOMMENDATION_SOURCE_TYPES.includes(input.source_type)
  ) {
    errors.push({
      field: "source_type",
      message: "Source must be intelligence, signal, icp, or system.",
    });
  }

  return errors;
}

/**
 * Validates a list of recommendation inputs and filters out invalid ones.
 * Returns only the valid recommendations (grounded, well-formed).
 */
export function validateAndFilterRecommendations(inputs: RecommendationInput[]): RecommendationInput[] {
  return inputs.filter((input) => validateRecommendationInput(input).length === 0);
}

// ============================================================================
// Deduplication
// ============================================================================

/**
 * Builds a stable deduplication key for a recommendation.
 *
 * The key combines:
 *  - recommendation type
 *  - source signal ID (first one when present)
 *  - source research ID (first one when present)
 *  - source score ID (when present)
 *
 * This ensures the same recommendation is not stored repeatedly across
 * intelligence research runs. The key is scoped per workspace by the
 * UNIQUE constraint on (organization_id, dedupe_key).
 */
export function buildRecommendationDedupeKey(
  type: RecommendationType,
  sourceSignalIds: string[] = [],
  sourceResearchIds: string[] = [],
  sourceScoreId: string | null = null
): string {
  const parts: string[] = [];
  parts.push(type);

  if (sourceSignalIds.length > 0) {
    // Sort to ensure stable keys regardless of array order.
    parts.push(`sig:${[...sourceSignalIds].sort().join(",")}`);
  }

  if (sourceResearchIds.length > 0) {
    parts.push(`res:${[...sourceResearchIds].sort().join(",")}`);
  }

  if (sourceScoreId) {
    parts.push(`score:${sourceScoreId}`);
  }

  return parts.join("|");
}