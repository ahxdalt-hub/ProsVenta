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
  Prospect,
  ProspectSource,
  ProspectStatus,
} from "@/types/database";
import type { ScoreCategory } from "@/features/intelligence/scoring/types";

// ============================================================================
// Prospect With Embedded ICP Score
// ============================================================================
// A Prospect row as returned by queryProspects, with the ICP score embedded
// via the prospect_scores relationship (single query — no N+1).
// `prospect_scores` is null/absent when the prospect has not been scored yet.
// ============================================================================
// Recommendation Hint (compact, for table rows)
// ============================================================================
// Minimal active-recommendation information embedded by queryProspects via
// ONE batch query per page — never a per-row lookup.
export interface ProspectRecommendationHint {
  recommendation_type: string;
  priority: "high" | "medium" | "low";
}

export type ProspectWithScore = Prospect & {
  prospect_scores?: { score: number; category: ScoreCategory } | null;
  /** Active (non-dismissed) recommendations for this prospect. Empty when none exist. */
  active_recommendations?: ProspectRecommendationHint[] | null;
};

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