// ============================================================================
// Prosventa Intelligence Recommendations — Server Actions
// Stage 4 — Phase 8: Intelligence Recommendations
// ============================================================================
// Server-side boundary for the UI. Never exposes internals.
// ============================================================================

"use server";

import {
  generateRecommendationsForProspect,
  getRecommendationsForProspectDisplay,
  getRecentRecommendationsForWorkspaceDisplay,
  updateRecommendationStatusForWorkspace,
} from "./service";
import type {
  RecommendationOperationResult,
  RecommendationRecord,
} from "./types";

export async function generateRecommendations(
  prospectId: string
): Promise<RecommendationOperationResult> {
  return generateRecommendationsForProspect(prospectId);
}

export async function getStoredRecommendations(
  prospectId: string
): Promise<RecommendationRecord[]> {
  return getRecommendationsForProspectDisplay(prospectId);
}

export async function getRecentRecommendations(
  limit?: number
): Promise<RecommendationRecord[]> {
  return getRecentRecommendationsForWorkspaceDisplay(limit);
}

export async function updateRecommendationStatusAction(
  recommendationId: string,
  status: RecommendationRecord["status"]
): Promise<boolean> {
  return updateRecommendationStatusForWorkspace(recommendationId, status);
}