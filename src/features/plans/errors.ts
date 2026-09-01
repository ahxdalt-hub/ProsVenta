// ============================================================================
// Prosventa Plans & Entitlements — Typed Error Handling
// Stage 8 — Phase 3: Plans, Limits + Organization Billing
// ============================================================================
// Follows the existing Prosventa error convention (see
// src/features/intelligence/errors.ts and src/features/credits/errors.ts):
// stable machine-readable codes + safe user-facing messages.
//
// These are SERVER-side enforcement errors. Frontend may use the messages for
// UX, but enforcement always happens in service/server-action code.
// ============================================================================

export type PlanErrorCode =
  | "PLAN_LIMIT_REACHED"
  | "FEATURE_NOT_INCLUDED"
  | "TEAM_MEMBER_LIMIT_REACHED"
  | "PROSPECT_LIMIT_REACHED"
  | "AUTOMATION_LIMIT_REACHED"
  | "MONTHLY_ALLOWANCE_EXHAUSTED"
  | "PLAN_NOT_FOUND"
  | "PLAN_INACTIVE"
  | "BILLING_INACTIVE"
  | "UNAUTHORIZED_PLAN_OPERATION"
  | "PLAN_SERVICE_ERROR";

export const PLAN_ERROR_MESSAGES: Record<PlanErrorCode, string> = {
  PLAN_LIMIT_REACHED: "You've reached your plan's limit for this.",
  FEATURE_NOT_INCLUDED: "This feature isn't included in your current plan.",
  TEAM_MEMBER_LIMIT_REACHED:
    "You've reached your plan's team member limit. Upgrade to invite more teammates.",
  PROSPECT_LIMIT_REACHED:
    "You've reached your prospect limit. Existing prospects are safe — upgrade to add more.",
  AUTOMATION_LIMIT_REACHED:
    "You've reached your active automation limit for your plan.",
  MONTHLY_ALLOWANCE_EXHAUSTED: "You've reached your monthly limit.",
  PLAN_NOT_FOUND: "The requested plan does not exist.",
  PLAN_INACTIVE: "That plan is no longer available.",
  BILLING_INACTIVE:
    "This organization's billing is inactive. Contact support to reactivate.",
  UNAUTHORIZED_PLAN_OPERATION:
    "You are not allowed to perform this plan operation.",
  PLAN_SERVICE_ERROR: "A plan/entitlement error occurred. Please try again.",
};

export class PlanError extends Error {
  readonly code: PlanErrorCode;
  /** Contextual detail (e.g. { limit: 5000, usage: 5123 }). */
  readonly details: Record<string, unknown> | null;

  constructor(
    code: PlanErrorCode,
    options: { details?: Record<string, unknown>; cause?: unknown } = {}
  ) {
    super(PLAN_ERROR_MESSAGES[code]);
    this.name = "PlanError";
    this.code = code;
    this.details = options.details ?? null;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

/** Normalizes an unknown error into a typed PlanError. */
export function toPlanError(error: unknown): PlanError {
  if (error instanceof PlanError) return error;
  return new PlanError("PLAN_SERVICE_ERROR", { cause: error });
}
