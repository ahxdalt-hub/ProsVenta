// ============================================================================
// Prosventa Intelligence Workspace — Types
// Stage 5 — Phase 3: Intelligence Workspace
// ============================================================================

import type { Prospect } from "@/types/database";
import type { CompanyEnrichmentRecordLike } from "../company-enrichment/service";
import type { CompanyEnrichmentOperationResult } from "../company-enrichment/types";
import type { ProspectEnrichmentOperationResult, ProspectEnrichmentRecord } from "../types";
import type { CompanyResearchOperationResult, CompanyResearchRecord } from "../research/types";
import type { ProspectResearchOperationResult, ProspectResearchRecord } from "../prospect-research/types";
import type { ProspectScore, ScoreOperationResult } from "../scoring/types";
import type { SignalOperationResult, SignalRecord } from "../signals/types";
import type { RecommendationOperationResult, RecommendationRecord } from "../recommendations/types";

export type WorkspaceTabId =
  | "overview"
  | "research"
  | "company"
  | "signals"
  | "score"
  | "recommendations";

export const WORKSPACE_TABS: { id: WorkspaceTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "research", label: "Research" },
  { id: "company", label: "Company" },
  { id: "signals", label: "Signals" },
  { id: "score", label: "Score" },
  { id: "recommendations", label: "Recommendations" },
];

export interface WorkspaceData {
  prospect: Prospect | null;
  companyEnrichment: CompanyEnrichmentRecordLike | null;
  prospectEnrichment: ProspectEnrichmentRecord | null;
  companyResearch: CompanyResearchRecord | null;
  prospectResearch: ProspectResearchRecord | null;
  score: ProspectScore | null;
  signals: SignalRecord[];
  recommendations: RecommendationRecord[];
}

export type WorkspaceOperation =
  | "enrich_company"
  | "enrich_prospect"
  | "research_company"
  | "research_prospect"
  | "score"
  | "detect_signals"
  | "generate_recommendations";

export type WorkspaceOperationResult =
  | { operation: "enrich_company"; outcome: CompanyEnrichmentOperationResult }
  | { operation: "enrich_prospect"; outcome: ProspectEnrichmentOperationResult }
  | { operation: "research_company"; outcome: CompanyResearchOperationResult }
  | { operation: "research_prospect"; outcome: ProspectResearchOperationResult }
  | { operation: "score"; outcome: ScoreOperationResult }
  | { operation: "detect_signals"; outcome: SignalOperationResult }
  | { operation: "generate_recommendations"; outcome: RecommendationOperationResult };

export type WorkspaceSectionStatus = "idle" | "loading" | "processing" | "success" | "error";