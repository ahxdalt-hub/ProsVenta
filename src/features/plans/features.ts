// ============================================================================
// Prosventa Plans & Entitlements — Feature Access Catalog
// ============================================================================
// ONE centralized, client-safe source of truth for plan-based FEATURE access.
//
// Design rules:
//   - Commercial tier names/prices/credits are NOT duplicated here — they come
//     from ./pricing (PUBLIC_PLANS + BUSINESS_PLAN). This module only maps
//     stable FEATURE ids to the minimum commercial tier that includes them.
//   - Three access states (see getFeatureAccess):
//       included    → plan covers the feature → accessible
//       locked      → feature exists, belongs to a higher tier → visible but
//                     not executable (UI cue only, NEVER the security boundary)
//       unavailable → feature is not implemented in the product yet → must not
//                     be advertised as an active capability
//   - Plan entitlement (can you use the feature?) and credit balance (can you
//     afford the operation?) are separate concerns. This module knows nothing
//     about balances. Credit checks live in features/credits (computePreflight
//     + CreditService), server-side.
//   - Inheritance is expressed once via PLAN_INHERITS; the resolved feature set
//     of a tier always includes everything from lower tiers.
//   - Server-side enforcement stays in ./service (EntitlementService,
//     server-only) backed by public.plans / plan_entitlements. This module is
//     presentation/orchestration support — never the authority.
// ============================================================================

import { PUBLIC_PLANS, BUSINESS_PLAN } from "./pricing";

// ----------------------------------------------------------------------------
// Commercial tiers
// ----------------------------------------------------------------------------
// Stable identifiers for the approved commercial tiers. These intentionally do
// NOT reuse the legacy SubscriptionPlan DB keys (free/pro/business/enterprise),
// whose names no longer match the approved tier names (Starter/Growth/Pro).
// Mapping to legacy keys is centralized in LEGACY_PLAN_KEY below.
// ----------------------------------------------------------------------------

export type CommercialTier = "free" | "starter" | "growth" | "pro" | "business";

/** Lowest → highest tier order. Used for "is included" and upgrade recommendations. */
export const TIER_ORDER: readonly CommercialTier[] = [
  "free",
  "starter",
  "growth",
  "pro",
  "business",
] as const;

