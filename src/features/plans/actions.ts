"use server";

// ============================================================================
// Prosventa Plans & Entitlements — Server Actions
// Stage 8 — Phase 3
// ============================================================================
// MINIMUM hooks only. The complete Settings redesign is intentionally NOT part
// of this phase. These actions are thin, serialized-result wrappers around
// EntitlementService so future UI can consume structured data/errors without
// duplicating enforcement logic.
// ============================================================================

import { EntitlementService } from "./service";
import { toPlanError } from "./errors";
import type { BillingSummary } from "./types";

export interface ActionResult<T> {
  data?: T;
  error?: { code: string; message: string };
}

/** Structured summary for the future Settings page (Current Plan / Usage / Limits). */
export async function getOrganizationBillingSummary(
  organizationId: string
): Promise<ActionResult<BillingSummary>> {
  try {
    return { data: await EntitlementService.getBillingSummary(organizationId) };
  } catch (error) {
    const plan = toPlanError(error);
    return { error: { code: plan.code, message: plan.message } };
  }
}

/**
 * Administrative plan assignment (owner-only inside the service).
 * Supports upgrades AND downgrades; downgrade over-limit sets limit_exceeded.
 */
export async function assignOrganizationPlan(input: {
  organizationId: string;
  planKey: string;
  reason?: string;
}): Promise<ActionResult<{ limitExceeded: boolean }>> {
  try {
    const result = await EntitlementService.assignPlan({
      actor: { userId: "" }, // resolved server-side from the session
      organizationId: input.organizationId,
      planKey: input.planKey,
      reason: input.reason,
    });
    return { data: result };
  } catch (error) {
    const plan = toPlanError(error);
    return { error: { code: plan.code, message: plan.message } };
  }
}

/**
 * Triggers the idempotent monthly credit allocation for the current billing
 * period. Safe to retry — duplicates grant nothing.
 */
export async function triggerMonthlyAllocation(
  organizationId: string
): Promise<
  ActionResult<{ status: string; amount: number; periodKey: string | null }>
> {
  try {
    const result = await EntitlementService.grantMonthlyAllocation({
      actor: { userId: "" }, // resolved server-side from the session
      organizationId,
    });
    return {
      data: {
        status: result.status,
        amount: result.amount,
        periodKey: result.periodKey,
      },
    };
  } catch (error) {
    const plan = toPlanError(error);
    return { error: { code: plan.code, message: plan.message } };
  }
}
