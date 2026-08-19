// Prosventa Enrichment Server Actions
// Stage 4 — Phase 2: Company Enrichment / Phase 3: Prospect Intelligence
// Stage 5 — Phase 2: Company Enrichment (enhanced service)
// Server-side boundary for the UI. Never exposes provider secrets.

"use server";

import { enrichProspectForProspect, getProspectIntelligence } from "../service";
import { enrichCompanyForProspect as enrichCompanyForProspectEnhanced } from "../company-enrichment/service";
import type { ProspectEnrichmentOperationResult, ProspectIntelligence } from "../types";
import type { CompanyEnrichmentOperationResult } from "../company-enrichment/types";

export async function enrichProspectCompany(
  prospectId: string,
  domain: string,
  options?: { refresh?: boolean }
): Promise<CompanyEnrichmentOperationResult> {
  return enrichCompanyForProspectEnhanced(prospectId, domain, options);
}

export async function enrichProspectContact(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<ProspectEnrichmentOperationResult> {
  return enrichProspectForProspect(prospectId, options);
}

export async function getProspectIntelligenceAction(
  prospectId: string
): Promise<ProspectIntelligence | null> {
  return getProspectIntelligence(prospectId);
}