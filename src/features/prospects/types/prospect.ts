// ============================================================================
// Prosventa Prospect Processing Types
// Stage 2 — Phase 8: Prospect Data Processing & Enrichment Foundation
// ============================================================================
// Centralized, reusable types for the prospect data pipeline.
// These types are the contract between the UI, processing services,
// and future data providers (imports, enrichment, APIs).
// ============================================================================

import type {
  EnrichmentStatus,
  ProspectSource,
  ProspectStatus,
} from "@/types/database";

// ============================================================================
// Prospect Input
// ============================================================================
// The raw, unprocessed prospect data received from any source
// (manual entry, CSV import, API, or future discovery providers).
export interface ProspectInput {
  name: string;
  companyName: string;
  website: string | null;
  domain: string | null;
  industry: string | null;
  description: string | null;
  country: string | null;
  city: string | null;
  employeeCount: number | null;
  source: ProspectSource;
}

// ============================================================================
// Processed Prospect
// ============================================================================
// The normalized, validated prospect data ready for database insertion.
export interface ProcessedProspect {
  organization_id: string;
  name: string;
  company_name: string;
  website: string | null;
  domain: string | null;
  industry: string | null;
  description: string | null;
  country: string | null;
  city: string | null;
  location: string | null;
  employee_count: number | null;
  source: ProspectSource;
  status: ProspectStatus;
  enrichment_status: EnrichmentStatus;
}

// ============================================================================
// Processing Result
// ============================================================================
// The result of processing a batch of prospects.
export interface ProspectProcessingResult {
  total: number;
  processed: number;
  skipped: number;
  failed: string[];
}

// ============================================================================
// Validation Result
// ============================================================================
export interface ProspectValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Search Request (processing context)
// ============================================================================
// Parameters that define a prospect discovery/filter request.
export interface SearchRequest {
  industry?: string;
  location?: string;
  country?: string;
  city?: string;
  keywords?: string;
  status?: ProspectStatus;
}