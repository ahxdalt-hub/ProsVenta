// ============================================================================
// Prosventa AI Company Research — Server Actions
// Stage 4 — Phase 4: AI Company Research
// ============================================================================
// Server-side boundary for the UI. Never exposes provider secrets.
// ============================================================================

"use server";

import {
  researchCompanyForProspect,
  getCompanyResearchForProspect,
} from "./service";
import type {
  CompanyResearchOperationResult,
  CompanyResearchRecord,
} from "./types";

export async function researchProspectCompany(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<CompanyResearchOperationResult> {
  return researchCompanyForProspect(prospectId, options);
}

export async function getStoredCompanyResearch(
  prospectId: string
): Promise<CompanyResearchRecord | null> {
  return getCompanyResearchForProspect(prospectId);
}