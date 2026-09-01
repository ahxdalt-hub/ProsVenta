// ============================================================================
// Prosventa Person Enrichment — Server Actions
// Stage 6 - Phase 3: People & Decision-Maker Intelligence
// ============================================================================
// Server-side boundary for the UI. Never exposes provider secrets or raw
// provider errors.
// ============================================================================

"use server";

import {
  enrichPersonForProspect,
  getPersonEnrichmentForProspect,
} from "./service";
import type { ProspectEnrichmentOperationResult } from "../types";
import type { ProspectEnrichmentRecord } from "../types";
import {
  executeBillable,
  resolveBillingContext,
} from "@/features/credits/billing";

/**
 * Billable operation: prospect_enrichment (see CreditOperationCatalog).
 * Preflight → execute → consume on success. Cache hits and duplicate
 * in-flight jobs are never charged. Failures never consume credits.
 */
export async function enrichPerson(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<ProspectEnrichmentOperationResult & { billing?: import("@/features/credits/billing").BillingErrorInfo | null }> {
  const ctx = await resolveBillingContext();
  const fail = (
    message: string,
    billing: import("@/features/credits/billing").BillingErrorInfo | null = null
  ): ProspectEnrichmentOperationResult & { billing?: import("@/features/credits/billing").BillingErrorInfo | null } => ({
    status: "failed",
    message,
    data: null,
    provider: "",
    enrichedAt: null,
    identityUsed: null,
    warnings: [],
    alreadyInProgress: false,
    usedCached: false,
    billing,
  });

  if (!ctx) return fail("Authentication required.");

  const outcome = await executeBillable({
    operationKey: "prospect_enrichment",
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    prospectId,
    scope: options?.refresh ? "refresh" : "initial",
    execute: () => enrichPersonForProspect(prospectId, options),
    shouldCharge: (result) =>
      result.status === "completed" &&
      !result.usedCached &&
      !result.alreadyInProgress,
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

export async function getStoredPersonEnrichment(
  prospectId: string
): Promise<ProspectEnrichmentRecord | null> {
  return getPersonEnrichmentForProspect(prospectId);
}

