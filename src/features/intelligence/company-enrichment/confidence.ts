// ============================================================================
// Prosventa Company Enrichment — Confidence Calculation
// Stage 5 — Phase 2: Company Enrichment
// ============================================================================
// Transparent, deterministic confidence rules for company enrichment.
//
// Rules:
//   - If the provider reports a confidence, use it (clamped to 0-100).
//   - If the provider does NOT report confidence, calculate a deterministic
//     score based on how complete the returned result is. This is a
//     transparent completeness heuristic — NOT a fabricated "polished" value.
//   - Never invent confidence where there is no data at all.
// ============================================================================

import type { CompanyEnrichmentResult } from "../types";
import { clampConfidence } from "../normalized";

// ============================================================================
// Completeness Heuristic
// ============================================================================
// Key fields that indicate a well-rounded company profile. The more of these
// the provider returns, the higher the deterministic confidence.
// ============================================================================

const COMPLETENESS_FIELDS: Array<keyof CompanyEnrichmentResult> = [
  "companyName",
  "domain",
  "website",
  "description",
  "industry",
  "employeeCount",
  "employeeRange",
  "headquarters",
  "country",
  "city",
  "companyType",
  "foundedYear",
  "technologies",
];

function isPresent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

/**
 * Calculates the confidence for a company enrichment result.
 *
 * Prefers the provider's reported confidence. Falls back to a deterministic
 * completeness score (0-100) based on how many key fields are present.
 * Returns null only when the result is entirely empty.
 */
export function calculateConfidence(
  providerConfidence: number | null | undefined,
  result: CompanyEnrichmentResult
): number | null {
  // Prefer the provider's own confidence when reported.
  if (providerConfidence !== null && providerConfidence !== undefined) {
    return clampConfidence(providerConfidence);
  }

  // Deterministic fallback: completeness of the returned profile.
  const presentCount = COMPLETENESS_FIELDS.filter((field) =>
    isPresent(result[field])
  ).length;

  if (presentCount === 0) return null;

  return Math.round((presentCount / COMPLETENESS_FIELDS.length) * 100);
}

/**
 * Maps a 0-100 confidence score to a human-readable label.
 * Transparent thresholds — never inflated.
 */
export function confidenceLabel(confidence: number | null): string {
  if (confidence === null) return "Unknown";
  if (confidence >= 80) return "High";
  if (confidence >= 50) return "Medium";
  return "Low";
}