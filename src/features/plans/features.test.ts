// ============================================================================
// Prosventa Plans & Entitlements — Feature Access Catalog Tests
// ============================================================================
// Covers the centralized feature catalog added for the Settings monetization
// stage: tier model, inheritance, and the three access states
// (included / locked / unavailable). Pure logic — no DB, no mocks.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  FEATURE_CATALOG,
  TIER_LABELS,
  getFeatureAccess,
  getTierFeatureMatrix,
  resolveTierFeatures,
  tierMeets,
} from "./features";

describe("feature catalog integrity", () => {
  it("covers every FeatureId exactly once with a consistent definition", () => {
    const ids = Object.keys(FEATURE_CATALOG);
    for (const id of ids) {
      const def = FEATURE_CATALOG[id as keyof typeof FEATURE_CATALOG];
      expect(def.id).toBe(id);
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
    }
  });

  it("tier labels come from the central pricing config, not duplicated", () => {
    expect(TIER_LABELS.free).toBe("Free");
    expect(TIER_LABELS.starter).toBe("Starter");
    expect(TIER_LABELS.growth).toBe("Growth");
    expect(TIER_LABELS.pro).toBe("Pro");
    expect(TIER_LABELS.business).toBe("Business");
  });
});

describe("tier inheritance", () => {
  it("resolves strictly increasing feature sets down the chain", () => {
    const free = resolveTierFeatures("free");
    const starter = resolveTierFeatures("starter");
    const growth = resolveTierFeatures("growth");
    const pro = resolveTierFeatures("pro");
    const business = resolveTierFeatures("business");

    expect(free.length).toBeLessThan(starter.length);
    expect(starter.length).toBeLessThan(growth.length);
    expect(growth.length).toBeLessThan(pro.length);
    expect(pro.length).toBeLessThan(business.length);

    for (const f of free) expect(starter).toContain(f);
    for (const f of starter) expect(growth).toContain(f);
    for (const f of growth) expect(pro).toContain(f);
    for (const f of pro) expect(business).toContain(f);
  });

  it("business tier includes every implemented feature", () => {
    const business = new Set(resolveTierFeatures("business"));
    for (const def of Object.values(FEATURE_CATALOG)) {
      if (def.implemented) expect(business.has(def.id)).toBe(true);
    }
  });

  it("tierMeets is rank-based and inclusive", () => {
    expect(tierMeets("free", "free")).toBe(true);
    expect(tierMeets("starter", "free")).toBe(true);
    expect(tierMeets("free", "starter")).toBe(false);
    expect(tierMeets("business", "pro")).toBe(true);
  });
});

describe("getFeatureAccess — three states", () => {
  it("included: plan covers the feature", () => {
    const access = getFeatureAccess("starter", "company_enrichment");
    expect(access.state).toBe("included");
    expect(access.requiredTier).toBeNull();
  });

  it("locked: feature exists but belongs to a higher tier, with tier label", () => {
    const access = getFeatureAccess("starter", "workflow_builder");
    expect(access.state).toBe("locked");
    expect(access.requiredTier).toBe("growth");
    expect(access.requiredTierLabel).toBe("Growth");
  });

  it("locked inheritance: a free user sees starter features as Starter-locked", () => {
    const access = getFeatureAccess("free", "icp_scoring");
    expect(access.state).toBe("locked");
    expect(access.requiredTierLabel).toBe("Starter");
  });

  it("unavailable: unimplemented features never render as locked or included", () => {
    const access = getFeatureAccess("business", "api_access");
    expect(access.state).toBe("unavailable");
    expect(access.requiredTier).toBeNull();
    // Even the top tier cannot unlock an unimplemented feature.
    expect(getFeatureAccess("business", "custom_integrations").state).toBe("unavailable");
  });
});

describe("getTierFeatureMatrix", () => {
  it("returns one entry per catalog feature", () => {
    expect(getTierFeatureMatrix("free")).toHaveLength(
      Object.keys(FEATURE_CATALOG).length
    );
  });
});
