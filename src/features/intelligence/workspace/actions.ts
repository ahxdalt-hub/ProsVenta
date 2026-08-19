// ============================================================================
// Prosventa Intelligence Workspace — Server Actions
// Stage 5 — Phase 3: Intelligence Workspace
// ============================================================================
"use server";

import { getProspect, queryProspects } from "@/lib/db/prospects";
import { getProspectEnrichment } from "@/lib/db/intelligence";
import { getCompanyEnrichmentForProspect } from "../company-enrichment/service";
import { getCompanyResearchForProspect } from "../research/service";
import { getProspectResearchForProspect } from "../prospect-research/service";
import { getStoredProspectScore } from "../scoring/service";
import { getSignalsForProspectDisplay } from "../signals/service";
import { getRecommendationsForProspectDisplay } from "../recommendations/service";
import { enrichCompany } from "../company-enrichment/actions";
import { enrichProspectContact } from "../actions/enrich";
import { researchProspectCompany } from "../research/actions";
import { researchProspect } from "../prospect-research/actions";
import { scoreProspect } from "../scoring/actions";
import { detectSignals } from "../signals/actions";
import { generateRecommendations } from "../recommendations/actions";
import type { WorkspaceData, WorkspaceOperation, WorkspaceOperationResult } from "./types";
import type { Prospect } from "@/types/database";

export async function loadWorkspaceData(
  prospectId: string
): Promise<WorkspaceData | null> {
  const prospect = await getProspect(prospectId);
  if (!prospect) return null;

  const [
    companyEnrichment,
    prospectEnrichment,
    companyResearch,
    prospectResearch,
    score,
    signals,
    recommendations,
  ] = await Promise.allSettled([
    getCompanyEnrichmentForProspect(prospectId),
    getProspectEnrichment(prospectId),
    getCompanyResearchForProspect(prospectId),
    getProspectResearchForProspect(prospectId),
    getStoredProspectScore(prospectId),
    getSignalsForProspectDisplay(prospectId),
    getRecommendationsForProspectDisplay(prospectId),
  ]);

  return {
    prospect,
    companyEnrichment: settledValue(companyEnrichment, null),
    prospectEnrichment: settledValue(prospectEnrichment, null),
    companyResearch: settledValue(companyResearch, null),
    prospectResearch: settledValue(prospectResearch, null),
    score: settledValue(score, null),
    signals: settledValue(signals, []),
    recommendations: settledValue(recommendations, []),
  };
}

/**
 * Lightweight prospect search for the workspace selector. Uses the existing
 * paginated query path with a small limit — never loads the full table.
 */
export async function searchWorkspaceProspects(
  search = ""
): Promise<Pick<Prospect, "id" | "name" | "company_name" | "status" | "industry">[]> {
  const page = await queryProspects({
    search: search || undefined,
    page: 1,
    pageSize: 8,
    sort: "updated_at",
    order: "desc",
  });
  return page.prospects.map((p) => ({
    id: p.id,
    name: p.name,
    company_name: p.company_name,
    status: p.status,
    industry: p.industry,
  }));
}

export async function runWorkspaceOperation(
  prospectId: string,
  operation: WorkspaceOperation,
  options?: { refresh?: boolean; runExternal?: boolean }
): Promise<WorkspaceOperationResult> {
  switch (operation) {
    case "enrich_company":
      return { operation, outcome: await enrichCompany(prospectId, "", options) };
    case "enrich_prospect":
      return { operation, outcome: await enrichProspectContact(prospectId, options) };
    case "research_company":
      return { operation, outcome: await researchProspectCompany(prospectId, options) };
    case "research_prospect":
      return { operation, outcome: await researchProspect(prospectId, options) };
    case "score":
      return { operation, outcome: await scoreProspect(prospectId, options) };
    case "detect_signals":
      return { operation, outcome: await detectSignals(prospectId, options) };
    case "generate_recommendations":
      return { operation, outcome: await generateRecommendations(prospectId) };
  }
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}
