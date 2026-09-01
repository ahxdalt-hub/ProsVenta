// ============================================================================
// Prosventa AI Company Research — Server Actions
// Stage 4 — Phase 4: AI Company Research
// ============================================================================
// Server-side boundary for the UI. Never exposes provider secrets.
// ============================================================================

"use server";

import {
  researchCompanyForProspect,
  getCompanyResearchForProspect,
} from "./service";
import type {
  CompanyResearchOperationResult,
  CompanyResearchRecord,
} from "./types";
import {
  executeBillable,
  resolveBillingContext,
} from "@/features/credits/billing";

/**
 * Billable operation: company_research (see CreditOperationCatalog).
 * Cached results are served directly (free). Only a real research run
 * preflights + consumes credits; failures never charge.
 */
export async function researchProspectCompany(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<CompanyResearchOperationResult & { billing?: import("@/features/credits/billing").BillingErrorInfo | null }> {
  const fail = (
    message: string,
    billing: import("@/features/credits/billing").BillingErrorInfo | null = null
  ): CompanyResearchOperationResult & { billing?: import("@/features/credits/billing").BillingErrorInfo | null } => ({
    status: "failed",
    message,
    result: null,
    provider: "",
    model: null,
    researchedAt: null,
    billing,
  });

  // Cached path — no AI run, no credits.
  if (!options?.refresh) {
    const stored = await getCompanyResearchForProspect(prospectId);
    if (stored && stored.status === "completed" && stored.result) {
      return { ...(await researchCompanyForProspect(prospectId, options)), billing: null };
    }
  }

  const ctx = await resolveBillingContext();
  if (!ctx) return fail("Authentication required.");

  const outcome = await executeBillable({
    operationKey: "company_research",
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    prospectId,
    scope: "run",
    execute: () => researchCompanyForProspect(prospectId, { refresh: true }),
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

export async function getStoredCompanyResearch(
  prospectId: string
): Promise<CompanyResearchRecord | null> {
  return getCompanyResearchForProspect(prospectId);
}
