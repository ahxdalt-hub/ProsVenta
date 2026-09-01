// ============================================================================
// Prosventa Person Enrichment — Normalization & Merge Rules
// Stage 6 - Phase 3: People & Decision-Maker Intelligence
// ============================================================================
// Converts a provider-specific person result into Prosventa's internal
// normalized person structure.
//
// Rules:
//   - ONLY fields the provider legitimately returns are stored. Missing
//     contact information is never invented; guessed emails are never
//     generated or labelled as verified.
//   - Customer-entered data always wins. Provider data is stored in the
//     separate prospect_enrichments record and never overwrites the
//     prospects row (structural merge protection).
//   - Provider-reported confidence is preferred; otherwise a transparent,
//     deterministic completeness score is used (never fabricated polish).
// ============================================================================

import type { ProspectEnrichmentResult } from "../types";
import { clampConfidence } from "../normalized";

/** Fields that indicate a well-rounded, usable person profile. */
const COMPLETENESS_FIELDS: Array<keyof ProspectEnrichmentResult> = [
  "contactName",
  "jobTitle",
  "seniority",
  "department",
  "companyName",
  "companyDomain",
  "contactEmail",
  "linkedin",
];

function isPresent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalizes an untrusted provider payload into ProspectEnrichmentResult.
 * Unknown keys are dropped; known string fields are trimmed; nothing is
 * synthesized. The result may legitimately be mostly null (partial result).
 */
export function normalizePersonResult(raw: unknown): ProspectEnrichmentResult {
  const d =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const contactEmail = cleanString(d.contactEmail);
  // Basic sanity: never store something that is not shaped like an email.
  const validEmail = contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) ? contactEmail : null;

  return {
    contactName: cleanString(d.contactName),
    firstName: cleanString(d.firstName),
    lastName: cleanString(d.lastName),
    contactEmail: validEmail,
    contactPhone: cleanString(d.contactPhone),
    jobTitle: cleanString(d.jobTitle),
    seniority: cleanString(d.seniority),
    department: cleanString(d.department),
    companyName: cleanString(d.companyName),
    companyDomain: cleanString(d.companyDomain)?.toLowerCase() ?? null,
    linkedin: cleanString(d.linkedin),
    profileUrl: cleanString(d.profileUrl),
    location: cleanString(d.location),
    country: cleanString(d.country),
    city: cleanString(d.city),
    summary: cleanString(d.summary),
    confidence:
      typeof d.confidence === "number" && Number.isFinite(d.confidence)
        ? clampConfidence(d.confidence)
        : null,
  };
}

/**
 * Detects which key person fields the provider did not return and produces
 * human-readable warnings. Partial results are surfaced honestly — never
 * presented as complete.
 */
export function detectPartialPersonResult(
  result: ProspectEnrichmentResult
): { partial: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!result.contactName) warnings.push("Person name was not available.");
  if (!result.jobTitle) warnings.push("Job title was not available.");
  if (!result.seniority && !result.department && !result.jobTitle) {
    warnings.push("Role information (seniority/department) was not available.");
  }
  if (!result.companyName && !result.companyDomain) {
    warnings.push("Company association was not available.");
  }
  if (!result.contactEmail) {
    warnings.push("Work email was not available — no email is invented.");
  }
  return { partial: warnings.length > 0, warnings };
}

/**
 * Calculates confidence for a person enrichment result. Prefers the
 * provider's reported confidence; falls back to deterministic completeness
 * of the returned profile. Returns null only for an entirely empty result.
 */
export function calculatePersonConfidence(
  providerConfidence: number | null | undefined,
  result: ProspectEnrichmentResult
): number | null {
  if (providerConfidence !== null && providerConfidence !== undefined) {
    return clampConfidence(providerConfidence);
  }
  const presentCount = COMPLETENESS_FIELDS.filter((field) =>
    isPresent(result[field])
  ).length;
  if (presentCount === 0) return null;
  return Math.round((presentCount / COMPLETENESS_FIELDS.length) * 100);
}
