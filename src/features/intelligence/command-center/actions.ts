// ============================================================================
// Prosventa Intelligence Command Center — Server Actions
// Stage 4 — Phase 10: Intelligence Command Center
// ============================================================================
// Server-side boundary for the Command Center UI.
// Aggregates existing stored intelligence with independent section loading.
// ============================================================================

"use server";

import {
  getCommandCenterSummary,
  getPriorityProspects,
  getIntelligenceFeed,
  getRecommendedActions,
  getWorkflowActivity,
  getIntelligenceHealth,
} from "./db";
import type {
  CommandCenterSummary,
  FeedItem,
  IntelligenceHealth,
  PriorityProspect,
  RecommendedAction,
  WorkflowActivity,
} from "./types";

// ============================================================================
// Individual section fetchers — each can fail independently without
// taking down the rest of the Command Center.
// ============================================================================

export async function loadSummaryAction(): Promise<CommandCenterSummary> {
  return getCommandCenterSummary();
}

export async function loadPriorityProspectsAction(): Promise<PriorityProspect[]> {
  const ranked = await getPriorityProspects(8);
  return ranked.map((item) => ({
    prospectId: item.prospect.id,
    name: item.prospect.name,
    companyName: item.prospect.company_name,
    icpScore: item.score?.score ?? null,
    icpCategory: item.score?.category ?? null,
    reasons: item.reasons,
    latestSignalAt: item.signals[0]?.detected_at ?? null,
    latestRecommendationAt: item.recommendations.find((r) => r.status === "new")?.created_at ?? null,
    updatedAt: item.prospect.updated_at,
  }));
}

export async function loadFeedAction(): Promise<FeedItem[]> {
  return getIntelligenceFeed(20);
}

export async function loadRecommendedActionsAction(): Promise<RecommendedAction[]> {
  return getRecommendedActions(10);
}

export async function loadWorkflowActivityAction(): Promise<WorkflowActivity[]> {
  return getWorkflowActivity(10);
}

export async function loadHealthAction(): Promise<IntelligenceHealth> {
  return getIntelligenceHealth();
}