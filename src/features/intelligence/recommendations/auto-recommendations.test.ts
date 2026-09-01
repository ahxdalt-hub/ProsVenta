// ============================================================================
// Prosventa Automatic Recommendations — Tests
// Stage 5 — Task 5: Automatic Recommendations Engine
// ============================================================================
// Practical tests for the deterministic recommendation engine, validation,
// and deduplication used by the automatic recommendation flow.
//
// Run: npx tsx src/features/intelligence/recommendations/auto-recommendations.test.ts
//
// These tests exercise the PURE parts of the flow (engine rules, validation,
// dedupe keys, trigger threshold). Database-backed parts (insert, dedupe
// constraint, RLS) are covered by migration constraints:
//   - UNIQUE (organization_id, dedupe_key) prevents duplicate storage.
//   - RLS policies scope every read/write to the member's organization.
// ============================================================================

import { generateRecommendations } from "./engine";
import {
  validateAndFilterRecommendations,
  buildRecommendationDedupeKey,
  validateRecommendationInput,
} from "./validate";
import { RECOMMENDATION_TRIGGER_SCORE } from "./auto-recommendations";
import type { RecommendationContext } from "./types";

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name}`);
  }
}

function summary() {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

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

function signal(overrides: Partial<RecommendationContext["signals"][number]> = {}) {
  return {
    id: "sig-1",
    signal_type: "funding",
    title: "Funding round",
    description: "Raised a Series A.",
    detected_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    confidence: "high",
    importance: "high",
    category: "company_change",
    ...overrides,
  };
}

// ============================================================================
// Test A — High-fit prospect
// ============================================================================

function testHighFit() {
  console.log("\nTest A — High-fit prospect");

  const ctx = { ...emptyContext(), icpScore: 90 };
  const recs = generateRecommendations(ctx);
  const highFit = recs.find((r) => r.recommendation_type === "review_high_fit");
  assert("generates review_high_fit for score >= 75", !!highFit);
  assert("high fit (>= 85) gets high priority", highFit?.priority === "high");
  assert(
    "reasoning references configured ICP criteria",
    !!highFit && highFit.reasoning.includes("configured ICP")
  );
  assert(
    "evidence includes the stored ICP score",
    !!highFit && highFit.evidence.some((e) => e.type === "icp_score")
  );

  const midRecs = generateRecommendations({ ...emptyContext(), icpScore: 78 });
  const midFit = midRecs.find((r) => r.recommendation_type === "review_high_fit");
  assert("strong fit (75-84) still generates review_high_fit", !!midFit);
  assert("strong fit (75-84) gets medium priority", midFit?.priority === "medium");

  const sigRecs = generateRecommendations({ ...emptyContext(), icpScore: 90, signals: [signal()] });
  assert(
    "high fit + recent signal produces signal-based review",
    sigRecs.some((r) => r.recommendation_type === "review_company_signal")
  );
}

// ============================================================================
// Test B — Low-fit prospect
// ============================================================================

function testLowFit() {
  console.log("\nTest B — Low-fit prospect");

  const ctx = { ...emptyContext(), icpScore: 30, hasCompanyResearch: true, hasProspectResearch: true };
  const recs = generateRecommendations(ctx);

  assert("no review_high_fit for weak fit", !recs.some((r) => r.recommendation_type === "review_high_fit"));
  assert("no high-priority recommendations for weak fit", !recs.some((r) => r.priority === "high"));
  assert("no fabricated recommendations for weak quiet prospect", recs.length === 0);

  const sigRecs = generateRecommendations({ ...emptyContext(), icpScore: 30, signals: [signal()] });
  const review = sigRecs.find((r) => r.recommendation_type === "review_company_signal");
  assert("low fit + signal gets low priority only", review?.priority === "low");
}

// ============================================================================
// Test C — Missing data
// ============================================================================

function testMissingData() {
  console.log("\nTest C — Missing data");

  const recs = generateRecommendations({ ...emptyContext(), icpScore: 80, domain: "acme.com" });
  const companyRec = recs.find((r) => r.recommendation_type === "research_company");
  assert("missing company research generates research_company", !!companyRec);
  assert(
    "research_company is evidence-based (no fabricated facts)",
    !!companyRec && companyRec.evidence.some((e) => e.label.includes("No company research"))
  );
  assert(
    "enrichment opportunity is medium for strong fit (not inflated to high)",
    !!companyRec && companyRec.priority === "medium"
  );

  assert(
    "no research_company without a domain",
    !generateRecommendations({ ...emptyContext(), icpScore: 80 }).some(
      (r) => r.recommendation_type === "research_company"
    )
  );

  const contactRecs = generateRecommendations({ ...emptyContext(), icpScore: 80, contactName: "Jane Doe" });
  assert(
    "known contact without research generates research_prospect",
    contactRecs.some((r) => r.recommendation_type === "research_prospect")
  );

  assert(
    "no research_prospect without any contact information",
    !generateRecommendations({ ...emptyContext(), icpScore: 80 }).some(
      (r) => r.recommendation_type === "research_prospect"
    )
  );
}


// ============================================================================
// Test D — Re-scoring / duplicate prevention
// ============================================================================

function testDuplicatePrevention() {
  console.log("\nTest D — Duplicate prevention");

  const ctx = { ...emptyContext(), icpScore: 88 };
  const run1 = generateRecommendations(ctx);
  const run2 = generateRecommendations(ctx);

  assert(
    "engine output is deterministic across runs",
    JSON.stringify(run1.map((r) => r.dedupe_key)) === JSON.stringify(run2.map((r) => r.dedupe_key))
  );
  assert("every recommendation has a non-empty dedupe_key", run1.every((r) => r.dedupe_key.trim().length > 0));

  const highFit = run1.find((r) => r.recommendation_type === "review_high_fit")!;
  assert(
    "dedupe key matches independent construction",
    highFit.dedupe_key === buildRecommendationDedupeKey("review_high_fit")
  );
  assert(
    "signal dedupe key is order-independent",
    buildRecommendationDedupeKey("review_recent_signal", ["b", "a"]) ===
      buildRecommendationDedupeKey("review_recent_signal", ["a", "b"])
  );
  assert(
    "different recommendation types get different keys",
    buildRecommendationDedupeKey("research_company") !== buildRecommendationDedupeKey("research_prospect")
  );

  // Keys must not embed the org id — org scoping happens in SQL via
  // UNIQUE (organization_id, dedupe_key), so the same key works per org.
  const otherOrg = generateRecommendations({ ...ctx, organizationId: "org2" });
  assert(
    "dedupe keys do not vary by organization",
    JSON.stringify(otherOrg.map((r) => r.dedupe_key)) === JSON.stringify(run1.map((r) => r.dedupe_key))
  );
}

// ============================================================================
// Test E — Validation gate (no malformed/fabricated recommendations)
// ============================================================================

function testValidation() {
  console.log("\nTest E — Validation gate");

  const contexts: RecommendationContext[] = [
    { ...emptyContext(), icpScore: 92 },
    { ...emptyContext(), icpScore: 76, domain: "acme.com", contactName: "Jane Doe" },
    { ...emptyContext(), icpScore: 20, signals: [signal({ importance: "critical", category: "external_event" })] },
  ];
  for (const ctx of contexts) {
    const raw = generateRecommendations(ctx);
    const valid = validateAndFilterRecommendations(raw);
    assert(`all engine output valid (${raw.length} recs)`, raw.length === valid.length);
  }

  const baseEvidence = [{ type: "icp_score" as const, label: "l", detail: "d", sourceId: null, retrievedAt: null }];

  assert(
    "rejects unknown type",
    validateRecommendationInput({
      recommendation_type: "made_up_type" as never,
      title: "t", summary: "s", reasoning: "r",
      evidence: baseEvidence,
      priority: "low", confidence: 50, dedupe_key: "k",
    }).some((e) => e.field === "recommendation_type")
  );
  assert(
    "rejects missing evidence",
    validateRecommendationInput({
      recommendation_type: "review_high_fit",
      title: "t", summary: "s", reasoning: "r",
      evidence: [],
      priority: "high", confidence: 50, dedupe_key: "k",
    }).some((e) => e.field === "evidence")
  );
  assert(
    "rejects out-of-range confidence",
    validateRecommendationInput({
      recommendation_type: "review_high_fit",
      title: "t", summary: "s", reasoning: "r",
      evidence: baseEvidence,
      priority: "high", confidence: 200, dedupe_key: "k",
    }).some((e) => e.field === "confidence")
  );
}

// ============================================================================
// Test F — Trigger threshold consistency
// ============================================================================

function testTriggerThreshold() {
  console.log("\nTest F — Trigger threshold");

  assert("auto trigger threshold aligns with engine strong fit (75)", RECOMMENDATION_TRIGGER_SCORE === 75);

  const belowThreshold = generateRecommendations({
    ...emptyContext(),
    icpScore: RECOMMENDATION_TRIGGER_SCORE - 10,
  });
  assert(
    "below-threshold prospects receive no high-priority recommendations",
    !belowThreshold.some((r) => r.priority === "high")
  );
}

// ============================================================================
// Run
// ============================================================================

testHighFit();
testLowFit();
testMissingData();
testDuplicatePrevention();
testValidation();
testTriggerThreshold();
summary();

