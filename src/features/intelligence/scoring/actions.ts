// ============================================================================
// Prosventa Smart Lead & ICP Scoring — Server Actions
// Stage 4 — Phase 6: Smart Lead & ICP Scoring
// ============================================================================
// Server-side boundary for the UI. Never exposes internals.
// ============================================================================

"use server";

import {
  scoreProspectForWorkspace,
  getStoredProspectScore,
} from "./service";
import type {
  ProspectScore,
  ScoreOperationResult,
} from "./types";

export async function scoreProspect(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<ScoreOperationResult> {
  return scoreProspectForWorkspace(prospectId, options);
}

export async function getStoredScore(
  prospectId: string
): Promise<ProspectScore | null> {
  return getStoredProspectScore(prospectId);
}