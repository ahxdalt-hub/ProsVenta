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
  listProspectSignalsDisplay,
  getProspectSignalsSummary,
  changeSignalStatusForWorkspace,
} from "./service";
import type {
  SignalOperationResult,
  SignalRecord,
  SignalStatus,
} from "./types";
import {
  executeBillable,
  resolveBillingContext,
} from "@/features/credits/billing";

/**
 * Billable operation: signal_refresh (see CreditOperationCatalog) — charged
 * ONLY when external provider detection actually ran (internal activity
 * analysis is free). Failures never consume credits.
 */
export async function detectSignals(
  prospectId: string,
  options?: { runExternal?: boolean }
): Promise<SignalOperationResult & { billing?: import("@/features/credits/billing").BillingErrorInfo | null }> {
  const fail = (
    message: string,
    billing: import("@/features/credits/billing").BillingErrorInfo | null = null
  ): SignalOperationResult & { billing?: import("@/features/credits/billing").BillingErrorInfo | null } => ({
    status: "failed",
    message,
    created: 0,
    duplicates: 0,
    provider: null,
    externalConfigured: false,
    billing,
  });

  // Internal-only detection is not a billable operation.
  if (!options?.runExternal) {
    return { ...(await detectSignalsForProspect(prospectId, options)), billing: null };
  }

  const ctx = await resolveBillingContext();
  if (!ctx) return fail("Authentication required.");

  const outcome = await executeBillable({
    operationKey: "signal_refresh",
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    prospectId,
    scope: "external",
    execute: () => detectSignalsForProspect(prospectId, options),
    // Honest billing: only charge when an external provider actually ran.
    shouldCharge: (result) =>
      result.status === "completed" && result.provider !== null && result.externalConfigured,
  });

  if (outcome.error) {
    return fail(
      outcome.error.code === "INSUFFICIENT_CREDITS"
        ? `This operation uses ${outcome.error.required} credits, but only ${outcome.error.balance} are available.`
        : outcome.error.message,
      outcome.error
    );
  }

  return { ...outcome.result!, billing: null };
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

// ============================================================================
// Signals UX (Feature 3 — Phase 3)
// ============================================================================

import type {
  ProspectSignalsPage,
  ProspectSignalsRequest,
} from "./service";

/**
 * Filtered, paginated signal list for a prospect + its company.
 * Errors are returned as a controlled message — never raw provider details.
 */
export async function listProspectSignalsAction(
  request: ProspectSignalsRequest
): Promise<ProspectSignalsPage & { error: string | null }> {
  try {
    const page = await listProspectSignalsDisplay(request);
    return { ...page, error: null };
  } catch {
    return { rows: [], total: 0, limit: 0, offset: 0, error: "SIGNALS_UNAVAILABLE" };
  }
}

/** Lightweight header summary for the Signals overview. */
export async function getProspectSignalsSummaryAction(
  prospectId: string,
  companyKey: string | null
): Promise<{ total: number; fresh: number; highImportance: number } | null> {
  try {
    return await getProspectSignalsSummary(prospectId, companyKey);
  } catch {
    return null;
  }
}

/**
 * Lifecycle-validated status change (dismiss). Returns the updated record or
 * null when the change is not allowed / not owned by the caller.
 */
export async function changeSignalStatusAction(
  signalId: string,
  next: SignalStatus
): Promise<SignalRecord | null> {
  return changeSignalStatusForWorkspace(signalId, next);
}

/**
 * Batch foundation (Stage 6 — Phase 5). Server-side, bounded batch detection
 * for future background refresh. Never called from rendering logic.
 */
export async function detectExternalSignalsBatch(
  prospectIds: string[]
): Promise<SignalOperationResult[]> {
  const { detectExternalSignalsForCompanies } = await import("./service");
  return detectExternalSignalsForCompanies(prospectIds);
}