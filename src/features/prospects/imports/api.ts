// ============================================================================
// Prosventa API Import Foundation
// Stage 2 — Phase 8: Prospect Data Processing & Enrichment Foundation
// ============================================================================
// API import service foundation. Defines how prospect data will be received
// from external APIs in a future phase. No actual API calls are made yet.
// ============================================================================

import type { ProspectInput } from "@/features/prospects/types/prospect";
import type { DiscoveryResult } from "@/features/prospects/types/discovery";

/**
 * Maps a normalized DiscoveryResult (Phase 7 shape) into a ProspectInput
 * ready for the processing pipeline.
 *
 * This bridges the Phase 7 discovery provider results into the Phase 8
 * processing/enrichment pipeline.
 */
export function discoveryResultToProspectInput(
  result: DiscoveryResult
): ProspectInput {
  return {
    name: result.companyName,
    companyName: result.companyName,
    website: result.website,
    domain: result.website
      ? result.website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0]
      : null,
    industry: result.industry,
    description: null,
    country: null,
    city: result.location ?? null,
    employeeCount: null,
    source: "api",
  };
}

/**
 * Maps a batch of DiscoveryResults.
 */
export function discoveryResultsToProspectInputs(
  results: DiscoveryResult[]
): ProspectInput[] {
  return results.map(discoveryResultToProspectInput);
}

/**
 * Validates that a raw API response contains an array of prospect records.
 * Future API import endpoints will use this before processing.
 */
export function isProspectPayload(payload: unknown): payload is unknown[] {
  return Array.isArray(payload);
}