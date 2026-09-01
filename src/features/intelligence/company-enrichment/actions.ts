// ============================================================================
// Prosventa Company Enrichment — Server Actions
// Stage 5 — Phase 2: Company Enrichment
// ============================================================================
// Server-side boundary for the UI. Never exposes provider secrets.
// ============================================================================

"use server";

import {
  enrichCompanyForProspect,
  getCompanyEnrichmentForProspect,
} from "./service";
import type { CompanyEnrichmentOperationResult } from "./types";
import type { CompanyEnrichmentRecordLike } from "./service";
import {
  executeBillable,
  resolveBillingContext,
} from "@/features/credits/billing";

/**
 * Billable operation: company_enrichment (see CreditOperationCatalog).
 * Preflight → execute → consume on success. Cache hits and duplicate
 * in-flight jobs are never charged. Failures never consume credits.
 */
export async function enrichCompany(
  prospectId: string,
  domain: string,
  options?: { refresh?: boolean }
): Promise<CompanyEnrichmentOperationResult & { billing?: import("@/features/credits/billing").BillingErrorInfo | null }> {
  const ctx = await resolveBillingContext();
  const fail = (
    message: string,
    billing: import("@/features/credits/billing").BillingErrorInfo | null = null
  ): CompanyEnrichmentOperationResult & { billing?: import("@/features/credits/billing").BillingErrorInfo | null } => ({
    status: "failed",
    message,
    data: null,
    provider: "",
    enrichedAt: null,
    confidence: null,
    partial: false,
    warnings: [],
    alreadyInProgress: false,
    usedCached: false,
    billing,
  });

  if (!ctx) return fail("Authentication required.");

  const outcome = await executeBillable({
    operationKey: "company_enrichment",
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    prospectId,
    companyDomain: domain || null,
    scope: options?.refresh ? "refresh" : "initial",
    execute: () => enrichCompanyForProspect(prospectId, domain, options),
    // Honest billing: fresh cached data or an already-running job is free.
    shouldCharge: (result) =>
      result.status === "completed" && !result.usedCached && !result.alreadyInProgress,
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



export async function getStoredCompanyEnrichment(
  prospectId: string
): Promise<CompanyEnrichmentRecordLike | null> {
  return getCompanyEnrichmentForProspect(prospectId);
}