// ============================================================================
// Prosventa Company Enrichment — Server Actions
// Stage 5 — Phase 2: Company Enrichment
// ============================================================================
// Server-side boundary for the UI. Never exposes provider secrets.
// ============================================================================

"use server";

import {
  enrichCompanyForProspect,
  getCompanyEnrichmentForProspect,
} from "./service";
import type { CompanyEnrichmentOperationResult } from "./types";
import type { CompanyEnrichmentRecordLike } from "./service";

export async function enrichCompany(
  prospectId: string,
  domain: string,
  options?: { refresh?: boolean }
): Promise<CompanyEnrichmentOperationResult> {
  return enrichCompanyForProspect(prospectId, domain, options);
}

export async function getStoredCompanyEnrichment(
  prospectId: string
): Promise<CompanyEnrichmentRecordLike | null> {
  return getCompanyEnrichmentForProspect(prospectId);
}