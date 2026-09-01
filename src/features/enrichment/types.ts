// ============================================================================
// Prosventa Enrichment — Normalized Response Contract
// Feature 2: Enrichment - Phase 1 of 4
// ============================================================================
// THE provider-independent contract between enrichment providers and
// Prosventa. Every provider adapter must translate its own API shape into
// this structure before results reach any service or UI code. Missing
// information is ALWAYS null — providers are never assumed to return every
// field, and nothing is ever invented to fill gaps.
//
// Only fields actually available from real enrichment providers exist here.
// No speculative columns; new fields are added when a provider supplies them.
//
// This COMPOSES the existing architecture rather than duplicating it:
// person/company shapes align with ProspectEnrichmentResult and
// CompanyEnrichmentResult so adapters can feed both contracts from one
// normalized payload.
// ============================================================================

import type { EnrichmentOperation } from "./operations";

// ----------------------------------------------------------------------------
// Field keys — what a caller can ask to enrich
// ----------------------------------------------------------------------------

/**
 * Fields an enrichment request may target. Providers declare which of these
 * they can supply (see EnrichmentProvider.fieldsSupported); requests for
 * unsupported fields are answered with nulls + warnings, never guesses.
 */
export type EnrichableField =
  // Person
  | "person.fullName"
  | "person.jobTitle"
  | "person.seniority"
  | "person.profileUrl"
  | "person.location"
  // Contact (only where legally/contractually permitted)
  | "contact.email"
  | "contact.phone"
  // Company
  | "company.name"
  | "company.domain"
  | "company.industry"
  | "company.employeeCount"
  | "company.location"
  | "company.description"
  | "company.website";

export const ENRICHABLE_FIELDS: readonly EnrichableField[] = [
  "person.fullName",
  "person.jobTitle",
  "person.seniority",
  "person.profileUrl",
  "person.location",
  "contact.email",
  "contact.phone",
  "company.name",
  "company.domain",
  "company.industry",
  "company.employeeCount",
  "company.location",
  "company.description",
  "company.website",
];

// ----------------------------------------------------------------------------
// Normalized sections — all fields nullable, all safe-missing
// ----------------------------------------------------------------------------

export interface NormalizedPersonSection {
  fullName: string | null;
  jobTitle: string | null;
  seniority: string | null;
  profileUrl: string | null;
  location: string | null;
}

export interface NormalizedContactSection {
  /** Present ONLY when the provider legitimately returned it. */
  email: string | null;
  phone: string | null;
}

export interface NormalizedCompanySection {
  name: string | null;
  domain: string | null;
  industry: string | null;
  employeeCount: number | null;
  location: string | null;
  description: string | null;
  website: string | null;
}

export interface NormalizedTechnologySection {
  /**
   * Technologies/business context reported by the provider, when it supports
   * technographics at all. Absent for most providers — always optional.
   */
  technologies: string[];
}

export interface NormalizedEnrichmentMetadata {
  provider: string;
  /** Provider's own stable record identifier, when available. */
  providerRecordId: string | null;
  /** ISO timestamp of retrieval. */
  retrievedAt: string | null;
  /** Provider-reported confidence (0-100) or null. Never invented. */
  confidence: number | null;
  /** Human-readable notes about what could not be provided. */
  warnings: string[];
}

/** THE normalized enrichment response every provider adapter produces. */
export interface NormalizedEnrichmentResponse {
  person: NormalizedPersonSection;
  contact: NormalizedContactSection;
  company: NormalizedCompanySection;
  technology: NormalizedTechnologySection;
  metadata: NormalizedEnrichmentMetadata;
}

// ----------------------------------------------------------------------------
// Request / result contracts
// ----------------------------------------------------------------------------

/**
 * Normalized Prosventa enrichment request. SECURITY: organizationId is
 * intentionally NOT part of this contract — like discovery, it is always
 * resolved server-side from the authenticated session.
 */
export interface EnrichmentRequest {
  prospectId: string;
  operation: EnrichmentOperation;
  /** Subset of enrichable fields wanted; empty/omitted = everything available. */
  fields?: EnrichableField[];
  /** Optional caller-supplied request identifier for idempotency. */
  requestKey?: string;
}

export type EnrichmentResultStatus =
  | "completed"
  | "partial"
  | "failed"
  | "used_cached"
  | "already_in_progress";

export interface EnrichmentResult {
  status: EnrichmentResultStatus;
  message: string;
  provider: string | null;
  response: NormalizedEnrichmentResponse | null;
  /** Which requested fields were actually returned. */
  fieldsReturned: EnrichableField[];
  warnings: string[];
}
