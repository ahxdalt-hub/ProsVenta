import { describe, it, expect } from "vitest";
import {
  detectCandidates,
  detectPrioritizeCandidate,
  detectResearchCandidate,
  detectReviewSignalCandidates,
  detectRefreshEnrichmentCandidate,
  detectRefreshIntelligenceCandidate,
  detectReassessCandidate,
  detectEvidenceConflicts,
} from "./candidate-detection";
import {
  buildDecisionOutcome,
  computeConfidence,
  computePriorityDimensions,
  priorityFromScore,
  scoreCandidate,
  selectEvidence,
  MAX_EVIDENCE_ITEMS,
} from "./scoring";
import { confidenceFromScore } from "./types";
import type { DecisionContext, DecisionSignal } from "./types";
import {
  buildContextFingerprint,
  buildDedupeKey,
  findActiveDuplicate,
  isDismissalBlocking,
  shouldSupersedeExisting,
} from "./suppression";
import {
  containsUnsupportedClaims,
  shouldUseAi,
  validateAiExplanation,
} from "./ai-reasoning";
import {
  getRecommendationEngineMetrics,
  resetRecommendationEngineMetrics,
  recordGenerated,
} from "./observability";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * DAY).toISOString();

function ctx(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return {
    prospectId: "p1",
    organizationId: "org1",
    companyName: "Acme Corp",
    icpScore: null,
    icpScoredAt: null,
    hasCompanyEnrichment: false,
    hasProspectEnrichment: false,
    hasCompanyResearch: false,
    hasProspectResearch: false,
    companyEnrichmentUpdatedAt: null,
    prospectEnrichmentUpdatedAt: null,
    intelligenceUpdatedAt: null,
    signals: [],
    ...overrides,
  };
}

function signal(overrides: Partial<DecisionSignal> = {}): DecisionSignal {
  return {
    id: "sig-1",
    signal_type: "leadership_change",
    title: "New VP Sales joined",
    description: "Acme hired a new VP Sales.",
    detected_at: daysAgo(3),
    confidence: "high",
    importance: "high",
    category: "company_change",
    ...overrides,
  };
}

// ============================================================================
// Candidate detection
// ============================================================================

