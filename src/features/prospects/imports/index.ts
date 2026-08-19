// ============================================================================
// Prosventa Prospect Import Foundation
// Stage 2 — Phase 8: Prospect Data Processing & Enrichment Foundation
// ============================================================================
// Unified entry point for the prospect import pipeline.
// Future import sources (CSV upload, API payloads, external providers)
// will feed into the processing layer through these helpers.
// ============================================================================

import type { ProspectInput } from "@/features/prospects/types/prospect";
import { processProspectBatch } from "@/features/prospects/services/prospect-processor";
import { parseCsvToProspectInputs } from "./csv";
import {
  discoveryResultsToProspectInputs,
  discoveryResultToProspectInput,
} from "./api";

export { parseCsvToProspectInputs };
export { discoveryResultsToProspectInputs, discoveryResultToProspectInput };
export type { ExternalProviderAdapter } from "./provider-adapter";
export { BaseProviderAdapter } from "./provider-adapter";

/**
 * Processes a raw CSV string into database-ready prospect records.
 *
 * This is the future-ready entry point for CSV imports.
 * @param csv - Raw CSV content with header row.
 * @param organizationId - The organization these prospects belong to.
 */
export async function importProspectsFromCsv(
  csv: string,
  organizationId: string
) {
  const inputs = parseCsvToProspectInputs(csv);
  return processProspectBatch(inputs, organizationId);
}

/**
 * Processes an array of ProspectInputs into database-ready records.
 *
 * This is the future-ready entry point for API and provider imports.
 * @param inputs - Raw prospect inputs from any source.
 * @param organizationId - The organization these prospects belong to.
 */
export async function importProspectsFromInputs(
  inputs: ProspectInput[],
  organizationId: string
) {
  return processProspectBatch(inputs, organizationId);
}