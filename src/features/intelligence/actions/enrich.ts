// Prosventa Enrichment Server Actions
// Stage 4 — Phase 2: Company Enrichment / Phase 3: Prospect Intelligence
// Stage 5 — Phase 2: Company Enrichment (enhanced service)
// Server-side boundary for the UI. Never exposes provider secrets.

"use server";

import { getProspectIntelligence } from "../service";
import { enrichCompanyForProspect as enrichCompanyForProspectEnhanced } from "../company-enrichment/service";
import { enrichPersonForProspect } from "../person-enrichment/service";
import type { ProspectEnrichmentOperationResult, ProspectIntelligence } from "../types";
import type { CompanyEnrichmentOperationResult } from "../company-enrichment/types";

export async function enrichProspectCompany(
  prospectId: string,
  domain: string,
  options?: { refresh?: boolean }
): Promise<CompanyEnrichmentOperationResult> {
  return enrichCompanyForProspectEnhanced(prospectId, domain, options);
}

/**
 * Stage 6 - Phase 3: person enrichment is now served by the dedicated
 * person-enrichment service (identity resolution, capability gating,
 * freshness/duplicate prevention, provenance, decision-maker relevance).
 * The action signature stays compatible with the existing workspace UI.
 */
export async function enrichProspectContact(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<ProspectEnrichmentOperationResult> {
  return enrichPersonForProspect(prospectId, options);
}

export async function getProspectIntelligenceAction(
  prospectId: string
): Promise<ProspectIntelligence | null> {
  return getProspectIntelligence(prospectId);
}