export function tierRank(tier: CommercialTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function tierMeets(current: CommercialTier, required: CommercialTier): boolean {
  return tierRank(current) >= tierRank(required);
}

/** Human tier labels, sourced from the central pricing config (no duplication). */
export const TIER_LABELS: Record<CommercialTier, string> = {
  free: PUBLIC_PLANS.free.name, // "Free"
  starter: PUBLIC_PLANS.pro.name, // "Starter"
  growth: PUBLIC_PLANS.business.name, // "Growth"
  pro: PUBLIC_PLANS.enterprise.name, // "Pro"
  business: BUSINESS_PLAN.name, // "Business"
};

/** Legacy SubscriptionPlan key (DB organization_subscriptions.plan_key) per tier. */
export const LEGACY_PLAN_KEY: Record<
  CommercialTier,
  "free" | "pro" | "business" | "enterprise"
> = {
  free: "free",
  starter: "pro",
  growth: "business",
  pro: "enterprise",
  business: "enterprise", // Business is custom/Contact Sales; DB key stays enterprise
};

// ----------------------------------------------------------------------------
// Feature catalog
// ----------------------------------------------------------------------------
// Stable internal feature ids. `implemented: false` = the product does not
// currently support it — such features render as Unavailable, never as an
// active capability or an upgrade target.
// ----------------------------------------------------------------------------

export type FeatureId =
  // Free
  | "prospect_search"
  | "saved_lists"
  | "csv_import_export"
  | "workspace_organization"
  // Starter
  | "company_enrichment"
  | "prospect_enrichment"
  | "company_research"
  | "prospect_research"
  | "icp_scoring"
  | "intent_signals"
  | "ai_recommendations"
  | "basic_automation"
  // Growth
  | "team_collaboration"
  | "advanced_automation"
  | "advanced_analytics"
  | "workflow_builder"
  | "priority_support"
  // Pro
  | "advanced_team_features"
  | "custom_integrations"
  | "dedicated_onboarding"
  | "enhanced_security"
  // Business
  | "custom_credit_packages"
  | "dedicated_account_manager"
  | "custom_sla_support"
  | "api_access"
  | "advanced_security_features";

export interface FeatureDefinition {
  id: FeatureId;
  /** Display name used by Settings UI. */
  name: string;
  /** Minimum commercial tier that includes the feature (inheritance applies). */
  minTier: CommercialTier;
  /**
   * Whether Prosventa actually implements the capability today.
   * false → getFeatureAccess returns "unavailable" regardless of plan.
   */
  implemented: boolean;
  /** Short description for comparison/locked UX. */
  description: string;
}

export const FEATURE_CATALOG: Readonly<Record<FeatureId, FeatureDefinition>> = {
  // ---- Free ----
  prospect_search: {
    id: "prospect_search",
    name: "Prospect search and discovery",
    minTier: "free",
    implemented: true,
    description: "Search and discover new prospects.",
  },
  saved_lists: {
    id: "saved_lists",
    name: "Saved lists",
    minTier: "free",
    implemented: true,
    description: "Organize prospects into reusable lists.",
  },
  csv_import_export: {
    id: "csv_import_export",
    name: "CSV import and export",
    minTier: "free",
    implemented: true,
    description: "Import prospects from CSV and export your pipeline.",
  },
  workspace_organization: {
    id: "workspace_organization",
    name: "Basic workspace organization",
    minTier: "free",
    implemented: true,
    description: "Organize work in a dedicated workspace.",
  },

  // ---- Starter ----
  company_enrichment: {
    id: "company_enrichment",
    name: "Company enrichment",
    minTier: "starter",
    implemented: true,
    description: "Discover industry, size, technology and business signals for any company.",
  },
  prospect_enrichment: {
    id: "prospect_enrichment",
    name: "Prospect enrichment",
    minTier: "starter",
    implemented: true,
    description: "Find professional contact details and role information.",
  },
  company_research: {
    id: "company_research",
    name: "Company research",
    minTier: "starter",
    implemented: true,
    description: "Get a deep research brief on any company.",
  },
  prospect_research: {
    id: "prospect_research",
    name: "Prospect research",
    minTier: "starter",
    implemented: true,
    description: "Research a specific contact or decision maker.",
  },
  icp_scoring: {
    id: "icp_scoring",
    name: "ICP scoring",
    minTier: "starter",
    implemented: true,
    description: "Score prospects against your Ideal Customer Profile.",
  },
  intent_signals: {
    id: "intent_signals",
    name: "Intent signals",
    minTier: "starter",
    implemented: true,
    description: "See buying-intent signals for your prospects.",
  },
  ai_recommendations: {
    id: "ai_recommendations",
    name: "AI recommendations",
    minTier: "starter",
    implemented: true,
    description: "Get AI-driven next-best-action recommendations.",
  },
  basic_automation: {
    id: "basic_automation",
    name: "Basic automation",
    minTier: "starter",
    implemented: true,
    description: "Automate routine prospecting work.",
  },

  // ---- Growth ----
  team_collaboration: {
    id: "team_collaboration",
    name: "Team collaboration",
    minTier: "growth",
    implemented: true,
    description: "Work together on prospects with comments and shared lists.",
  },
  advanced_automation: {
    id: "advanced_automation",
    name: "Advanced automation",
    minTier: "growth",
    implemented: true,
    description: "Multi-step automation with provider-backed actions.",
  },
  advanced_analytics: {
    id: "advanced_analytics",
    name: "Advanced analytics",
    minTier: "growth",
    // No dedicated advanced-analytics implementation is verified today.
    implemented: false,
    description: "Deeper reporting across pipeline and usage.",
  },
  workflow_builder: {
    id: "workflow_builder",
    name: "Workflow builder",
    minTier: "growth",
    implemented: true,
    description: "Build multi-step prospecting workflows.",
  },
  priority_support: {
    id: "priority_support",
    name: "Priority support",
    minTier: "growth",
    // A support channel exists, but no tier-differentiated priority queue.
    implemented: false,
    description: "Faster responses from the support team.",
  },

  // ---- Pro ----
  advanced_team_features: {
    id: "advanced_team_features",
    name: "Advanced team features",
    minTier: "pro",
    // Roles and invitations exist; tier-specific "advanced" team tooling does not.
    implemented: false,
    description: "Advanced roles, permissions and team controls.",
  },
  custom_integrations: {
    id: "custom_integrations",
    name: "Custom integrations",
    minTier: "pro",
    implemented: false,
    description: "Connect Prosventa with your own tools.",
  },
  dedicated_onboarding: {
    id: "dedicated_onboarding",
    name: "Dedicated onboarding",
    minTier: "pro",
    implemented: false,
    description: "Guided onboarding for your organization.",
  },
  enhanced_security: {
    id: "enhanced_security",
    name: "Enhanced security",
    minTier: "pro",
    // Security settings exist for everyone; tier-gated enhancements do not.
    implemented: false,
    description: "Additional account and workspace security controls.",
  },

  // ---- Business ----
  custom_credit_packages: {
    id: "custom_credit_packages",
    name: "Custom credit packages",
    minTier: "business",
    // Only the fixed approved catalog exists (see credit_packages table).
    implemented: false,
    description: "Tailored credit packages for your volume.",
  },
  dedicated_account_manager: {
    id: "dedicated_account_manager",
    name: "Dedicated account manager",
    minTier: "business",
    implemented: false,
    description: "A named contact for your organization.",
  },
  custom_sla_support: {
    id: "custom_sla_support",
    name: "Custom SLA and support",
    minTier: "business",
    implemented: false,
    description: "Contractual support guarantees.",
  },
  api_access: {
    id: "api_access",
    name: "API access",
    minTier: "business",
    // No API-key infrastructure exists (Settings › API is intentionally disabled).
    implemented: false,
    description: "Programmatic access to Prosventa.",
  },
  advanced_security_features: {
    id: "advanced_security_features",
    name: "Advanced security features",
    minTier: "business",
    implemented: false,
    description: "Organization-wide security controls and audit support.",
  },
};

// ----------------------------------------------------------------------------
// Plan inheritance
// ----------------------------------------------------------------------------

/** Growth = Starter + Growth, etc. Expressed once, resolved everywhere. */
export const PLAN_INHERITS: Readonly<Record<CommercialTier, CommercialTier | null>> = {
  free: null,
  starter: "free",
  growth: "starter",
  pro: "growth",
  business: "pro",
};

/** Full resolved feature set for a tier, including everything it inherits. */
export function resolveTierFeatures(tier: CommercialTier): FeatureId[] {
  const features: FeatureId[] = [];
  let current: CommercialTier | null = tier;
  // Walk from the requested tier downwards so higher-tier entries come first.
  while (current !== null) {
    for (const def of Object.values(FEATURE_CATALOG)) {
      if (def.minTier === current) features.push(def.id);
    }
    current = PLAN_INHERITS[current];
  }
  return features;
}

// ----------------------------------------------------------------------------
// Access states
// ----------------------------------------------------------------------------

export type FeatureAccessState = "included" | "locked" | "unavailable";

export interface FeatureAccess {
  featureId: FeatureId;
  state: FeatureAccessState;
  /** Tier label to show on a locked feature (e.g. "Growth"). Null otherwise. */
  requiredTierLabel: string | null;
  /** Stable tier id for upgrade routing. Null when included/unavailable. */
  requiredTier: CommercialTier | null;
  definition: FeatureDefinition;
}

/**
 * The single client-side decision point for plan-based feature access.
 *
 *   included    → plan covers the feature
 *   locked      → feature exists, owned by a higher tier (UI cue only —
 *                 server-side EntitlementService remains authoritative)
 *   unavailable → not implemented in the product; never shown as active
 */
export function getFeatureAccess(
  currentTier: CommercialTier,
  featureId: FeatureId
): FeatureAccess {
  const definition = FEATURE_CATALOG[featureId];
  if (!definition.implemented) {
    return {
      featureId,
      state: "unavailable",
      requiredTierLabel: null,
      requiredTier: null,
      definition,
    };
  }
  if (tierMeets(currentTier, definition.minTier)) {
    return {
      featureId,
      state: "included",
      requiredTierLabel: null,
      requiredTier: null,
      definition,
    };
  }
  return {
    featureId,
    state: "locked",
    requiredTierLabel: TIER_LABELS[definition.minTier],
    requiredTier: definition.minTier,
    definition,
  };
}

/** Resolved access for every catalog feature — the shape Plan & Billing renders. */
export function getTierFeatureMatrix(currentTier: CommercialTier): FeatureAccess[] {
  return (Object.keys(FEATURE_CATALOG) as FeatureId[]).map((id) =>
    getFeatureAccess(currentTier, id)
  );
}

