// ============================================================================
// Prosventa Plans & Entitlements — EntitlementService
// Stage 8 — Phase 3: Plans, Limits + Organization Billing
// ============================================================================
// THE single server-side entry point for plan resolution, feature access,
// limit checks, usage evaluation, monthly credit allocation and plan changes.
// Product features must call this service — never read subscription tables or
// hardcode `if (plan === "pro")` checks in components.
//
// Security model:
//   - Reads are RLS-scoped (members see only their own org's billing rows).
//   - Plan assignment / allocation are administrative operations gated by the
//     owner role verified against organization_members (never client input).
//   - Monthly allocations route through the Phase 1 CreditService accounting
//     path (grant_plan_allocation → grant_credits → ledger → wallet) and are
//     idempotent per (organization, billing period).
//   - Downgrades NEVER delete data; over-limit orgs get limit_exceeded=true
//     and further creation is blocked until compliant.
// ============================================================================

import "server-only";

import { createClient } from "@/lib/supabase/server";
import { PlanError, toPlanError } from "./errors";
import { evaluateFeature, evaluateLimit, LIMIT_LABELS } from "./limits";
import { buildAllocationIdempotencyKey } from "./period";
import type {
  BillingSummary,
  EntitlementKey,
  LimitCheckResult,
  OrganizationSubscriptionRow,
  PlanEntitlement,
  PlanRow,
  SubscriptionHistoryRow,
  UsageSnapshot,
} from "./types";

interface EntitlementContext {
  userId: string;
}

type CountedKey = Extract<
  EntitlementKey,
  "max_prospects" | "max_team_members" | "max_saved_lists" | "max_active_automations"
>;

/** Resolves the caller's authenticated identity + organization membership. */
async function resolveMembership(organizationId: string): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  role: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new PlanError("UNAUTHORIZED_PLAN_OPERATION");

  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .single();

  if (error || !membership) {
    throw new PlanError("UNAUTHORIZED_PLAN_OPERATION");
  }
  return { supabase, userId: user.id, role: membership.role };
}

async function requireOwner(
  organizationId: string
): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; userId: string }> {
  const ctx = await resolveMembership(organizationId);
  if (ctx.role !== "owner") {
    throw new PlanError("UNAUTHORIZED_PLAN_OPERATION");
  }
  return { supabase: ctx.supabase, userId: ctx.userId };
}

