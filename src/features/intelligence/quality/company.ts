// ============================================================================
// Prosventa Data Quality Layer — Company Normalization
// Stage 6 - Phase 4: Data Normalization, Verification & Quality Engine
// ============================================================================
// Converts an arbitrary provider/company payload into Prosventa's trusted
// internal representation BEFORE anything reaches the database, scoring, or
// recommendation engine. Reuses normalizeDomain from ../domain (the single
// canonical domain normalizer — no second normalization system).
// ============================================================================

import { normalizeDomain } from "../domain";
import type { CompanyEnrichmentResult } from "../types";
import {
  cleanValue,
  isValidHttpUrl,
  isValidProviderId,
  normalizeEmployeeRange,
  normalizeFoundedYear,
  normalizeCompanyName,
  parseEmployeeCount,
} from "./values";

export interface NormalizedCompany {
  /** Trusted normalized company profile — safe for persistence & scoring */
  data: CompanyEnrichmentResult;
  /** Provider company identifier when supplied and well-formed */
  providerCompanyId: string | null;
  /** Canonical domain after normalization (null when unusable) */
  canonicalDomain: string | null;
  /** Whether the raw domain had to be discarded (data-quality signal) */
  domainRejected: boolean;
  /** Human-readable validation issues detected during normalization */
  validationIssues: string[];
}

function str(d: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = cleanValue(d[k]);
    if (v !== null) return v;
  }
  return null;
}

/**
 * Normalizes an untrusted provider company payload into the internal
 * CompanyEnrichmentResult shape. Unknown keys are dropped; placeholders are
 * removed; impossible values are rejected. Nothing is invented.
 */
export function normalizeCompanyPayload(raw: unknown): NormalizedCompany {
  const d =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const validationIssues: string[] = [];

  // --- Domain -------------------------------------------------------------
  const rawDomain = str(d, "domain", "website", "companyDomain");
  const canonicalDomain = normalizeDomain(rawDomain);
  const domainRejected = rawDomain !== null && canonicalDomain === null;
  if (domainRejected) {
    validationIssues.push(`Domain "${rawDomain}" could not be normalized and was rejected.`);
  }

  // --- Website URL --------------------------------------------------------
  let website = str(d, "website", "url");
  if (website && !isValidHttpUrl(website)) {
    website = canonicalDomain ? `https://${canonicalDomain}` : null;
    if (!website) validationIssues.push("Website URL was malformed and was rejected.");
  }

  // --- Employee count / range ----------------------------------------------
  // If a range is supplied, preserve the range; never invent an exact count.
  const employeeRange =
    normalizeEmployeeRange(d.employeeRange) ?? normalizeEmployeeRange(d.employeeCount);
  const employeeCount: number | null = employeeRange
    ? parseEmployeeCount(d.employeeCount)
    : parseEmployeeCount(d.employeeCount);
  if (!employeeRange && d.employeeCount != null && typeof d.employeeCount !== "number") {
    validationIssues.push(
      `Employee count "${String(d.employeeCount)}" was not a valid number and was rejected.`
    );
  }

  // --- Founded year ---------------------------------------------------------
  const foundedYearRaw = d.foundedYear ?? d.founded;
  const foundedYear = normalizeFoundedYear(foundedYearRaw);
  if (foundedYearRaw != null && foundedYear === null) {
    validationIssues.push("Founded year was implausible and was rejected.");
  }

  // --- Revenue ---------------------------------------------------------------
  let revenue: number | null = null;
  if (typeof d.revenue === "number" && Number.isFinite(d.revenue) && d.revenue >= 0) {
    revenue = d.revenue;
  }

  // --- Technologies ------------------------------------------------------------
  const technologies = Array.isArray(d.technologies)
    ? Array.from(
        new Set(
          d.technologies
            .map((t) => cleanValue(t))
            .filter((t): t is string => t !== null)
        )
      )
    : [];
  if (d.technologies != null && !Array.isArray(d.technologies)) {
    validationIssues.push("Technologies field was not a list and was rejected.");
  }

  // --- Confidence -----------------------------------------------------------------
  const confidence =
    typeof d.confidence === "number" && Number.isFinite(d.confidence)
      ? Math.max(0, Math.min(100, Math.round(d.confidence)))
      : null;

  const providerIdRaw = str(d, "providerCompanyId", "providerId", "companyId", "id");
  const providerCompanyId =
    providerIdRaw && isValidProviderId(providerIdRaw) ? providerIdRaw : null;

  // Location sanity: only keep what the provider actually supplied.
  const city = str(d, "city");
  const country = str(d, "country");
  let headquarters = str(d, "headquarters", "location");
  if (city && !country && !headquarters) headquarters = city;

  const data: CompanyEnrichmentResult = {
    companyName: normalizeCompanyName(d.companyName ?? d.name),
    domain: canonicalDomain,
    website,
    description: str(d, "description", "summary"),
    industry: str(d, "industry", "sector"),
    employeeCount,
    employeeRange,
    headquarters,
    country,
    city,
    companyType: str(d, "companyType", "type"),
    foundedYear,
    logoUrl: str(d, "logoUrl", "logo"),
    linkedin: str(d, "linkedin", "linkedinUrl"),
    revenue,
    technologies,
    confidence,
  };

  return { data, providerCompanyId, canonicalDomain, domainRejected, validationIssues };
}

