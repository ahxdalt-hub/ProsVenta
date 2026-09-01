// ============================================================================
// Prosventa Intelligence — Feature 4 Phase 2: Deterministic Engine Tests
// ============================================================================
import { describe, it, expect } from "vitest";
import {
  runDeterministicAnalysis,
  computeOverallPriority,
  detectConflicts,
  PRIORITY_DIMENSION_WEIGHTS,
} from "./deterministic";
import { validateAiIntelligenceOutput } from "./schema";
import { knownFact, unknownFact, type ReasoningInput } from "./context";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function icp(overrides?: Partial<{
  targetIndustries: string[];
  excludedIndustries: string[];
  minEmployees: number | null;
  maxEmployees: number | null;
  targetCountries: string[];
  targetJobTitles: string[];
}>): NonNullable<ReasoningInput["icp"]> {
  return {
    configurationId: "icp-1",
    name: "Mid-market SaaS",
    criteria: {
      company: {
        targetIndustries: overrides?.targetIndustries ?? ["Software"],
        excludedIndustries: overrides?.excludedIndustries ?? [],
        targetCompanySizes: [],
        minEmployees: overrides?.minEmployees ?? 11,
        maxEmployees: overrides?.maxEmployees ?? 500,
        targetCountries: overrides?.targetCountries ?? ["Germany"],
        targetCompanyTypes: [],
        targetTechnologies: [],
        targetBusinessModels: [],
      },
      prospect: {
        targetJobTitles: overrides?.targetJobTitles ?? ["VP Sales"],
        targetDepartments: [],
        targetSeniorityLevels: ["VP", "C-level"],
        targetLocations: [],
        excludedRoles: [],
      },
    },
  };
}

function baseInput(overrides?: {
  icp?: NonNullable<ReasoningInput["icp"]> | null;
}): ReasoningInput {
  return {
    organizationId: "org-a",
    subject: { scope: "prospect", prospectId: "p-1", companyKey: "acme.com", companyName: "Acme" },
    icp: overrides?.icp === undefined ? icp() : (overrides.icp ?? null),
    prospectFacts: [
      knownFact("prospect.name", "John Smith", "prospects", "p-1"),
      knownFact("prospect.job_title", "VP Sales", "prospect_enrichments", "p-1"),
    ],
    companyFacts: [
      knownFact("company.name", "Acme", "prospects", "p-1"),
      knownFact("company.industry", "Software", "prospects", "p-1"),
      knownFact("company.location", "Germany", "prospects", "p-1"),
      knownFact("company.employee_count", 120, "prospects", "p-1"),
      unknownFact("company.technologies"),
    ],
    enrichment: { hasCompanyEnrichment: true, hasProspectEnrichment: true, lastRetrievedAt: null, availableFields: [] },
    signals: [],
    historical: { priorInsightVersion: null, priorGeneratedAt: null, enrichmentLastRetrievedAt: null, activityCounts: {} },
    evidenceRefs: [
      { refType: "icp", tableName: "icp_configurations", recordId: "icp-1" },
      { refType: "prospect", tableName: "prospects", recordId: "p-1" },
      { refType: "enrichment", tableName: "prospect_enrichments", recordId: "p-1" },
    ],
    generatedAt: "2026-08-26T00:00:00Z",
  };
}

function withSignals(input: ReasoningInput, signals: ReasoningInput["signals"]): ReasoningInput {
  return {
    ...input,
    signals,
    evidenceRefs: [
      ...input.evidenceRefs,
      ...signals.map((s) => ({
        refType: "signal" as const,
        tableName: "signals",
        recordId: s.signalId,
      })),
    ],
  };
}

function signal(partial: Partial<ReasoningInput["signals"][number]> = {}): ReasoningInput["signals"][number] {
  return {
    signalId: partial.signalId ?? `s-${Math.random().toString(36).slice(2, 8)}`,
    signalType: "hiring_activity",
    title: "Signal",
    summary: null,
    status: "verified",
    importance: "high",
    confidence: "high",
    occurredAt: "2026-08-25T00:00:00Z",
    detectedAt: "2026-08-25T10:00:00Z",
    freshness: "recent",
    source: "greenhouse",
    sourceUrl: null,
    ...partial,
  };
}

