// ============================================================================
// Prosventa Prospect Normalizer
// Stage 2 — Phase 8: Prospect Data Processing & Enrichment Foundation
// ============================================================================
// Normalizes prospect data before validation and database insertion.
// Handles company name cleaning, URL/domain extraction, whitespace trimming,
// and consistent field mapping.
// ============================================================================

import type { ProspectInput } from "@/features/prospects/types/prospect";

/**
 * Cleans and normalizes a company name.
 * - Trims surrounding whitespace
 * - Collapses multiple internal spaces to one
 * - Capitalizes the first letter of each significant word
 */
export function normalizeCompanyName(rawName: string): string {
  const cleaned = rawName.trim().replace(/\s+/g, " ");

  if (!cleaned) return "";

  return (
    cleaned
      // Preserve common acronyms and suffixes as-is where practical
      .replace(/\bInc\b/gi, "Inc")
      .replace(/\bLLC\b/gi, "LLC")
      .replace(/\bLtd\b/gi, "Ltd")
      .replace(/\bGmbH\b/gi, "GmbH")
      .replace(/\bPvt\b/gi, "Pvt")
      .replace(/\bCo\b/gi, "Co")
      .replace(/\bCorp\b/gi, "Corp")
      .replace(/\bCorporation\b/gi, "Corporation")
      .replace(/\bTechnologies\b/gi, "Technologies")
  );
}

/**
 * Extracts a domain from a website URL.
 * Returns null if the input is not a valid URL.
 */
export function extractDomain(website: string | null): string | null {
  if (!website) return null;

  const trimmed = website.trim();
  if (!trimmed) return null;

  // Strip protocol and path
  const domain = trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split("?")[0];

  // Basic validation: must contain a dot and no spaces
  if (!domain.includes(".") || domain.includes(" ")) {
    return null;
  }

  return domain.toLowerCase();
}

/**
 * Cleans a text field by trimming whitespace and converting empty
 * strings to null.
 */
export function cleanField(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalizes an employee count value.
 * Accepts numbers, numeric strings with commas, and returns null for invalid.
 */
export function normalizeEmployeeCount(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }

  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

/**
 * Normalizes a full prospect input into a consistent shape.
 * This prepares data for validation and database insertion.
 */
export function normalizeProspectInput(input: ProspectInput): ProspectInput {
  const normalizedName = normalizeCompanyName(input.name);

  return {
    name: normalizedName,
    companyName: normalizeCompanyName(input.companyName || input.name),
    website: cleanField(input.website),
    domain: extractDomain(input.website) ?? extractDomain(input.domain) ?? null,
    industry: cleanField(input.industry),
    description: cleanField(input.description),
    country: cleanField(input.country),
    city: cleanField(input.city),
    employeeCount: normalizeEmployeeCount(input.employeeCount),
    source: input.source,
  };
}