describe("candidate detection", () => {
  it("generates NO recommendation for an existing but plain prospect", () => {
    expect(detectCandidates(ctx({ icpScore: 60 }))).toEqual([]);
  });

  it("detects PRIORITIZE_PROSPECT for a strong prospect with aligned factors", () => {
    const candidates = detectCandidates(
      ctx({
        icpScore: 92,
        icpScoredAt: daysAgo(2),
        hasCompanyResearch: true,
        hasProspectEnrichment: true,
        companyResearchUpdatedAt: daysAgo(2),
        prospectEnrichmentUpdatedAt: daysAgo(2),
        signals: [signal()],
      })
    );
    expect(candidates.some((c) => c.type === "PRIORITIZE_PROSPECT")).toBe(true);
  });

  it("does NOT prioritize when only ICP is strong (no aligned factors)", () => {
    expect(detectPrioritizeCandidate(ctx({ icpScore: 95 }))).toBeNull();
  });

  it("detects RESEARCH_PROSPECT for promising fit with missing information", () => {
    const candidate = detectResearchCandidate(ctx({ icpScore: 78 }));
    expect(candidate).not.toBeNull();
    expect(candidate?.reasons[0]).toContain("missing");
  });

  it("treats missing data as research need — never as negative signal", () => {
    const text = JSON.stringify(detectResearchCandidate(ctx({ icpScore: 72 }))).toLowerCase();
    expect(text).not.toContain("poor fit");
    expect(text).not.toContain("bad fit");
  });

  it("detects REVIEW_SIGNAL for significant verified recent signals", () => {
    const candidates = detectReviewSignalCandidates(ctx({ signals: [signal()] }));
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates[0].type).toBe("REVIEW_SIGNAL");
  });

  it("ignores weak signals and prosventa activity", () => {
    const candidates = detectCandidates(
      ctx({
        signals: [
          signal({ importance: "low" }),
          signal({ id: "sig-x", category: "prosventa_activity", importance: "critical" }),
        ],
      })
    );
    expect(candidates.filter((c) => c.type === "REVIEW_SIGNAL")).toHaveLength(0);
  });

  it("detects REFRESH_ENRICHMENT only when IMPORTANT enrichment is stale", () => {
    const stale = detectRefreshEnrichmentCandidate(
      ctx({ hasCompanyEnrichment: true, companyEnrichmentUpdatedAt: daysAgo(200) })
    );
    expect(stale).not.toBeNull();
    expect(stale?.reasons.join(" ").toLowerCase()).toContain("why it matters");
    expect(
      detectRefreshEnrichmentCandidate(
        ctx({ hasCompanyEnrichment: true, companyEnrichmentUpdatedAt: daysAgo(10) })
      )
    ).toBeNull();
  });

  it("detects REFRESH_INTELLIGENCE only when stale AND evidence changed after", () => {
    const staleIntel = daysAgo(120);
    expect(
      detectRefreshIntelligenceCandidate(
        ctx({ intelligenceUpdatedAt: staleIntel, signals: [signal()] })
      )
    ).not.toBeNull();
    expect(detectRefreshIntelligenceCandidate(ctx({ intelligenceUpdatedAt: staleIntel }))).toBeNull();
    expect(
      detectRefreshIntelligenceCandidate(
        ctx({ intelligenceUpdatedAt: daysAgo(5), signals: [signal()] })
      )
    ).toBeNull();
  });

  it("detects REASSESS_PROSPECT on major established change + conflict", () => {
    const candidate = detectReassessCandidate(
      ctx({
        icpScore: 90,
        icpScoredAt: daysAgo(100),
        intelligenceUpdatedAt: daysAgo(100),
        signals: [
          signal({ id: "s-a", title: "Company hiring increased", description: "hiring expanded rapidly", detected_at: daysAgo(60) }),
          signal({ id: "s-b", signal_type: "workforce_change", title: "Reduced headcount", description: "layoffs reduced headcount", detected_at: daysAgo(50) }),
        ],
      })
    );
    expect(candidate?.type).toBe("REASSESS_PROSPECT");
  });

  it("handles conflicting signals explicitly instead of choosing silently", () => {
    const conflicts = detectEvidenceConflicts([
      signal({ id: "a", title: "Hiring increased", description: "expanding team" }),
      signal({ id: "b", title: "Layoffs announced", description: "reduced headcount" }),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].summary).toMatch(/different directions/i);
  });
});

// ============================================================================
// Priority & confidence engines
// ============================================================================

describe("priority engine", () => {
  it("maps scores to deterministic tiers", () => {
    expect(priorityFromScore(95)).toBe("very_high");
    expect(priorityFromScore(70)).toBe("high");
    expect(priorityFromScore(55)).toBe("medium");
    expect(priorityFromScore(40)).toBe("low");
    expect(priorityFromScore(10)).toBe("very_low");
  });

  it("computes dimensions from existing intelligence inputs only", () => {
    const dims = computePriorityDimensions(
      { type: "PRIORITIZE_PROSPECT", reasons: [], evidencePool: [], sourceSignalIds: ["sig-1"], benefitsFromAiExplanation: false },
      ctx({ icpScore: 92, signals: [signal()], hasCompanyResearch: true })
    );
    expect(dims.icpFit).toBe(92);
    expect(dims.signalImportance).toBeGreaterThan(0);
    expect(dims.businessRelevance).toBeGreaterThanOrEqual(70);
  });
});

