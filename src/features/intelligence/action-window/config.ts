// ============================================================================
// Prosventa Intelligence — Action Configuration (Phase 2)
// ============================================================================
// Centralized per-action presentation + behavior. Costs are NEVER hardcoded
// here — each action maps to a CreditOperationKey and derives its real credit
// cost from CREDIT_OPERATION_CATALOG (the single billing source of truth).
// The frontend only displays the authoritative configuration; the server
// re-resolves cost + enforces billing at execution time.
// ============================================================================

import { CREDIT_OPERATION_CATALOG, type CreditOperationKey } from "@/features/credits/operations";
import type { IntelligenceActionKind } from "./types";

export type ActionTargetKind = "prospect" | "company";

export interface IntelligenceActionConfig {
  kind: IntelligenceActionKind;
  /** Window header title. */
  title: string;
  /** One-line description under the title. */
  description: string;
  /** Billable operation key (null for non-billable actions like review). */
  operationKey: CreditOperationKey | null;
  /** Whether this action requires a prospect/company target. */
  requiresTarget: boolean;
  targetKind: ActionTargetKind;
  /** Placeholder for the unified selector. */
  searchPrompt: string;
  /** Primary submit-button label. */
  startLabel: string;
  /** Copy shown while the operation is running. */
  runningTitle: string;
  runningMessage: string;
  /** Success header copy. */
  successTitle: string;
  /** Vocabulary noun for the success line ("prospect" / "company"). */
  resultNoun: string;
}

/** Maps each action kind to its canonical billable operation key. */
const OPERATION_KEY: Record<IntelligenceActionKind, CreditOperationKey | null> = {
  research_prospect: "prospect_research",
  research_company: "company_research",
  enrich_prospect: "prospect_enrichment",
  enrich_company: "company_enrichment",
  review_signal: null,
};

export const INTELLIGENCE_ACTIONS: Record<
  IntelligenceActionKind,
  IntelligenceActionConfig
> = {
  research_prospect: {
    kind: "research_prospect",
    title: "Research prospect",
    description: "Deep AI research brief about an individual prospect.",
    operationKey: OPERATION_KEY.research_prospect,
    requiresTarget: true,
    targetKind: "prospect",
    searchPrompt: "Search prospects",
    startLabel: "Start Research",
    runningTitle: "Researching prospect...",
    runningMessage: "Prosventa is analyzing available intelligence. Please wait.",
    successTitle: "Research complete",
    resultNoun: "prospect",
  },
  research_company: {
    kind: "research_company",
    title: "Research company",
    description: "Research this prospect's company using grounded intelligence sources.",
    operationKey: OPERATION_KEY.research_company,
    requiresTarget: true,
    targetKind: "company",
    searchPrompt: "Search companies",
    startLabel: "Start Research",
    runningTitle: "Researching company...",
    runningMessage: "Prosventa is analyzing available company intelligence. Please wait.",
    successTitle: "Research complete",
    resultNoun: "company",
  },
  enrich_prospect: {
    kind: "enrich_prospect",
    title: "Enrich prospect",
    description: "Find additional professional details for this prospect.",
    operationKey: OPERATION_KEY.enrich_prospect,
    requiresTarget: true,
    targetKind: "prospect",
    searchPrompt: "Search prospects",
    startLabel: "Start Enrichment",
    runningTitle: "Enriching prospect...",
    runningMessage: "Prosventa is gathering available contact intelligence. Please wait.",
    successTitle: "Enrichment complete",
    resultNoun: "prospect",
  },
  enrich_company: {
    kind: "enrich_company",
    title: "Enrich company",
    description: "Discover richer firmographic details for this prospect's company.",
    operationKey: OPERATION_KEY.enrich_company,
    requiresTarget: true,
    targetKind: "company",
    searchPrompt: "Search companies",
    startLabel: "Start Enrichment",
    runningTitle: "Enriching company...",
    runningMessage: "Prosventa is combining available company intelligence. Please wait.",
    successTitle: "Enrichment complete",
    resultNoun: "company",
  },
  review_signal: {
    kind: "review_signal",
    title: "Review signal",
    description: "Understand why this signal was surfaced for your workspace.",
    operationKey: OPERATION_KEY.review_signal,
    requiresTarget: false,
    targetKind: "prospect",
    searchPrompt: "Search prospects",
    startLabel: "Close",
    runningTitle: "Loading signal...",
    runningMessage: "Loading the signal details.",
    successTitle: "Signal",
    resultNoun: "signal",
  },
};

export function getIntelligenceActionConfig(
  kind: IntelligenceActionKind
): IntelligenceActionConfig {
  return INTELLIGENCE_ACTIONS[kind];
}

/** Real, authoritative credit cost from CREDIT_OPERATION_CATALOG (0 when none). */
export function getIntelligenceActionCost(kind: IntelligenceActionKind): number {
  const operationKey = INTELLIGENCE_ACTIONS[kind].operationKey;
  if (!operationKey) return 0;
  return CREDIT_OPERATION_CATALOG[operationKey].cost;
}