export const EntitlementService = {
  // --------------------------------------------------------------------------
  // Plan resolution
  // --------------------------------------------------------------------------

  /** Authoritative current plan for the organization. */
  async getCurrentPlan(organizationId: string): Promise<PlanRow> {
    try {
      await resolveMembership(organizationId);
      const supabase = await createClient();
      const { data: sub, error } = await supabase
        .from("organization_subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .single();
      if (error || !sub) throw new PlanError("PLAN_NOT_FOUND");

      const { data: plan, error: planErr } = await supabase
        .from("plans")
        .select("*")
        .eq("key", (sub as OrganizationSubscriptionRow).plan_key)
        .single();
      if (planErr || !plan) throw new PlanError("PLAN_NOT_FOUND");
      return plan as unknown as PlanRow;
    } catch (error) {
      throw toPlanError(error);
    }
  },

  /** Billing profile row (billing status, interval, period, provider refs). */
  async getBillingProfile(
    organizationId: string
  ): Promise<OrganizationSubscriptionRow> {
    try {
      await resolveMembership(organizationId);
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("organization_subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .single();
      if (error || !data) throw new PlanError("PLAN_NOT_FOUND");
      return data as unknown as OrganizationSubscriptionRow;
    } catch (error) {
      throw toPlanError(error);
    }
  },

  /** All entitlements of the current plan. */
  async getEntitlements(organizationId: string): Promise<PlanEntitlement[]> {
    try {
      const sub = await this.getBillingProfile(organizationId);
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("plan_entitlements")
        .select("key,limit_type,value,reset_period")
        .eq("plan_key", sub.plan_key);
      if (error) throw error;
      return (data ?? []) as unknown as PlanEntitlement[];
    } catch (error) {
      throw toPlanError(error);
    }
  },

  /** Single entitlement by stable key (null when the plan omits it). */
  async getEntitlement(
    organizationId: string,
    key: EntitlementKey
  ): Promise<PlanEntitlement | null> {
    const all = await this.getEntitlements(organizationId);
    return all.find((e) => e.key === key) ?? null;
  },

  // --------------------------------------------------------------------------
  // Feature access + limits
  // --------------------------------------------------------------------------

  /** Feature-level gate backed by boolean plan entitlements. */
  async checkFeature(organizationId: string, key: EntitlementKey): Promise<boolean> {
    const entitlement = await this.getEntitlement(organizationId, key);
    return evaluateFeature(entitlement).included;
  },

  /** Actual DB-record usage — never a frontend counter. */
  async getUsage(organizationId: string): Promise<UsageSnapshot> {
    try {
      const supabase = await createClient();

      const count = async (table: string) => {
        const { count: n, error } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId);
        if (error) throw error;
        return n ?? 0;
      };

      let activeAutomations = 0;
      {
        const { count, error } = await supabase
          .from("workflows")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("is_active", true);
        if (!error && count != null) activeAutomations = count;
      }

      const wallet = await supabase
        .from("org_credit_balances")
        .select("balance,monthly_allowance,month_key")
        .eq("organization_id", organizationId)
        .single();

      const [prospects, teamMembers, savedLists] = await Promise.all([
        count("prospects"),
        count("organization_members"),
        count("saved_lists"),
      ]);

      return {
        prospects,
        teamMembers,
        savedLists,
        activeAutomations,
        creditsAvailable: Number(wallet.data?.balance ?? 0),
        monthlyAllowanceUsed: null, // computed against ledger in reporting layer
      };
    } catch (error) {
      throw toPlanError(error);
    }
  },


  /** Structured allow/reject decision for a limited operation. */
  async checkLimit(
    organizationId: string,
    key: CountedKey,
    requested = 1
  ): Promise<LimitCheckResult> {
    try {
      const entitlement = await this.getEntitlement(organizationId, key);
      const usage = await this.getUsage(organizationId);
      const used = usageOf(key, usage);
      return evaluateLimit({ entitlement, currentUsage: used, requested });
    } catch (error) {
      throw toPlanError(error);
    }
  },

  /** Remaining capacity for a limit (null = unlimited). */
  async getRemaining(organizationId: string, key: CountedKey): Promise<number | null> {
    const result = await this.checkLimit(organizationId, key);
    return result.remaining;
  },


  // --------------------------------------------------------------------------
  // Monthly credit allowance (Phase 1 CreditService bridge)
  // --------------------------------------------------------------------------

  /**
   * Grants the plan's recurring credits for the CURRENT billing period via
   * the SECURITY DEFINER RPC. Idempotent per (org, period): retries return
   * status='duplicate' and grant nothing. Returns the RPC payload summary.
   */
  async grantMonthlyAllocation(params: {
    actor: EntitlementContext;
    organizationId: string;
  }): Promise<{
    status: string;
    amount: number;
    periodKey: string | null;
    balance: number;
  }> {
    try {
      await requireOwner(params.organizationId);
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("grant_plan_allocation", {
        p_org_id: params.organizationId,
        p_actor_id: params.actor.userId,
      });
      if (error) throw error;
      const raw = Array.isArray(data) ? data[0] : (data as Record<string, unknown>);
      return {
        status: String(raw?.status ?? "unknown"),
        amount: Number(raw?.amount ?? 0),
        periodKey: (raw?.period_key as string | null) ?? null,
        balance: Number(raw?.balance ?? 0),
      };
    } catch (error) {
      throw toPlanError(error);
    }
  },

  /** Deterministic key helper exposed for tests/reporting. */
  allocationKeyFor(organizationId: string, periodKey: string): string {
    return buildAllocationIdempotencyKey(organizationId, periodKey);
  },


  // --------------------------------------------------------------------------
  // Plan changes (administrative — owner only; payment wiring is Phase 4)
  // --------------------------------------------------------------------------

  /**
   * Assigns/changes the organization's plan. Works for upgrades AND
   * downgrades. On downgrade where current usage exceeds the new plan's
   * limits, sets limit_exceeded=true (creation blocked until compliant) and
   * NEVER deletes existing data. Records the transition in append-only
   * subscription history.
   */
  async assignPlan(params: {
    actor: EntitlementContext;
    organizationId: string;
    planKey: string;
    reason?: string;
  }): Promise<{ limitExceeded: boolean }> {
    try {
      const { supabase, userId } = await requireOwner(params.organizationId);

      const { data: plan, error: planErr } = await supabase
        .from("plans")
        .select("key,status")
        .eq("key", params.planKey)
        .single();
      if (planErr || !plan) throw new PlanError("PLAN_NOT_FOUND");
      if ((plan as { status: string }).status !== "active") {
        throw new PlanError("PLAN_INACTIVE");
      }

      const previous = await supabase
        .from("organization_subscriptions")
        .select("plan_key")
        .eq("organization_id", params.organizationId)
        .single();
      const fromPlan =
        (previous.data as { plan_key: string } | null)?.plan_key ?? null;

      // Downgrade safety: compare current usage against the NEW plan limits.
      const { data: newLimits, error: limErr } = await supabase
        .from("plan_entitlements")
        .select("key,limit_type,value")
        .eq("plan_key", params.planKey);
      if (limErr) throw limErr;

      let limitExceeded = false;
      if (
        fromPlan &&
        fromPlan !== params.planKey &&
        (newLimits ?? []).some((l) => l.limit_type === "integer")
      ) {
        const usage = await this.getUsage(params.organizationId);
        const valueOf = (k: string): number | null => {
          const row = (newLimits ?? []).find((l) => l.key === k);
          if (!row || row.limit_type !== "integer") return null;
          return Number(row.value);
        };
        limitExceeded =
          (valueOf("max_prospects") ?? Infinity) < usage.prospects ||
          (valueOf("max_team_members") ?? Infinity) < usage.teamMembers ||
          (valueOf("max_saved_lists") ?? Infinity) < usage.savedLists ||
          (valueOf("max_active_automations") ?? Infinity) <
            usage.activeAutomations;
      }

      const { error: updateErr } = await supabase
        .from("organization_subscriptions")
        .update({
          plan_key: params.planKey,
          limit_exceeded: limitExceeded,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", params.organizationId);
      if (updateErr) throw updateErr;

      if (fromPlan !== params.planKey) {
        const { error: histErr } = await supabase
          .from("subscription_history")
          .insert({
            organization_id: params.organizationId,
            from_plan_key: fromPlan,
            to_plan_key: params.planKey,
            reason:
              params.reason ??
              (limitExceeded ? "downgrade_limit_exceeded" : "admin_assigned"),
            changed_by: userId,
            metadata: { limit_exceeded: limitExceeded },
          });
        if (histErr) throw histErr;
      }

      return { limitExceeded };
    } catch (error) {
      throw toPlanError(error);
    }
  },


  /** Append-only history read (support/audit foundation). */
  async getPlanHistory(organizationId: string): Promise<SubscriptionHistoryRow[]> {
    try {
      await resolveMembership(organizationId);
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("subscription_history")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SubscriptionHistoryRow[];
    } catch (error) {
      throw toPlanError(error);
    }
  },

  // --------------------------------------------------------------------------
  // Billing summary (minimum hooks for the future Settings rebuild)
  // --------------------------------------------------------------------------

  /** Everything the future Settings page will need, in one structured read. */
  async getBillingSummary(organizationId: string): Promise<BillingSummary> {
    try {
      const [subscription, entitlements, usage, plan] = await Promise.all([
        this.getBillingProfile(organizationId),
        this.getEntitlements(organizationId),
        this.getUsage(organizationId),
        this.getCurrentPlan(organizationId),
      ]);

      const limits = entitlements
        .filter((e) => e.key.startsWith("max_"))
        .map((e) => {
          const check = evaluateLimit({
            entitlement: e,
            currentUsage: usageOf(e.key as CountedKey, usage),
            requested: 0,
          });
          return {
            key: e.key,
            label: LIMIT_LABELS[e.key] ?? e.key,
            limitType: e.limit_type,
            value: check.limitValue,
            used: check.currentUsage,
            remaining: check.remaining,
          };
        });

      return { plan, subscription, entitlements, usage, limits };
    } catch (error) {
      throw toPlanError(error);
    }
  },
};

/** Maps a counted-limit key onto its DB-record usage figure. */
function usageOf(key: CountedKey, usage: UsageSnapshot): number {
  switch (key) {
    case "max_prospects":
      return usage.prospects;
    case "max_team_members":
      return usage.teamMembers;
    case "max_saved_lists":
      return usage.savedLists;
    case "max_active_automations":
      return usage.activeAutomations;
  }
}