describe("confidence engine", () => {
  const weakCandidate = {
    type: "PRIORITIZE_PROSPECT" as const,
    reasons: ["ICP score 94 is strong"],
    evidencePool: [
      { type: "icp_score" as const, label: "ICP fit: 94", detail: "", sourceId: null, retrievedAt: daysAgo(1) },
    ],
    sourceSignalIds: [] as string[],
    benefitsFromAiExplanation: false,
  };

  it("is independent of priority: high priority + lower confidence possible", () => {
    const dims = computePriorityDimensions(weakCandidate, ctx({ icpScore: 94 }));
    const { score } = computeConfidence(weakCandidate, dims, []);
    expect(score).toBeLessThan(85); // single item → not very_high confidence
    expect(priorityFromScore(90)).toBe("very_high"); // priority stays high
    expect(confidenceFromScore(score)).not.toBe("very_high");
  });

  it("lowers confidence explicitly under conflicting evidence", () => {
    const reassess = { ...weakCandidate, type: "REASSESS_PROSPECT" as const };
    const dims = computePriorityDimensions(reassess, ctx());
    const conflicted = computeConfidence(reassess, dims, [
      { summary: "conflict", evidenceA: null as never, evidenceB: null as never },
    ]);
    const clean = computeConfidence(reassess, dims, []);
    expect(conflicted.score).toBeLessThan(clean.score);
  });
});

// ============================================================================
// Evidence selection & ranking
// ============================================================================

describe("evidence selection", () => {
  it("attaches at most MAX_EVIDENCE_ITEMS strongest pieces", () => {
    const pool = Array.from({ length: 12 }, (_, i) => ({
      type: "signal" as const,
      label: `Signal ${i}`,
      detail: "",
      sourceId: `s${i}`,
      retrievedAt: daysAgo(i + 1),
    }));
    const selected = selectEvidence(
      { type: "REVIEW_SIGNAL", reasons: [], evidencePool: pool, sourceSignalIds: [], benefitsFromAiExplanation: false },
      { icpFit: 0, businessRelevance: 50, timing: 50, evidenceStrength: 50, freshness: 50, signalImportance: 0 }
    );
    expect(selected.length).toBeLessThanOrEqual(MAX_EVIDENCE_ITEMS);
  });

  it("prefers relevant evidence over random unrelated data", () => {
    const selected = selectEvidence(
      {
        type: "REVIEW_SIGNAL",
        reasons: [],
        sourceSignalIds: ["sig"],
        benefitsFromAiExplanation: false,
        evidencePool: [
          { type: "signal", label: "New VP Sales", detail: "", sourceId: "sig", retrievedAt: daysAgo(2) },
          { type: "enrichment", label: "Country: DE", detail: "", sourceId: null, retrievedAt: daysAgo(2) },
        ],
      },
      { icpFit: 0, businessRelevance: 50, timing: 50, evidenceStrength: 50, freshness: 50, signalImportance: 0 }
    );
    expect(selected[0].evidence.label).toBe("New VP Sales");
  });

  it("ranks candidates and selects exactly ONE primary", () => {
    const outcome = buildDecisionOutcome([
      scoreCandidate(
        { type: "REFRESH_ENRICHMENT", reasons: ["Outdated: company enrichment"], evidencePool: [{ type: "data_quality", label: "stale", detail: "", sourceId: null, retrievedAt: daysAgo(200) }], sourceSignalIds: [], benefitsFromAiExplanation: false },
        ctx({})
      ),
      scoreCandidate(
        {
          type: "REVIEW_SIGNAL",
          reasons: ["high-importance leadership_change: New VP Sales"],
          evidencePool: [{ type: "signal", label: "New VP Sales", detail: "", sourceId: "sig", retrievedAt: daysAgo(2) }],
          sourceSignalIds: ["sig"],
          benefitsFromAiExplanation: false,
        },
        ctx({ signals: [signal()] })
      ),
    ]);
    expect(outcome.primary?.type).toBe("REVIEW_SIGNAL");
  });

  it("supports the no-recommendation state as valid output", () => {
    const outcome = buildDecisionOutcome([]);
    expect(outcome.primary).toBeNull();
    expect(outcome.noRecommendation?.reason).toMatch(/no actionable recommendation/i);
  });

  it("keeps explanations concise and cautious", () => {
    const scored = scoreCandidate(
      {
        type: "PRIORITIZE_PROSPECT",
        reasons: ["ICP score 92 is strong", "recent signal: New VP Sales"],
        evidencePool: [{ type: "icp_score", label: "ICP fit: 92", detail: "", sourceId: null, retrievedAt: daysAgo(1) }],
        sourceSignalIds: [],
        benefitsFromAiExplanation: false,
      },
      ctx({ icpScore: 92 })
    );
    expect(scored.explanation.length).toBeLessThan(300);
    expect(scored.explanation.toLowerCase()).toContain("prioritize");
    expect(scored.explanation).not.toMatch(/contact immediately|guaranteed|will buy/i);
  });

  it("documents priority adjustment when evidence conflicts (§32)", () => {
    const scored = scoreCandidate(
      {
        type: "PRIORITIZE_PROSPECT",
        reasons: ["ICP score 86 is strong"],
        evidencePool: [{ type: "icp_score", label: "ICP fit: 86", detail: "", sourceId: null, retrievedAt: daysAgo(200) }],
        sourceSignalIds: [],
        benefitsFromAiExplanation: false,
        conflicts: [{ summary: "signals differ", evidenceA: null as never, evidenceB: null as never }],
      },
      ctx({ icpScore: 86 })
    );
    expect(scored.adjustmentNote).toBeTruthy();
  });
});

