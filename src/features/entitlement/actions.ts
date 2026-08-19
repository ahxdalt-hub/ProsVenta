// ============================================================================
// Prosventa Feature Entitlement — Server Actions
// Stage 5 — Feature Access, Plan Entitlements & Curiosity-Driven Upgrade UX
// ============================================================================
// Server actions exposed to the UI. These are READ-ONLY for display purposes.
// Actual authorization always happens via `resolveServerEntitlement` inside
// the intelligence server actions — never via these display helpers.
// ============================================================================

"use server";

import type { FeatureId, EntitlementState } from "./types";
import {
  getServerEntitlementContext,
  getCreditBalanceForDisplay,
} from "./server";
import { resolveFeatureEntitlement } from "./resolver";

/**
 * Returns the display-ready entitlement state for a feature.
 * READ-ONLY — used to render preview states and upgrade prompts.
 */
export async function getFeatureEntitlementForDisplay(
  featureId: FeatureId
): Promise<EntitlementState | null> {
  const resolved = await getServerEntitlementContext();
  if (!resolved.ok) return null;
  return resolveFeatureEntitlement(featureId, resolved.context);
}

/**
 * Returns entitlement states for multiple features at once.
 * Used by the sidebar/navigation to render premium indicators.
 */
export async function getFeatureEntitlementsForDisplay(
  featureIds: FeatureId[]
): Promise<Partial<Record<FeatureId, EntitlementState>>> {
  const resolved = await getServerEntitlementContext();
  if (!resolved.ok) return {};

  const result: Partial<Record<FeatureId, EntitlementState>> = {};
  for (const id of featureIds) {
    result[id] = resolveFeatureEntitlement(id, resolved.context);
  }
  return result;
}

/**
 * Returns the current user's plan and credit balance for display.
 */
export async function getEntitlementSummaryForDisplay(): Promise<{
  plan: string;
  creditBalance: number;
} | null> {
  const resolved = await getServerEntitlementContext();
  if (!resolved.ok) return null;
  return {
    plan: resolved.context.plan,
    creditBalance: resolved.context.creditBalance,
  };
}

export { getCreditBalanceForDisplay };