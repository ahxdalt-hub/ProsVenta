// ============================================================================
// Prosventa Recommendations — Feature 5 Phase 1 Foundation Tests
// ============================================================================
// Vitest suite for the PURE parts of the recommendation foundation:
// lifecycle/freshness/expiration, deterministic ranking, validation,
// status transitions and deduplication keys.
//
// Database-backed behavior (RLS, UNIQUE dedupe constraint) is covered by the
// migration constraints themselves.
// ============================================================================

import { describe, it, expect } from "vitest";
import { generateRecommendations } from "./engine";
import {
  validateAndFilterRecommendations,
  buildRecommendationDedupeKey,
  validateRecommendationInput,
} from "./validate";
import {
  buildSupersedeUpdate,
  computeExpiresAt,
  computeFreshness,
  computeRankingScore,
  isExpired,
  isFreshnessAtLeast,
  rankRecommendations,
} from "./lifecycle";
import {
  canTransitionStatus,
  RECOMMENDATION_TYPE_CATEGORIES,
  RECOMMENDATION_TYPES,
} from "./types";
import type { RecommendationContext } from "./types";

const DAY = 24 * 60 * 60 * 1000;

function emptyContext(): RecommendationContext {
  return {
    prospectId: "p1",
    organizationId: "org1",
    companyName: "Acme",
    domain: null,
    contactName: null,
    contactEmail: null,
    jobTitle: null,
    icpScore: null,
    hasCompanyEnrichment: false,
    hasProspectEnrichment: false,
    hasCompanyResearch: false,
    hasProspectResearch: false,
    signals: [],
    companyEnrichmentUpdatedAt: null,
    prospectEnrichmentUpdatedAt: null,
    companyResearchUpdatedAt: null,
    prospectResearchUpdatedAt: null,
  };
}

describe("recommendation lifecycle — freshness", () => {
  it("classifies recent evidence as fresh", () => {
    expect(computeFreshness(new Date(Date.now() - 2 * DAY).toISOString())).toBe("fresh");
  });

  it("classifies aging, stale and expired evidence", () => {
    expect(computeFreshness(new Date(Date.now() - 15 * DAY).toISOString())).toBe("aging");
    expect(computeFreshness(new Date(Date.now() - 60 * DAY).toISOString())).toBe("stale");
    expect(computeFreshness(new Date(Date.now() - 120 * DAY).toISOString())).toBe("expired");
  });

  it("treats unknown evidence age as stale, never fresh", () => {
    expect(computeFreshness(null)).toBe("stale");
    expect(computeFreshness(undefined)).toBe("stale");
    expect(computeFreshness("not-a-date")).toBe("stale");
  });

  it("compares freshness with a threshold ordering", () => {
    expect(isFreshnessAtLeast("fresh", "aging")).toBe(true);
    expect(isFreshnessAtLeast("stale", "fresh")).toBe(false);
  });
});

describe("recommendation lifecycle — expiration", () => {
  it("expires signal recommendations faster than priority ones", () => {
    const now = new Date().toISOString();
    const signalExpiry = computeExpiresAt("review_recent_signal", { createdAt: now });
    const priorityExpiry = computeExpiresAt("review_high_fit", { createdAt: now });
    expect(signalExpiry).not.toBeNull();
    expect(priorityExpiry).not.toBeNull();
    expect(new Date(signalExpiry!).getTime()).toBeLessThan(
      new Date(priorityExpiry!).getTime()
    );
  });

  it("honours an explicit expiry override", () => {
    const custom = "2099-01-01T00:00:00.000Z";
    expect(computeExpiresAt("review_recent_signal", { expiresAtOverride: custom })).toBe(custom);
  });

  it("detects passed expiry deterministically (no AI)", () => {
    expect(isExpired({ expires_at: new Date(Date.now() - DAY).toISOString() })).toBe(true);
    expect(isExpired({ expires_at: new Date(Date.now() + DAY).toISOString() })).toBe(false);
    expect(isExpired({ expires_at: null })).toBe(false);
  });
});

describe("recommendation lifecycle — status transitions", () => {
  it("allows new → viewed → accepted/dismissed", () => {
    expect(canTransitionStatus("new", "viewed")).toBe(true);
    expect(canTransitionStatus("viewed", "accepted")).toBe(true);
    expect(canTransitionStatus("viewed", "dismissed")).toBe(true);
  });

  it("forbids illegal transitions", () => {
    expect(canTransitionStatus("new", "new")).toBe(false);
    expect(canTransitionStatus("dismissed", "accepted")).toBe(false);
    expect(canTransitionStatus("expired", "viewed")).toBe(false);
  });
});

