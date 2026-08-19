// ============================================================================
// Prosventa Feature Entitlement — Resolver
// Stage 5 — Feature Access, Plan Entitlements & Curiosity-Driven Upgrade UX
// ============================================================================
// Pure, deterministic entitlement resolution. Given a feature and an
// entitlement context (plan, credits), returns the resolved access state.
//
// This is the SINGLE place where plan/credit checks are implemented.
// UI components and server actions call this — never inline `if (plan === X)`.
// ============================================================================

import type {
  AccessLevel,
  EntitlementContext,
  EntitlementState,
  FeatureId,
} from "./types";
import { FEATURES, isPlanAtLeast, getRecommendedUpgrade } from "./features";

// ============================================================================
// Entitlement Resolution
// ============================================================================

export function resolveFeatureEntitlement(
  featureId: FeatureId,
  context: EntitlementContext
): EntitlementState {
  const feature = FEATURES[featureId];

  if (!feature) {
    return {
      featureId,
      access: "plan_required",
      requiredPlan: null,
      currentPlan: context.plan,
      requiresCredits: false,
      creditCost: 0,
      creditBalance: context.creditBalance,
      canExecute: false,
      canPreview: true,
      recommendedUpgrade: null,
      reason: "This feature is not yet available.",
    };
  }

  const hasPlan = isPlanAtLeast(context.plan, feature.requiredPlan);
  const recommendedUpgrade = getRecommendedUpgrade(context.plan, feature.requiredPlan);

  // ---- Plan check ----------------------------------------------------------
  if (!hasPlan) {
    // User does not meet the plan requirement.
    return {
      featureId,
      access: "plan_required",
      requiredPlan: feature.requiredPlan,
      currentPlan: context.plan,
      requiresCredits: feature.requiresCredits,
      creditCost: feature.creditCost,
      creditBalance: context.creditBalance,
      canExecute: false,
      canPreview: feature.previewable,
      recommendedUpgrade,
      reason: feature.previewable
        ? `Available on ${formatPlanName(feature.requiredPlan)}. Explore the preview to see what it provides.`
        : `Available on ${formatPlanName(feature.requiredPlan)}.`,
    };
  }

  // ---- Credit check --------------------------------------------------------
  if (feature.requiresCredits && feature.creditCost > 0) {
    const hasEnoughCredits = context.creditBalance >= feature.creditCost;

    if (!hasEnoughCredits) {
      return {
        featureId,
        access: "insufficient_credits",
        requiredPlan: feature.requiredPlan,
        currentPlan: context.plan,
        requiresCredits: true,
        creditCost: feature.creditCost,
        creditBalance: context.creditBalance,
        canExecute: false,
        canPreview: true,
        recommendedUpgrade: null,
        reason: `This action requires ${feature.creditCost} credit${feature.creditCost === 1 ? "" : "s"}. Your balance is ${context.creditBalance}.`,
      };
    }

    return {
      featureId,
      access: "credit_required",
      requiredPlan: feature.requiredPlan,
      currentPlan: context.plan,
      requiresCredits: true,
      creditCost: feature.creditCost,
      creditBalance: context.creditBalance,
      canExecute: true,
      canPreview: true,
      recommendedUpgrade: null,
      reason: `This action consumes ${feature.creditCost} credit${feature.creditCost === 1 ? "" : "s"}. You have enough to proceed.`,
    };
  }

  // ---- Fully available -----------------------------------------------------
  return {
    featureId,
    access: "available",
    requiredPlan: feature.requiredPlan,
    currentPlan: context.plan,
    requiresCredits: false,
    creditCost: 0,
    creditBalance: context.creditBalance,
    canExecute: true,
    canPreview: true,
    recommendedUpgrade: null,
    reason: "This feature is available on your current plan.",
  };
}

// ============================================================================
// Convenience Helpers
// ============================================================================

export function canExecuteFeature(
  featureId: FeatureId,
  context: EntitlementContext
): boolean {
  return resolveFeatureEntitlement(featureId, context).canExecute;
}

export function getFeatureAccess(
  featureId: FeatureId,
  context: EntitlementContext
): AccessLevel {
  return resolveFeatureEntitlement(featureId, context).access;
}

// ============================================================================
// Plan Name Helper
// ============================================================================

function formatPlanName(plan: string): string {
  const names: Record<string, string> = {
    free: "Starter",
    pro: "Pro",
    business: "Business",
    enterprise: "Enterprise",
  };
  return names[plan] ?? plan;
}

export { formatPlanName };