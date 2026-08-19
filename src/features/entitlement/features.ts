// ============================================================================
// Prosventa Feature Entitlement — Feature Definitions
// Stage 5 — Feature Access, Plan Entitlements & Curiosity-Driven Upgrade UX
// ============================================================================
// Centralized feature definitions. This is the single source of truth for
// what each feature requires. NOT final commercial limits — configurable.
// ============================================================================

import type { FeatureDefinition, FeatureId, PlanDefinition } from "./types";
import type { SubscriptionPlan } from "@/types/database";

// ============================================================================
// Feature Definitions
// ============================================================================

export const FEATURES: Record<FeatureId, FeatureDefinition> = {
  dashboard: {
    id: "dashboard",
    name: "Dashboard",
    description: "Your workspace overview and key metrics.",
    requiredPlan: "free",
    requiresCredits: false,
    creditCost: 0,
    previewable: false,
    navGroup: "Main",
  },
  prospects: {
    id: "prospects",
    name: "Prospects",
    description: "Manage and organize your prospect pipeline.",
    requiredPlan: "free",
    requiresCredits: false,
    creditCost: 0,
    previewable: false,
    navGroup: "Main",
  },
  prospect_search: {
    id: "prospect_search",
    name: "Prospect Search",
    description: "Search and discover new prospects.",
    requiredPlan: "free",
    requiresCredits: false,
    creditCost: 0,
    previewable: false,
    navGroup: "Main",
  },
  saved_lists: {
    id: "saved_lists",
    name: "Saved Lists",
    description: "Organize prospects into reusable lists.",
    requiredPlan: "free",
    requiresCredits: false,
    creditCost: 0,
    previewable: false,
    navGroup: "Main",
  },
  company_enrichment: {
    id: "company_enrichment",
    name: "Company Enrichment",
    description: "Discover industry, size, technology and business signals for any company.",
    requiredPlan: "pro",
    requiresCredits: true,
    creditCost: 2,
    previewable: true,
    navGroup: "Intelligence",
    badgeLabel: "PRO",
  },
  prospect_enrichment: {
    id: "prospect_enrichment",
    name: "Prospect Enrichment",
    description: "Find professional contact details and role information.",
    requiredPlan: "pro",
    requiresCredits: true,
    creditCost: 1,
    previewable: true,
    navGroup: "Intelligence",
    badgeLabel: "PRO",
  },
  company_research: {
    id: "company_research",
    name: "Company Research",
    description: "Get a deep research brief on any company.",
    requiredPlan: "pro",
    requiresCredits: true,
    creditCost: 4,
    previewable: true,
    navGroup: "Intelligence",
    badgeLabel: "PRO",
  },
  prospect_research: {
    id: "prospect_research",
    name: "Prospect Research",
    description: "Research a specific contact or decision maker.",
    requiredPlan: "pro",
    requiresCredits: true,
    creditCost: 3,
    previewable: true,
    navGroup: "Intelligence",
    badgeLabel: "PRO",
  },
  icp_scoring: {
    id: "icp_scoring",
    name: "ICP Scoring",
    description: "Score prospects against your Ideal Customer Profile.",
    requiredPlan: "pro",
    requiresCredits: true,
    creditCost: 1,
    previewable: true,
    navGroup: "Intelligence",
    badgeLabel: "PRO",
  },
  intent_signals: {
    id: "intent_signals",
    name: "Intent Signals",
    description: "Detect buying intent and engagement signals.",
    requiredPlan: "pro",
    requiresCredits: true,
    creditCost: 2,
    previewable: true,
    navGroup: "Intelligence",
    badgeLabel: "PRO",
  },
  ai_recommendations: {
    id: "ai_recommendations",
    name: "AI Recommendations",
    description: "Get evidence-based next-best-action recommendations.",
    requiredPlan: "pro",
    requiresCredits: true,
    creditCost: 1,
    previewable: true,
    navGroup: "Intelligence",
    badgeLabel: "PRO",
  },
  automation: {
    id: "automation",
    name: "Automation",
    description: "Automate repetitive sales workflows.",
    requiredPlan: "pro",
    requiresCredits: false,
    creditCost: 0,
    previewable: true,
    navGroup: "Automation",
    badgeLabel: "PRO",
  },
  workflows: {
    id: "workflows",
    name: "Workflows",
    description: "Build multi-step automation workflows.",
    requiredPlan: "business",
    requiresCredits: false,
    creditCost: 0,
    previewable: true,
    navGroup: "Automation",
    badgeLabel: "BUSINESS",
  },
  team_collaboration: {
    id: "team_collaboration",
    name: "Team Collaboration",
    description: "Invite team members and collaborate on prospects.",
    requiredPlan: "business",
    requiresCredits: false,
    creditCost: 0,
    previewable: true,
    navGroup: "Team",
    badgeLabel: "BUSINESS",
  },
  advanced_analytics: {
    id: "advanced_analytics",
    name: "Advanced Analytics",
    description: "Deep pipeline analytics and reporting.",
    requiredPlan: "business",
    requiresCredits: false,
    creditCost: 0,
    previewable: true,
    navGroup: "Analytics",
    badgeLabel: "BUSINESS",
  },
  import: {
    id: "import",
    name: "Import",
    description: "Import prospects from CSV or other sources.",
    requiredPlan: "free",
    requiresCredits: false,
    creditCost: 0,
    previewable: false,
    navGroup: "Main",
  },
  export: {
    id: "export",
    name: "Export",
    description: "Export your prospect data.",
    requiredPlan: "free",
    requiresCredits: false,
    creditCost: 0,
    previewable: false,
    navGroup: "Main",
  },
};

