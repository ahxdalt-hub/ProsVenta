// ============================================================================
// Prosventa Intelligence Recommendations — Server Actions
// Stage 4 — Phase 8: Intelligence Recommendations
// ============================================================================
// Server-side boundary for the UI. Never exposes internals.
// ============================================================================

"use server";

import {
  dismissRecommendationForWorkspace,
  expireStaleRecommendationsForWorkspace,
  acceptRecommendationForWorkspace,
  generateRecommendationsForProspect,
  getRecommendationsForProspectDisplay,
  getRecentRecommendationsForWorkspaceDisplay,
  updateRecommendationStatusForWorkspace,
  viewRecommendationForWorkspace,
} from "./service";
import type {
  RecommendationDismissalReason,
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

// ============================================================================
// Feature 5 Phase 1 — lifecycle actions
// ============================================================================

export async function viewRecommendation(
  recommendationId: string
): Promise<boolean> {
  return viewRecommendationForWorkspace(recommendationId);
}

export async function acceptRecommendation(
  recommendationId: string
): Promise<boolean> {
  return acceptRecommendationForWorkspace(recommendationId);
}

export async function dismissRecommendation(
  recommendationId: string,
  reason?: RecommendationDismissalReason,
  feedback?: string
): Promise<boolean> {
  return dismissRecommendationForWorkspace(recommendationId, reason, feedback);
}

export async function expireStaleRecommendations(): Promise<number> {
  return expireStaleRecommendationsForWorkspace();
}