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