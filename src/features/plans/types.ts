// ============================================================================
// Prosventa Plans & Entitlements — Types
// Stage 8 — Phase 3: Plans, Limits + Organization Billing
// ============================================================================
// Stable identifiers only. Plan NAMES and commercial numbers live in the
// database catalog (public.plans / public.plan_entitlements) — never here.
// ============================================================================

/** Stable plan keys. Mirrors public.plans.key CHECK-free catalog seeds. */
export type PlanKey = "free" | "pro" | "business" | "enterprise";

/** Plan lifecycle states (DB: plans.status). */
export type PlanStatus = "active" | "inactive" | "deprecated";

/** Controlled billing states (DB: organization_subscriptions.billing_status). */
export type BillingStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "cancelled"
  | "suspended";

/** Billing interval where applicable (Phase 4 payments will set this). */
export type BillingInterval = "monthly" | "yearly";

/** How a recurring entitlement resets. */
export type ResetPeriod = "never" | "monthly" | "daily";

/**
 * Limit representation:
 *   integer   → finite whole-number cap.
 *   boolean   → feature flag (value 0/1).
 *   unlimited → no cap. NEVER represented by a magic number anywhere.
 */
export type LimitType = "integer" | "boolean" | "unlimited";

/** Stable entitlement keys seeded in plan_entitlements. */
export type EntitlementKey =
  | "monthly_credit_allowance"
  | "max_prospects"
  | "max_team_members"
  | "max_saved_lists"
  | "max_active_automations"
  | "research_access"
  | "enrichment_access"
  | "signal_access"
  | "advanced_intelligence_access";

/** Entitlement rows as read from plan_entitlements. */
export interface PlanEntitlement {
  key: EntitlementKey;
  limit_type: LimitType;
  value: number;
  reset_period: ResetPeriod;
}

/** Plan catalog row (plans table). */
export interface PlanRow {
  key: PlanKey;
  name: string;
  description: string;
  status: PlanStatus;
  display_order: number;
  metadata: Record<string, unknown>;
}

/** Organization subscription row (organization_subscriptions table). */
export interface OrganizationSubscriptionRow {
  organization_id: string;
  plan_key: PlanKey;
  billing_status: BillingStatus;
  billing_interval: BillingInterval | null;
  period_start: string | null;
  period_end: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  limit_exceeded: boolean;
  created_at: string;
  updated_at: string;
}

/** Subscription history row (append-only). */
export interface SubscriptionHistoryRow {
  id: string;
  organization_id: string;
  from_plan_key: PlanKey | null;
  to_plan_key: PlanKey;
  reason: string;
  changed_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ----------------------------------------------------------------------------
// Structured results used by product features / future Settings page
// ----------------------------------------------------------------------------

export interface LimitCheckResult {
  allowed: boolean;
  /** Machine-readable reason when not allowed (see errors.ts codes). */
  errorCode:
    | null
    | "PLAN_LIMIT_REACHED"
    | "FEATURE_NOT_INCLUDED";
  currentUsage: number;
  limitValue: number | null; // null = unlimited
  remaining: number | null; // null = unlimited
  requested: number;
}

export interface UsageSnapshot {
  prospects: number;
  teamMembers: number;
  savedLists: number;
  activeAutomations: number;
  creditsAvailable: number;
  monthlyAllowanceUsed: number | null;
}

export interface BillingSummary {
  plan: PlanRow;
  subscription: OrganizationSubscriptionRow;
  entitlements: PlanEntitlement[];
  usage: UsageSnapshot;
  limits: Array<{
    key: EntitlementKey;
    label: string;
    limitType: LimitType;
    value: number | null; // null = unlimited
    used: number;
    remaining: number | null;
  }>;
}
