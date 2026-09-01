// ============================================================================
// Prosventa Plans & Entitlements — Pure Limit Evaluation Logic
// Stage 8 — Phase 3
// ============================================================================
// Pure, DB-free decision logic so the allow/reject matrix (below/at/above
// limit, unlimited, downgrades) is unit-testable without infrastructure.
// The EntitlementService wires actual DB usage counts into these functions.
// ============================================================================

import type { LimitCheckResult, PlanEntitlement } from "./types";

/**
 * Evaluates a requested increment against an entitlement and current usage.
 *
 * - unlimited  → always allowed (`limit`/`remaining` reported as null).
 * - integer    → allowed iff usage + requested <= value. NOT truncated:
 *                over-limit requests are rejected outright (no silent clamps).
 * - anything else is treated as not-allowed-by-default (fail closed).
 */
export function evaluateLimit(params: {
  entitlement: Pick<PlanEntitlement, "limit_type" | "value"> | null;
  currentUsage: number;
  requested?: number;
}): LimitCheckResult {
  const requested = Math.max(Math.floor(params.requested ?? 1), 0);

  // No entitlement defined → fail closed but distinguishable from a cap hit.
  if (!params.entitlement) {
    return {
      allowed: false,
      errorCode: "FEATURE_NOT_INCLUDED",
      currentUsage: params.currentUsage,
      limitValue: null,
      remaining: null,
      requested,
    };
  }

  if (params.entitlement.limit_type === "unlimited") {
    return {
      allowed: true,
      errorCode: null,
      currentUsage: params.currentUsage,
      limitValue: null,
      remaining: null,
      requested,
    };
  }

  if (params.entitlement.limit_type !== "integer") {
    return failClosed(params.currentUsage, requested);
  }

  const limit = params.entitlement.value;
  const remaining = Math.max(limit - params.currentUsage, 0);
  const allowed = params.currentUsage + requested <= limit;

  return {
    allowed,
    errorCode: allowed ? null : "PLAN_LIMIT_REACHED",
    currentUsage: params.currentUsage,
    limitValue: limit,
    remaining,
    requested,
  };
}

function failClosed(currentUsage: number, requested: number): LimitCheckResult {
  return {
    allowed: false,
    errorCode: "PLAN_LIMIT_REACHED",
    currentUsage,
    limitValue: null,
    remaining: null,
    requested,
  };
}

/**
 * Boolean-feature gate: enabled/disabled per plan.
 * Maps directly onto FEATURE_NOT_INCLUDED UX ("isn't included in your plan").
 */
export function evaluateFeature(entitlement: PlanEntitlement | null): {
  included: boolean;
} {
  return { included: entitlement?.limit_type === "boolean" && entitlement.value === 1 };
}

/** Stable labels for the (future) Settings usage display. */
export const LIMIT_LABELS: Record<string, string> = {
  monthly_credit_allowance: "Monthly credits",
  max_prospects: "Prospects",
  max_team_members: "Team members",
  max_saved_lists: "Saved lists",
  max_active_automations: "Active automations",
};

/** Which entitlement keys behave as countable limits (vs flags/allowances). */
export const COUNTED_LIMIT_KEYS = [
  "max_prospects",
  "max_team_members",
  "max_saved_lists",
  "max_active_automations",
] as const;

export type CountedLimitKey = (typeof COUNTED_LIMIT_KEYS)[number];

/** Maps counted limits to their usage-source descriptor (documentation aid). */
export const LIMIT_USAGE_SOURCES: Record<
  CountedLimitKey,
  { table: string; note: string }
> = {
  max_prospects: {
    table: "prospects",
    note: "COUNT of actual organization prospects — never a frontend counter.",
  },
  max_team_members: {
    table: "organization_members",
    note: "COUNT of actual organization members (invitations checked before insert).",
  },
  max_saved_lists: {
    table: "saved_lists",
    note: "COUNT reusing the existing saved-list tables — no second list system.",
  },
  max_active_automations: {
    table: "workflows",
    note: "COUNT of active automation resources — backend enforced, not UI-hidden.",
  },
};
