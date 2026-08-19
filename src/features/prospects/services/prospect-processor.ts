// ============================================================================
// Prosventa Prospect Processor
// Stage 2 — Phase 8: Prospect Data Processing & Enrichment Foundation
// ============================================================================
// Orchestrates the prospect data pipeline: normalize → validate → map.
// This prepares data for database insertion with no external API calls.
// ============================================================================

import type {
  ProcessedProspect,
  ProspectInput,
  ProspectProcessingResult,
} from "@/features/prospects/types/prospect";
import { normalizeProspectInput } from "./prospect-normalizer";
import { validateProspectInput } from "./prospect-validator";

/**
 * Processes a single prospect input into a database-ready record.
 *
 * @param input - Raw prospect data from any source.
 * @param organizationId - The organization this prospect belongs to.
 * @returns A processed prospect ready for insertion, or null if invalid.
 */
export function processProspect(
  input: ProspectInput,
  organizationId: string
): ProcessedProspect | null {
  // 1. Normalize the input
  const normalized = normalizeProspectInput(input);

  // 2. Validate the normalized input
  const validation = validateProspectInput(normalized);
  if (!validation.valid) {
    return null;
  }

  // 3. Map to DB-ready shape
  return {
    organization_id: organizationId,
    name: normalized.name,
    company_name: normalized.companyName,
    website: normalized.website,
    domain: normalized.domain,
    industry: normalized.industry,
    description: normalized.description,
    country: normalized.country,
    city: normalized.city,
    location:
      [normalized.city, normalized.country].filter(Boolean).join(", ") || null,
    employee_count: normalized.employeeCount,
    source: normalized.source,
    status: "new",
    enrichment_status: "pending",
  };
}

/**
 * Processes a batch of prospect inputs.
 *
 * @param inputs - Raw prospect data from any source.
 * @param organizationId - The organization these prospects belong to.
 * @returns A processing result with processed records and failure reasons.
 */
export async function processProspectBatch(
  inputs: ProspectInput[],
  organizationId: string
): Promise<{
  processed: ProcessedProspect[];
  result: ProspectProcessingResult;
}> {
  const processed: ProcessedProspect[] = [];
  const failed: string[] = [];

  for (const input of inputs) {
    const normalized = normalizeProspectInput(input);
    const validation = validateProspectInput(normalized);

    if (!validation.valid) {
      failed.push(
        `${normalized.name || "Unknown company"}: ${validation.errors.join("; ")}`
      );
      continue;
    }

    const record = processProspect(input, organizationId);
    if (record) {
      processed.push(record);
    } else {
      failed.push(`${normalized.name || "Unknown company"}: failed to process`);
    }
  }

  const result: ProspectProcessingResult = {
    total: inputs.length,
    processed: processed.length,
    skipped: inputs.length - processed.length,
    failed,
  };

  return { processed, result };
}