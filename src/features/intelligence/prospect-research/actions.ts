// ============================================================================
// Prosventa AI Prospect Research — Server Actions
// Stage 4 — Phase 5: AI Prospect Research
// ============================================================================
// Server-side boundary for the UI. Never exposes provider secrets.
// ============================================================================

"use server";

import {
  researchProspectForProspect,
  getProspectResearchForProspect,
} from "./service";
import type {
  ProspectResearchOperationResult,
  ProspectResearchRecord,
} from "./types";

export async function researchProspect(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<ProspectResearchOperationResult> {
  return researchProspectForProspect(prospectId, options);
}

export async function getStoredProspectResearch(
  prospectId: string
): Promise<ProspectResearchRecord | null> {
  return getProspectResearchForProspect(prospectId);
}