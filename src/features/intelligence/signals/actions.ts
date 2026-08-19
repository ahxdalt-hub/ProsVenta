// ============================================================================
// Prosventa Buying & Intent Signals — Server Actions
// Stage 4 — Phase 7: Buying & Intent Signals
// ============================================================================
// Server-side boundary for the UI. Never exposes provider secrets.
// ============================================================================

"use server";

import {
  detectSignalsForProspect,
  getSignalsForProspectDisplay,
  getRecentSignalsForWorkspaceDisplay,
  dismissSignalForWorkspace,
} from "./service";
import type {
  SignalOperationResult,
  SignalRecord,
} from "./types";

export async function detectSignals(
  prospectId: string,
  options?: { runExternal?: boolean }
): Promise<SignalOperationResult> {
  return detectSignalsForProspect(prospectId, options);
}

export async function getStoredSignals(
  prospectId: string
): Promise<SignalRecord[]> {
  return getSignalsForProspectDisplay(prospectId);
}

export async function getRecentSignals(
  limit?: number
): Promise<SignalRecord[]> {
  return getRecentSignalsForWorkspaceDisplay(limit);
}

export async function dismissSignalAction(
  signalId: string
): Promise<boolean> {
  return dismissSignalForWorkspace(signalId);
}