const dims = (a: ReturnType<typeof runDeterministicAnalysis>) => a.output.dimensions;

// ---------------------------------------------------------------------------
// ICP fit
// ---------------------------------------------------------------------------

describe("ICP fit scoring", () => {
  it("Scenario A baseline: strong match produces a high fit and positive factors", () => {
    const result = runDeterministicAnalysis(baseInput());
    const fit = dims(result).icp_fit!;
    // industry 25 + location 20 + size 20 + role 20 + seniority 15 = 100
    expect(fit.score).toBe(100);
    expect(fit.status).toBe("match");
    expect(fit.positive_factors.length).toBeGreaterThanOrEqual(4);
  });

  it("Scenario C: poor ICP fit is a mismatch — activity does not erase it", () => {
    const input = baseInput({
      icp: icp({ targetIndustries: ["Healthcare"], targetCountries: ["Japan"] }),
    });
    // Known mismatches: retail industry + German location vs healthcare/Japan ICP.
    input.companyFacts = [
      knownFact("company.industry", "Retail", "prospects", "p-1"),
      knownFact("company.location", "Germany", "prospects", "p-1"),
      knownFact("company.employee_count", 120, "prospects", "p-1"),
    ];
    const result = runDeterministicAnalysis(
      withSignals(input, [signal({ signalType: "hiring_activity", title: "Hiring" })])
    );
    const fit = dims(result).icp_fit!;
    expect(fit.status).toBe("mismatch");
    expect(fit.negative_factors.length).toBe(2);
    // Even with recent signals present, fit stays poor.
    expect(fit.score!).toBeLessThanOrEqual(60);
    // And activity never lifts the fit itself:
    expect(dims(result).overall_priority!.score!).toBeLessThan(
      computeOverallPriority({ icp_fit: 100 }).score!
    );
  });

  it("Scenario D: unknown industry is UNKNOWN, never mismatch", () => {
    const input = baseInput();
    input.companyFacts = input.companyFacts.filter((f) => f.key !== "company.industry");
    const result = runDeterministicAnalysis(input);
    const fit = dims(result).icp_fit!;
    expect(fit.negative_factors.find((f) => f.id.startsWith("icp.industry"))).toBeUndefined();
    expect(fit.unknown_fields).toContain("company.industry");
    // Remaining evaluable factors all matched → still high, not penalized.
    expect(fit.score).toBe(100);
    expect(fit.summary).toContain("% of ICP criteria being evaluable");
  });

  it("negative factor: employee count far above the ICP range is explicit, not hidden (§8)", () => {
    const input = baseInput();
    input.companyFacts = input.companyFacts.map((f) =>
      f.key === "company.employee_count" ? knownFact("company.employee_count", 2500, "prospects", "p-1") : f
    );
    const result = runDeterministicAnalysis(input);
    const fit = dims(result).icp_fit!;
    const sizeNegative = fit.negative_factors.find((f) => f.id === "icp.size.mismatch");
    expect(sizeNegative).toBeDefined();
    expect(sizeNegative!.detail).toContain("2,500");
    // earned = industry+location+role+seniority = 80 / 100
    expect(fit.score).toBe(80);
    expect(result.output.concerns.some((c) => c.id.startsWith("icp.size"))).toBe(true);
  });

  it("no ICP configured → fit score stays null, nothing invented", () => {
    const result = runDeterministicAnalysis(baseInput({ icp: null }));
    expect(dims(result).icp_fit!.score).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Timing, recency & combinations
// ---------------------------------------------------------------------------

describe("timing & recency weighting", () => {
  it("recent strong signals raise timing; old weak signals do not", () => {
    const fresh = runDeterministicAnalysis(
      withSignals(baseInput(), [
        signal({ signalType: "leadership_change", title: "New VP Sales", importance: "critical" }),
        signal({ signalType: "hiring_activity", title: "Sales hiring", importance: "high" }),
      ])
    );
    const old = runDeterministicAnalysis(
      withSignals(baseInput(), [
        signal({ signalId: "old-1", freshness: "historical", importance: "low", title: "Old event" }),
      ])
    );
    expect(dims(fresh).timing!.score!).toBeGreaterThan(dims(old).timing!.score!);
    expect(dims(old).timing!.score!).toBeLessThan(30);
  });

  it("a recent but weak event stays low relevance (recency ≠ automatic priority)", () => {
    const result = runDeterministicAnalysis(
      withSignals(baseInput(), [signal({ importance: "low", title: "Minor blog mention" })])
    );
    expect(dims(result).timing!.score!).toBeLessThanOrEqual(45);
  });

  it("multiple aligned signals increase contextual relevance (§13)", () => {
    const single = runDeterministicAnalysis(
      withSignals(baseInput(), [signal({ signalType: "leadership_change", title: "New VP Sales" })])
    );
    const combined = runDeterministicAnalysis(
      withSignals(baseInput(), [
        signal({ signalId: "vp", signalType: "leadership_change", title: "New VP Sales" }),
        signal({ signalId: "hire", signalType: "hiring_activity", title: "8 sales roles open" }),
      ])
    );
    expect(dims(combined).business_relevance!.score!).toBeGreaterThan(
      dims(single).business_relevance!.score!
    );
    const comboFactor = dims(combined).business_relevance!.positive_factors.find((f) =>
      f.detail?.includes("may indicate")
    );
    expect(comboFactor).toBeDefined(); // cautious language, no causal proof
  });

  it("Prosventa activity signals never drive timing or relevance", () => {
    const result = runDeterministicAnalysis(
      withSignals(baseInput(), [signal({ signalType: "prospect_imported", title: "Imported" })])
    );
    expect(dims(result).business_relevance!.score).toBeNull();
    expect(dims(result).timing!.score).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Absence of evidence
// ---------------------------------------------------------------------------

describe("absence of evidence", () => {
  it("no signals → neutral timing, NO negative signal invented (§29–30)", () => {
    const result = runDeterministicAnalysis(baseInput());
    expect(dims(result).timing!.score).toBeNull();
    expect(dims(result).timing!.status).toBe("unknown");
    expect(result.output.explanation).toContain("No relevant verified signals were detected");
    for (const concern of result.output.concerns) {
      expect(concern.detail?.toLowerCase()).not.toContain("no buying activity");
    }
  });

  it("missing everything → dimension scores stay null, never fabricated", () => {
    const empty = baseInput({ icp: null });
    empty.companyFacts = [];
    empty.prospectFacts = [];
    const result = runDeterministicAnalysis(empty);
    expect(result.overallPriority.score).toBeNull();
    expect(dims(result).business_relevance!.score).toBeNull();
    expect(dims(result).evidence_strength!.score).toBeNull();
  });

  it("Scenario B: strong ICP match with no recent signals → good fit, unknown/neutral timing", () => {
    const result = runDeterministicAnalysis(baseInput());
    expect(dims(result).icp_fit!.score).toBe(100);
    expect(dims(result).timing!.score).toBeNull();
    // Not treated as a low-quality prospect: priority is driven by fit + evidence.
    expect(dims(result).overall_priority!.score!).toBeGreaterThanOrEqual(40);
  });
});

// ---------------------------------------------------------------------------
// Conflicting evidence & confidence
// ---------------------------------------------------------------------------

describe("conflicting evidence & confidence", () => {
  it("provider disagreement on employees reduces consistency/confidence (§28)", () => {
    const clean = baseInput();
    const conflicting = baseInput();
    conflicting.prospectFacts = [];
    conflicting.companyFacts.push(
      knownFact("company.employee_count", 1200, "company_enrichments", "prov-b")
    );

    const cleanResult = runDeterministicAnalysis(clean);
    const conflictResult = runDeterministicAnalysis(conflicting);

    expect(conflictResult.conflicts).toContain("company.employee_count");
    expect(conflictResult.confidence.components.consistency.value!).toBeLessThan(
      cleanResult.confidence.components.consistency.value!
    );
    expect(conflictResult.confidence.overall!).toBeLessThan(cleanResult.confidence.overall!);
    expect(
      dims(conflictResult).evidence_strength!.negative_factors.some((f) => f.id === "evidence.conflict")
    ).toBe(true);
  });

  it("confidence is independent of priority (§27)", () => {
    const input = baseInput({
      icp: icp({ targetIndustries: ["Mining"], minEmployees: 5000, maxEmployees: null }),
    });
    const result = runDeterministicAnalysis(withSignals(input, [signal()]));
    // Confidence reflects evidence quality; priority reflects the dimensions.
    expect(result.confidence.overall).not.toBeNull();
    expect(result.confidence.level).not.toBe("unknown");
    expect(result.overallPriority.score!).toBeLessThan(80);
    // The two are different concepts — verified signals keep confidence solid
    // even though this prospect is a clear ICP mismatch.
    expect(result.confidence.components.evidence_quality.value).toBe(100);
  });

  it("detectConflicts ignores restatements from the same record", () => {
    const input = baseInput();
    input.companyFacts.push(knownFact("company.employee_count", 120, "prospects", "p-1"));
    expect(detectConflicts(input)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Priority architecture & schema compliance
// ---------------------------------------------------------------------------

describe("overall priority & output contract", () => {
  it("priority derives transparently from documented weights (§26)", () => {
    const p = computeOverallPriority({ icp_fit: 100, business_relevance: 100, timing: 100, evidence_strength: 100 });
    expect(p.score).toBe(100);
    expect(p.category).toBe("very_high");
    const missing = computeOverallPriority({ icp_fit: 50 }); // others null → redistributed
    expect(missing.score).toBe(50);
    const none = computeOverallPriority({});
    expect(none.score).toBeNull();
    expect(Object.values(PRIORITY_DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("strong scenario produces high priority end-to-end with grounded factors (§48)", () => {
    const result = runDeterministicAnalysis(
      withSignals(baseInput(), [
        signal({ signalId: "vp", signalType: "leadership_change", title: "New VP Sales", importance: "critical" }),
        signal({ signalId: "hire", signalType: "hiring_activity", title: "Sales hiring up" }),
      ])
    );
    expect(dims(result).overall_priority!.score!).toBeGreaterThanOrEqual(70);
    expect(result.output.key_factors.length).toBeGreaterThan(0);
    // Every key factor cites real evidence.
    const validIds = new Set(["icp-1", "p-1", "vp", "hire"]);
    for (const factor of result.output.key_factors) {
      for (const g of factor.grounding ?? []) expect(validIds.has(g.refId)).toBe(true);
    }
  });

  it("output passes the strict Phase 1 schema validation (§20)", () => {
    const input = withSignals(baseInput(), [signal()]);
    const result = runDeterministicAnalysis(input);
    const validation = validateAiIntelligenceOutput(result.output, input);
    expect(validation.ok).toBe(true);
  });

  it("invalid AI-style output is rejected wholesale (§20)", () => {
    const input = withSignals(baseInput(), [signal()]);
    const bogus = {
      dimensions: {},
      key_factors: [
        { id: "x", label: "Invented", polarity: "positive", status: "match", grounding: [{ refId: "made-up-id" }] },
      ],
      concerns: [],
      explanation: null,
    };
    const validation = validateAiIntelligenceOutput(bogus, input);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.issues.some((i) => i.message.includes("unsupported citation"))).toBe(true);
    }
  });

  it("explanation stays concise (§45)", () => {
    const result = runDeterministicAnalysis(withSignals(baseInput(), [signal()]));
    expect(result.output.explanation!.split(". ").length).toBeLessThanOrEqual(6);
    expect(result.output.explanation).not.toContain("definitely needs");
  });
});




