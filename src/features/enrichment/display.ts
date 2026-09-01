// ============================================================================
// Prosventa Enrichment — Display Model (pure)
// Feature 2: Enrichment - Phase 2 of 4
// ============================================================================
// Client-safe, pure helpers that turn normalized enrichment responses into
// what the single-prospect enrichment window renders:
//
//   - mergeEnrichmentResponses(): combines the person/contact operation
//     response and the company operation response into ONE display payload.
//     Existing values always win over null — a provider gap never erases data.
//   - detectEnrichmentCategories(): which sections genuinely have content.
//   - formatFreshnessLabel(): human freshness from the REAL stored timestamp.
//
// Nothing here invents values or fabricates categories; empty stays empty.
// ============================================================================

import type {
  NormalizedEnrichmentResponse,
} from "./types";
import { collectReturnedFields } from "./normalize";

/**
 * Merges two normalized responses into one display payload.
 * Rule: a non-null value wins over null; when both are present the "primary"
 * response wins so person-operation data keeps precedence for person/contact
 * fields and company-operation data fills company fields.
 */
export function mergeEnrichmentResponses(
  primary: NormalizedEnrichmentResponse | null,
  secondary: NormalizedEnrichmentResponse | null
): NormalizedEnrichmentResponse | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary;
  if (!secondary) return primary;

  const pick = <T>(a: T | null, b: T | null): T | null => (a !== null ? a : b);

  return {
    person: {
      fullName: pick(primary.person.fullName, secondary.person.fullName),
      jobTitle: pick(primary.person.jobTitle, secondary.person.jobTitle),
      seniority: pick(primary.person.seniority, secondary.person.seniority),
      profileUrl: pick(primary.person.profileUrl, secondary.person.profileUrl),
      location: pick(primary.person.location, secondary.person.location),
    },
    contact: {
      email: pick(primary.contact.email, secondary.contact.email),
      phone: pick(primary.contact.phone, secondary.contact.phone),
    },
    company: {
      name: pick(primary.company.name, secondary.company.name),
      domain: pick(primary.company.domain, secondary.company.domain),
      industry: pick(primary.company.industry, secondary.company.industry),
      employeeCount: pick(primary.company.employeeCount, secondary.company.employeeCount),
      location: pick(primary.company.location, secondary.company.location),
      description: pick(primary.company.description, secondary.company.description),
      website: pick(primary.company.website, secondary.company.website),
    },
    technology: {
      technologies:
        primary.technology.technologies.length > 0
          ? primary.technology.technologies
          : secondary.technology.technologies,
    },
    metadata: {
      // The most specific metadata available wins; both are real retrievals.
      provider: primary.metadata.provider !== "unknown"
        ? primary.metadata.provider
        : secondary.metadata.provider,
      providerRecordId: pick(
        primary.metadata.providerRecordId,
        secondary.metadata.providerRecordId
      ),
      retrievedAt: pick(
        primary.metadata.retrievedAt,
        secondary.metadata.retrievedAt
      ),
      confidence: pick(primary.metadata.confidence, secondary.metadata.confidence),
      warnings: [...primary.metadata.warnings, ...secondary.metadata.warnings],
    },
  };
}

export interface EnrichmentCategoryState {
  person: boolean;
  company: boolean;
  contact: boolean;
  technology: boolean;
}

/** Which sections have REAL content to display. Empty sections are omitted. */
export function detectEnrichmentCategories(
  response: NormalizedEnrichmentResponse | null
): EnrichmentCategoryState {
  if (!response) {
    return { person: false, company: false, contact: false, technology: false };
  }
  return {
    person:
      response.person.fullName !== null ||
      response.person.jobTitle !== null ||
      response.person.seniority !== null ||
      response.person.profileUrl !== null ||
      response.person.location !== null,
    company:
      response.company.name !== null ||
      response.company.domain !== null ||
      response.company.industry !== null ||
      response.company.employeeCount !== null ||
      response.company.location !== null ||
      response.company.description !== null ||
      response.company.website !== null,
    contact: response.contact.email !== null || response.contact.phone !== null,
    technology: response.technology.technologies.length > 0,
  };
}

/** True when the merged response carries at least one useful field. */
export function hasUsefulEnrichmentData(
  response: NormalizedEnrichmentResponse | null
): boolean {
  if (!response) return false;
  const cats = detectEnrichmentCategories(response);
  return cats.person || cats.company || cats.contact || cats.technology;
}

/**
 * Human freshness text derived ONLY from the actual stored timestamp.
 * Returns null when there is no timestamp — nothing is ever fabricated.
 */
export function formatFreshnessLabel(enrichedAt: string | null): string | null {
  if (!enrichedAt) return null;
  const time = new Date(enrichedAt).getTime();
  if (Number.isNaN(time)) return null;

  const days = Math.floor((Date.now() - time) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 31) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

/** Number of meaningful fields present in a merged response. */
export function countEnrichedFields(response: NormalizedEnrichmentResponse): number {
  return collectReturnedFields(response).length;
}
