// ============================================================================
// Prosventa Feature Entitlement — Server Guard
// Stage 5 — Feature Access, Plan Entitlements & Curiosity-Driven Upgrade UX
// ============================================================================
// Server-side authorization boundary. Server actions MUST go through this
// guard before calling any expensive/external provider.
//
// Flow:
//   auth → organization → entitlement check → credit check → confirm action
//   → EXTERNAL PROVIDER → result → deduct credits
//
// Clients can never bypass this by editing JavaScript, local storage, or
// calling server actions directly — the plan and credit balance are resolved
// server-side from the database.
// ============================================================================

"use server";

import { createClient } from "@/lib/supabase/server";
import type { SubscriptionPlan } from "@/types/database";
import type { FeatureId, EntitlementContext, EntitlementState } from "./types";
import { resolveFeatureEntitlement } from "./resolver";

// ============================================================================
// Server-Side Entitlement Result
// ============================================================================

export type ServerEntitlementSuccess = {
  ok: true;
  context: EntitlementContext;
  orgId: string;
  userId: string;
};

export type ServerEntitlementFailure = {
  ok: false;
  error: "AUTHENTICATION_FAILED" | "NO_ORGANIZATION" | "ENTITLEMENT_FAILED";
  state?: EntitlementState;
  reason?: string;
};

export type ServerEntitlementResult = ServerEntitlementSuccess | ServerEntitlementFailure;

// ============================================================================
// Context Resolution
// ============================================================================

/**
 * Resolves the full entitlement context server-side.
 * - Authenticates the user.
 * - Resolves their organization membership.
 * - Reads the authoritative plan from the organizations table.
 * - Reads the authoritative credit balance via SECURITY DEFINER RPC.
 *
 * NEVER trusts client-supplied plan/credit values.
 */
export async function getServerEntitlementContext(): Promise<
  | { ok: true; context: EntitlementContext; orgId: string; userId: string }
  | { ok: false; error: "AUTHENTICATION_FAILED" | "NO_ORGANIZATION" }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "AUTHENTICATION_FAILED" };
  }

  // Resolve organization membership server-side (RLS protects this).
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { ok: false, error: "NO_ORGANIZATION" };
  }

  // Read the authoritative plan from the organizations table.
  const { data: org } = await supabase
    .from("organizations")
    .select("subscription_plan")
    .eq("id", membership.organization_id)
    .single();

  const plan = (org?.subscription_plan ?? "free") as SubscriptionPlan;

  // Read the authoritative credit balance via SECURITY DEFINER RPC.
  const { data: balance } = await supabase.rpc("get_org_credit_balance", {
    p_org_id: membership.organization_id,
  });

  // Ensure the balance row exists (creates it with plan-appropriate allowance).
  if (balance === null || balance === undefined) {
    const monthlyAllowance =
      plan === "free" ? 0 : plan === "pro" ? 100 : plan === "business" ? 500 : 2000;
    await supabase.rpc("ensure_org_credit_balance", {
      p_org_id: membership.organization_id,
      p_monthly_allowance: monthlyAllowance,
    });
  }

  // Re-read the balance after ensuring the row exists.
  const { data: ensuredBalance } = await supabase.rpc("get_org_credit_balance", {
    p_org_id: membership.organization_id,
  });

  return {
    ok: true,
    orgId: membership.organization_id,
    userId: user.id,
    context: {
      plan,
      creditBalance:
        typeof ensuredBalance === "number" ? ensuredBalance : balance ?? 0,
      organizationId: membership.organization_id,
      role: membership.role ?? "member",
    },
  };
}

// ============================================================================
// Authorization Guard
// ============================================================================

/**
 * Resolves whether a user can execute a feature.
 * Server-side authoritative check — never trust the client.
 */
export async function resolveServerEntitlement(
  featureId: FeatureId
): Promise<ServerEntitlementResult> {
  const resolved = await getServerEntitlementContext();

  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const state = resolveFeatureEntitlement(featureId, resolved.context);

  if (!state.canExecute) {
    return {
      ok: false,
      error: "ENTITLEMENT_FAILED",
      state,
      reason: state.reason,
    };
  }

  return {
    ok: true,
    context: resolved.context,
    orgId: resolved.orgId,
    userId: resolved.userId,
  };
}

// ============================================================================
// Credit Operations
// ============================================================================

/**
 * Deducts credits atomically after a successful operation.
 * This is the counterpart to the credit check — called AFTER the provider
 * returns successfully, so credits are only consumed on success.
 */
export async function deductCreditsForFeature(
  orgId: string,
  userId: string,
  featureId: FeatureId,
  amount: number,
  description: string
): Promise<boolean> {
  if (amount <= 0) return true;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("deduct_credits", {
    p_org_id: orgId,
    p_user_id: userId,
    p_feature_id: featureId,
    p_amount: amount,
    p_description: description,
  });
  return !error && data === 1;
}

/**
 * Returns the current credit balance for the authenticated user's org.
 * Used for UI display (read-only).
 */
export async function getCreditBalanceForDisplay(): Promise<number> {
  const resolved = await getServerEntitlementContext();
  if (!resolved.ok) return 0;
  return resolved.context.creditBalance;
}

/**
 * Adds credits (top-up / adjustment). Intended for admin/test use and
 * future billing integration — NOT exposed to normal user flows.
 */
export async function addCreditsForFeature(
  orgId: string,
  userId: string,
  featureId: FeatureId,
  amount: number,
  description: string
): Promise<boolean> {
  if (amount === 0) return true;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_credits", {
    p_org_id: orgId,
    p_user_id: userId,
    p_feature_id: featureId,
    p_amount: amount,
    p_description: description,
  });
  return !error && data === 1;
}