describe("recommendation ranking", () => {
  const base = {
    confidence: 50,
    intelligence_updated_at: new Date(Date.now() - DAY).toISOString(),
  };

  it("ranks higher priority above lower priority regardless of creation time", () => {
    const high = { ...base, priority: "high" as const };
    const low = { ...base, priority: "low" as const };
    expect(computeRankingScore(high)).toBeGreaterThan(computeRankingScore(low));
  });

  it("keeps priority and confidence separate but both contributing", () => {
    const highPriorityLowConfidence = {
      priority: "high" as const,
      confidence: 20,
      evidence: [],
      intelligence_updated_at: null as string | null,
    };
    const lowPriorityHighConfidence = {
      priority: "low" as const,
      confidence: 90,
      evidence: [],
      intelligence_updated_at: null as string | null,
    };
    // Priority dominates, but strong confidence closes part of the gap.
    expect(
      computeRankingScore(highPriorityLowConfidence)
    ).toBeGreaterThan(computeRankingScore(lowPriorityHighConfidence));
    expect(
      computeRankingScore(lowPriorityHighConfidence)
    ).toBeGreaterThan(computeRankingScore({ ...lowPriorityHighConfidence, confidence: 10 }));
  });

  it("boosts fresher evidence", () => {
    const fresh = { ...base, priority: "medium" as const };
    const stale = {
      ...base,
      priority: "medium" as const,
      intelligence_updated_at: new Date(Date.now() - 120 * DAY).toISOString(),
    };
    expect(computeRankingScore(fresh)).toBeGreaterThan(computeRankingScore(stale));
  });

  it("sorts by score, not creation time", () => {
    const olderButImportant = {
      id: "old",
      created_at: new Date(Date.now() - 30 * DAY).toISOString(),
      priority: "very_high" as const,
      confidence: 80,
    };
    const newerButMinor = {
      id: "new",
      created_at: new Date().toISOString(),
      priority: "very_low" as const,
      confidence: 30,
    };
    const ranked = rankRecommendations([newerButMinor, olderButImportant]);
    expect(ranked[0].id).toBe("old");
  });
});

describe("recommendation invalidation", () => {
  it("builds a supersede update that preserves history via pointer", () => {
    const update = buildSupersedeUpdate("rec-new");
    expect(update.status).toBe("superseded");
    expect(update.superseded_by_id).toBe("rec-new");
  });
});

describe("taxonomy — controlled categories", () => {
  it("maps every recommendation type to a category", () => {
    for (const type of RECOMMENDATION_TYPES) {
      expect(RECOMMENDATION_TYPE_CATEGORIES[type]).toBeDefined();
    }
  });
});

describe("validation & deduplication", () => {
  function validInput() {
    return {
      recommendation_type: "review_high_fit" as const,
      title: "Prioritize Acme",
      summary: "Strong ICP alignment.",
      reasoning: "Strong ICP fit plus recent sales hiring.",
      evidence: [
        {
          type: "icp_score" as const,
          label: "ICP score: 91",
          detail: "Matches 91% of ICP criteria.",
          sourceId: null,
          retrievedAt: null,
        },
      ],
      priority: "high" as const,
      confidence: 70,
      dedupe_key: "review_high_fit",
    };
  }

  it("accepts a fully grounded recommendation", () => {
    expect(validateRecommendationInput(validInput())).toHaveLength(0);
    expect(validateAndFilterRecommendations([validInput()])).toHaveLength(1);
  });

  it("rejects recommendations without evidence or with malformed evidence", () => {
    const noEvidence = { ...validInput(), evidence: [] };
    expect(validateRecommendationInput(noEvidence).length).toBeGreaterThan(0);

    const badEvidence = {
      ...validInput(),
      evidence: [
        { type: "signal" as const, label: "", detail: "", sourceId: null, retrievedAt: null },
      ],
    };
    expect(validateRecommendationInput(badEvidence).length).toBeGreaterThan(0);
  });

  it("rejects unknown types, priorities, sources and out-of-range confidence", () => {
    const bad = validInput() as Record<string, unknown>;
    bad.recommendation_type = "send_email_now";
    bad.priority = "ultra";
    bad.source_type = "magic";
    bad.confidence = 150;
    expect(validateRecommendationInput(bad as never).length).toBeGreaterThanOrEqual(4);
  });

  it("builds stable dedupe keys regardless of source ordering", () => {
    const a = buildRecommendationDedupeKey("review_company_signal", ["s1", "s2"], [], null);
    const b = buildRecommendationDedupeKey("review_company_signal", ["s2", "s1"], [], null);
    expect(a).toBe(b);
  });

  it("produces identical keys for identical logical recommendations", () => {
    const a = generateRecommendations({ ...emptyContext(), icpScore: 90 });
    const b = generateRecommendations({ ...emptyContext(), icpScore: 90 });
    expect(a.map((r) => r.dedupe_key)).toEqual(b.map((r) => r.dedupe_key));
  });
});

describe("deterministic engine rules (AI-free)", () => {
  it("generates prioritize-type recommendation only for sufficient ICP fit", () => {
    const recs = generateRecommendations({ ...emptyContext(), icpScore: 90 });
    const prioritize = recs.find((r) => r.recommendation_type === "review_high_fit");
    expect(prioritize).toBeDefined();
    expect(prioritize!.priority === "high").toBe(true);
    expect(prioritize!.evidence.length).toBeGreaterThan(0);
  });

  it("does not claim certainty in explanations", () => {
    const recs = generateRecommendations({ ...emptyContext(), icpScore: 90 });
    for (const rec of recs) {
      expect(/will definitely|guaranteed/i.test(rec.reasoning)).toBe(false);
    }
  });
});
