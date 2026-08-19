// ============================================================================
// Prosventa Company Enrichment — Partial Result Detection
// Stage 5 — Phase 2: Company Enrichment
// ============================================================================
// Detects when a provider returned incomplete company data and produces
// human-readable warnings. Partial results are preserved and displayed, never
// hidden or presented as complete.
// ============================================================================

import type { CompanyEnrichmentResult } from "../types";

export interface PartialResultInfo {
  /** Whether the provider returned incomplete data */
  partial: boolean;
  /** Human-readable warnings describing what is missing */
  warnings: string[];
}

/**
 * Inspects a company enrichment result and reports which key fields are
 * missing. A result is "partial" when any core field is unavailable.
 *
 * Only reports fields the provider was expected to supply. Never invents
 * missing values.
 */
export function detectPartialResult(
  result: CompanyEnrichmentResult
): PartialResultInfo {
  const warnings: string[] = [];

  // Identity
  if (!result.companyName) warnings.push("Company name was not available.");
  if (!result.domain) warnings.push("Company domain was not available.");

  // Profile
  if (!result.industry) warnings.push("Industry was not available.");
  if (!result.description) warnings.push("Company description was not available.");
  if (result.employeeCount === null && !result.employeeRange) {
    warnings.push("Employee count was not available.");
  }
  if (!result.headquarters && !result.country && !result.city) {
    warnings.push("Location was not available.");
  }
  if (result.foundedYear === null) {
    warnings.push("Founded year was not available.");
  }
  if (result.technologies.length === 0) {
    warnings.push("Technology stack was not available.");
  }

  return {
    partial: warnings.length > 0,
    warnings,
  };
}