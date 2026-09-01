// ============================================================================
// Prosventa Prospect Discovery Types
// Stage 2 — Phase 7: Prospect Discovery Engine Foundation
// ============================================================================
// Core types for the prospect discovery workflow. These types define the
// contract between the UI, business logic, and future external providers.
// No external providers are connected yet — this is the architecture only.
// ============================================================================

import type { ProspectSearchStatus } from "@/types/database";

// ============================================================================
// Phase 8: Real Lead Discovery — Normalized Search Contract
// ============================================================================
// These types are the contract between the Find Matching Leads UI and the
// discovery service. The UI never sees provider-specific request formats;
// the service translates this normalized request into the active provider's
// own API shape inside the provider adapter (server-side only).
// ============================================================================

/** Sort options the returned data can reliably support. */
export type LeadSortOption = "best-match" | "company-size" | "company-name";

/**
 * Normalized Prosventa lead-discovery request.
 * Built by the UI from search controls + active-ICP defaults.
 */
export interface LeadSearchRequest {
  /**
   * SECURITY: organization context is intentionally NOT part of this contract.
   * It is always resolved server-side from the authenticated session — a
   * client-supplied organization ID can never widen the search scope.
   */
  /** Active ICP influencing defaults. Never modified by searches. */
  icpId?: string;
  query?: string;
  industries?: string[];
  locations?: string[];
  companySize?: string;
  jobTitles?: string[];
  seniority?: string[];
  limit?: number;
  /** Opaque provider pagination cursor (null = first page). */
  cursor?: string | null;
  sortBy?: LeadSortOption;
}

/** Normalized lead record all providers must return. Missing fields are null. */
export interface NormalizedLead {
  /** Stable provider identifier for this lead (dedupe preference #1). */
  providerLeadId: string | null;
  personName: string | null;
  jobTitle: string | null;
  companyName: string | null;
  companyDomain: string | null;
  location: string | null;
  industry: string | null;
  companySize: string | null;
  employeeCount: number | null;
  profileUrl: string | null;
  linkedinUrl: string | null;
  /** Only populated when the provider is legally/contractually permitted. */
  contactEmail: string | null;
  source: string;
}

/** Explainable match factor — no mysterious AI numbers. */
export interface MatchFactor {
  label: string;
  status: "match" | "partial" | "unavailable";
  detail: string | null;
}

export interface LeadMatchScore {
  /** 0–100 integer fit against the active ICP criteria. */
  score: number;
  category: "excellent" | "strong" | "moderate" | "weak" | "poor";
  factors: MatchFactor[];
}

/** A scored, deduplicated result ready for the UI. */
export interface ScoredLead {
  lead: NormalizedLead;
  /** Unique identity key used for cross-filter deduplication. */
  dedupeKey: string;
  match: LeadMatchScore;
}

// ============================================================================
// Structured discovery errors (never leak provider internals to the client)
// ============================================================================

export type DiscoveryErrorCode =
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_UNAVAILABLE"
  | "RATE_LIMITED"
  | "AUTH_FAILED"
  | "INVALID_REQUEST"
  | "TIMEOUT"
  | "UPSTREAM_ERROR";

export class DiscoveryError extends Error {
  readonly code: DiscoveryErrorCode;
  constructor(code: DiscoveryErrorCode, message?: string) {
    super(message ?? code);
    this.name = "DiscoveryError";
    this.code = code;
  }
}

// ============================================================================
// Credits preparation — every provider operation reports measurable usage.
// No credits are charged in this phase; the final engine arrives later.
//
// ARCHITECTURE NOTE (Phase 3): all future credit-consuming features MUST route
// through this single usage-record contract rather than computing their own
// credit math at the call site:
//
//     Feature (discovery / enrichment / research / AI scoring)
//        ↓
//     Usage / Credit Service (future central gatekeeper)
//        ↓
//     Provider
//        ↓
//     recordProviderUsage(...)  ← measurable actual usage
//
// The `operation` union below already names every planned billable operation
// so later phases only need to call the same recording path.
// ============================================================================

export type ProviderUsageOperation =
  | "lead_search"
  | "enrichment"
  | "research"
  | "ai_scoring";

export interface ProviderUsageRecord {
  organizationId: string;
  userId: string;
  operation: ProviderUsageOperation;

  provider: string;
  providerRequestId: string | null;
  estimatedCost: number;
  actualCost: number | null;
  status: "completed" | "failed";
}

/** One page of provider results. */
export interface LeadSearchPage {
  leads: NormalizedLead[];
  /** Opaque cursor for the next page, or null when exhausted. */
  nextCursor: string | null;
  /** Total matches when the provider reports it reliably. */
  total: number | null;
  providerRequestId: string | null;
}


// ============================================================================
// Discovery Request
// ============================================================================
// The input a user provides when creating a new prospect discovery search.
export interface DiscoveryRequest {
  industry?: string;
  location?: string;
  companySize?: string;
  keywords?: string;
}

// ============================================================================
// Discovery Criteria
// ============================================================================
// Normalized criteria sent to a provider. Providers receive a standardized
// shape so they can map to their own API contracts internally.
export interface DiscoveryCriteria {
  industry: string | null;
  location: string | null;
  companySize: string | null;
  keywords: string | null;
}

// ============================================================================
// Discovery Result
// ============================================================================
// A single prospect result returned from a discovery provider.
// This is the normalized shape all future providers must return.
export interface DiscoveryResult {
  companyName: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  source: string;
}

// ============================================================================
// Discovery Response
// ============================================================================
// The response from a discovery provider search.
export interface DiscoveryResponse {
  results: DiscoveryResult[];
  error: string | null;
}

// ============================================================================
// Discovery Search Record
// ============================================================================
// A persisted prospect_search record displayed in the UI.
export interface DiscoverySearchRecord {
  id: string;
  industry: string | null;
  location: string | null;
  companySize: string | null;
  keywords: string | null;
  status: ProspectSearchStatus;
  createdAt: string;
}

// ============================================================================
// Discovery Form Values
// ============================================================================
// Form state for the discovery search form.
export interface DiscoveryFormValues {
  industry: string;
  location: string;
  companySize: string;
  keywords: string;
}