// ============================================================================
// Suppression / dismissal / superseding
// ============================================================================

describe("suppression & lifecycle helpers", () => {
  const fingerprint = (icp = 88) =>
    buildContextFingerprint({
      candidateType: "REVIEW_SIGNAL",
      sourceSignalIds: ["sig-1"],
      intelligenceUpdatedAt: daysAgo(2),
      icpScore: icp,
      enrichmentBucket: "fresh",
    });

  it("builds stable dedupe keys; small ICP drift keeps the same fingerprint", () => {
    expect(buildDedupeKey("REVIEW_SIGNAL", fingerprint())).toBe(`REVIEW_SIGNAL:${fingerprint()}`);
    expect(fingerprint(89)).toBe(fingerprint(88)); // same 5-point band
  });

  it("finds active duplicates only among new/viewed rows", () => {
    const rows = [
      { id: "1", dedupe_key: fingerprint(), status: "dismissed" },
      { id: "2", dedupe_key: fingerprint(), status: "viewed" },
      { id: "3", dedupe_key: fingerprint(), status: "expired" },
    ];
    expect(findActiveDuplicate(rows as never, fingerprint())?.id).toBe("2");
    expect(findActiveDuplicate(rows as never, "other-key")).toBeNull();
  });

  it("blocks regeneration after dismissal until context materially changes or time passes", () => {
    const dismissed = { status: "dismissed", dismissed_at: daysAgo(2) };
    expect(isDismissalBlocking(dismissed, { fingerprintChanged: false })).toBe(true);
    expect(isDismissalBlocking(dismissed, { fingerprintChanged: true })).toBe(false);

    const oldDismissal = { status: "dismissed", dismissed_at: daysAgo(45) };
    expect(isDismissalBlocking(oldDismissal, { fingerprintChanged: false })).toBe(false);
  });

  it("supersedes only materially-changed active recommendations", () => {
    expect(
      shouldSupersedeExisting({ id: "1", status: "viewed" } as never, "fp-new", "fp-old")
    ).toBe(true);
    expect(
      shouldSupersedeExisting({ id: "1", status: "viewed" } as never, "fp-old", "fp-old")
    ).toBe(false);
    expect(
      shouldSupersedeExisting({ id: "1", status: "accepted" } as never, "fp-new", "fp-old")
    ).toBe(false);
  });
});