// ============================================================================
// Plan Definitions
// ============================================================================
// NOT final commercial limits. Configurable foundation for future Stripe.
// ============================================================================

export const PLANS: Record<SubscriptionPlan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Starter",
    description: "For individuals exploring prospect discovery",
    monthlyCredits: 0,
    includesTeam: false,
    includesAdvancedAutomation: false,
    includesAdvancedAnalytics: false,
    features: [
      "dashboard",
      "prospects",
      "prospect_search",
      "saved_lists",
      "import",
      "export",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For growing teams that need serious pipeline",
    monthlyCredits: 100,
    includesTeam: false,
    includesAdvancedAutomation: false,
    includesAdvancedAnalytics: false,
    features: [
      "dashboard",
      "prospects",
      "prospect_search",
      "saved_lists",
      "import",
      "export",
      "company_enrichment",
      "prospect_enrichment",
      "company_research",
      "prospect_research",
      "icp_scoring",
      "intent_signals",
      "ai_recommendations",
      "automation",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    description: "For organizations scaling outbound motion",
    monthlyCredits: 500,
    includesTeam: true,
    includesAdvancedAutomation: true,
    includesAdvancedAnalytics: true,
    features: [
      "dashboard",
      "prospects",
      "prospect_search",
      "saved_lists",
      "import",
      "export",
      "company_enrichment",
      "prospect_enrichment",
      "company_research",
      "prospect_research",
      "icp_scoring",
      "intent_signals",
      "ai_recommendations",
      "automation",
      "workflows",
      "team_collaboration",
      "advanced_analytics",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with custom needs",
    monthlyCredits: 2000,
    includesTeam: true,
    includesAdvancedAutomation: true,
    includesAdvancedAnalytics: true,
    features: [
      "dashboard",
      "prospects",
      "prospect_search",
      "saved_lists",
      "import",
      "export",
      "company_enrichment",
      "prospect_enrichment",
      "company_research",
      "prospect_research",
      "icp_scoring",
      "intent_signals",
      "ai_recommendations",
      "automation",
      "workflows",
      "team_collaboration",
      "advanced_analytics",
    ],
  },
};

// ============================================================================
// Plan Hierarchy
// ============================================================================
// Used to determine if one plan is "higher" than another.
// ============================================================================

export const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  pro: 1,
  business: 2,
  enterprise: 3,
};

export function planRank(plan: SubscriptionPlan): number {
  return PLAN_RANK[plan] ?? 0;
}

export function isPlanAtLeast(plan: SubscriptionPlan, required: SubscriptionPlan): boolean {
  return planRank(plan) >= planRank(required);
}

export function getRecommendedUpgrade(
  current: SubscriptionPlan,
  required: SubscriptionPlan
): SubscriptionPlan | null {
  if (isPlanAtLeast(current, required)) return null;
  // Recommend the next plan up that satisfies the requirement.
  const order: SubscriptionPlan[] = ["free", "pro", "business", "enterprise"];
  for (const candidate of order) {
    if (isPlanAtLeast(candidate, required) && planRank(candidate) > planRank(current)) {
      return candidate;
    }
  }
  return null;
}