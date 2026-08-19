// ============================================================================
// Prosventa Feature Entitlement — Types
// Stage 5 — Feature Access, Plan Entitlements & Curiosity-Driven Upgrade UX
// ============================================================================

import type { SubscriptionPlan } from "@/types/database";

// ============================================================================
// Feature Identifiers
// ============================================================================

export type FeatureId =
  | "dashboard"
  | "prospects"
  | "prospect_search"
  | "saved_lists"
  | "company_enrichment"
  | "prospect_enrichment"
  | "company_research"
  | "prospect_research"
  | "icp_scoring"
  | "intent_signals"
  | "ai_recommendations"
  | "automation"
  | "workflows"
  | "team_collaboration"
  | "advanced_analytics"
  | "import"
  | "export";

// ============================================================================
// Access Levels
// ============================================================================

export type AccessLevel =
  | "available"
  | "preview"
  | "credit_required"
  | "plan_required"
  | "insufficient_credits";

// ============================================================================
// Entitlement State
// ============================================================================

export interface EntitlementState {
  featureId: FeatureId;
  access: AccessLevel;
  requiredPlan: SubscriptionPlan | null;
  currentPlan: SubscriptionPlan;
  requiresCredits: boolean;
  creditCost: number;
  creditBalance: number;
  canExecute: boolean;
  canPreview: boolean;
  recommendedUpgrade: SubscriptionPlan | null;
  reason: string;
}

// ============================================================================
// Feature Definition
// ============================================================================

export interface FeatureDefinition {
  id: FeatureId;
  name: string;
  description: string;
  requiredPlan: SubscriptionPlan;
  requiresCredits: boolean;
  creditCost: number;
  previewable: boolean;
  navGroup?: string;
  badgeLabel?: string;
}

// ============================================================================
// Plan Definition
// ============================================================================

export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  description: string;
  monthlyCredits: number;
  includesTeam: boolean;
  includesAdvancedAutomation: boolean;
  includesAdvancedAnalytics: boolean;
  features: FeatureId[];
}

// ============================================================================
// Credit Transaction
// ============================================================================

export type CreditTransactionType = "deduction" | "topup" | "refund" | "adjustment";

export interface CreditTransaction {
  id: string;
  organization_id: string;
  user_id: string;
  feature_id: FeatureId;
  amount: number;
  type: CreditTransactionType;
  description: string;
  created_at: string;
}

// ============================================================================
// Entitlement Context
// ============================================================================

export interface EntitlementContext {
  plan: SubscriptionPlan;
  creditBalance: number;
  organizationId: string;
  role: string;
}