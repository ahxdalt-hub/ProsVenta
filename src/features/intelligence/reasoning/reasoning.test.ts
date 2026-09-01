// ============================================================================
// Prosventa Intelligence — Feature 4 Phase 1 Regression Tests
// ============================================================================
import { describe, it, expect } from "vitest";
import {
  INTELLIGENCE_STATUSES,
  ACTIVE_INTELLIGENCE_STATUSES,
  createUnknownConfidence,
  EVIDENCE_REF_TYPES,
} from "./types";
import {
  knownFact,
  unknownFact,
  isFactKnown,
  computeReasoningInputDigest,
  type ReasoningInput,
} from "./context";
import { validateAiIntelligenceOutput } from "./schema";
import {
  ReasoningEngineError,
  reasoningModelRegistry,
  runIntelligenceEngine,
  type ReasoningModelProvider,
} from "./engine";
import { canReuseIntelligence, evaluateStaleness } from "./invalidation";
import { buildSubjectFacts, toReasoningSignals } from "./collect";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ICP = {
  configurationId: "icp-1",
  name: "Mid-market SaaS",
  criteria: {
    company: {
      targetIndustries: ["Software"],
      excludedIndustries: [],
      targetCompanySizes: ["11-50"],
      minEmployees: 11,
      maxEmployees: 500,
      targetCountries: ["Germany"],
      targetCompanyTypes: [],
      targetTechnologies: [],
      targetBusinessModels: [],
    },
    prospect: {
      targetJobTitles: ["VP Sales"],
      targetDepartments: [],
      targetSeniorityLevels: [],
      targetLocations: [],
      excludedRoles: [],
    },
  },
};

function baseInput(): ReasoningInput {
  return {
    organizationId: "org-a",
    subject: { scope: "prospect", prospectId: "p-1", companyKey: "acme.com", companyName: "Acme" },
    icp: ICP,
    prospectFacts: [knownFact("prospect.name", "John Smith", "prospects", "p-1", null)],
    companyFacts: [
      knownFact("company.industry", "Software", "prospects", "p-1", null),
      knownFact("company.employee_count", 40, "prospects", "p-1", null),
      unknownFact("company.technologies"),
    ],
    enrichment: {
      hasCompanyEnrichment: true,
      hasProspectEnrichment: false,
      lastRetrievedAt: "2026-08-20T00:00:00Z",
      availableFields: [],
    },
    signals: [
      {
        signalId: "s-1",
        signalType: "hiring_activity",
        title: "Sales hiring up",
        summary: null,
        status: "verified",
        occurredAt: "2026-08-25T00:00:00Z",
        detectedAt: "2026-08-25T10:00:00Z",
        freshness: "recent",
        source: "greenhouse",
        sourceUrl: null,
      },
    ],
    historical: { priorInsightVersion: null, priorGeneratedAt: null, enrichmentLastRetrievedAt: "2026-08-20T00:00:00Z", activityCounts: {} },
    evidenceRefs: [
      { refType: "signal", tableName: "signals", recordId: "s-1" },
      { refType: "icp", tableName: "icp_configurations", recordId: "icp-1" },
    ],
    generatedAt: "2026-08-26T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// Lifecycle & structure
// ---------------------------------------------------------------------------

describe("lifecycle & foundations", () => {
  it("has exactly the five lifecycle states", () => {
    expect(INTELLIGENCE_STATUSES).toEqual(["pending", "processing", "ready", "stale", "failed"]);
  });

  it("active generation statuses are only pending/processing", () => {
    expect(ACTIVE_INTELLIGENCE_STATUSES).toEqual(["pending", "processing"]);
  });

  it("confidence structure starts fully unknown — no manufactured values", () => {
    const c = createUnknownConfidence();
    expect(c.overall).toBeNull();
    expect(c.level).toBe("unknown");
    for (const v of Object.values(c.components)) expect(v.value).toBeNull();
  });

  it("evidence ref types cover the full graph", () => {
    expect(EVIDENCE_REF_TYPES).toContain("icp");
    expect(EVIDENCE_REF_TYPES).toContain("enrichment");
    expect(EVIDENCE_REF_TYPES).toContain("signal");
  });
});

// ---------------------------------------------------------------------------
// Unknown vs mismatch
// ---------------------------------------------------------------------------

describe("missing information is UNKNOWN, never mismatch", () => {
  it("explicit unknown facts are not known", () => {
    const f = unknownFact("company.technologies");
    expect(isFactKnown(f)).toBe(false);
    expect(f.value).toBeNull();
  });

  it("empty strings count as unknown too", () => {
    expect(isFactKnown(knownFact("x", "", null, null))).toBe(false);
    expect(isFactKnown(knownFact("x", 0, null, null))).toBe(true);
  });

  it("buildSubjectFacts represents missing enrichment-only fields as unknown facts", () => {
    const { companyFacts } = buildSubjectFacts(
      "prospect",
      null
    );
    const tech = companyFacts.find((f) => f.key === "company.technologies");
    expect(tech?.value).toBeNull(); // unknown — NOT a mismatch value
  });
});

// ---------------------------------------------------------------------------
// Digest / caching foundation
// ---------------------------------------------------------------------------

describe("reasoning input digest", () => {
  it("is stable for identical evidence regardless of timestamp noise", () => {
    const a = computeReasoningInputDigest(baseInput());
    const b = baseInput();
    b.generatedAt = "2027-01-01T00:00:00Z";
    expect(computeReasoningInputDigest(b)).toBe(a);
  });

  it("changes when evidence changes", () => {
    const a = baseInput();
    const b = baseInput();
    b.signals = [];
    expect(computeReasoningInputDigest(b)).not.toBe(computeReasoningInputDigest(a));
  });

  it("changes when the ICP changes (ICP context matters)", () => {
    const a = baseInput();
    const b = baseInput();
    b.icp = { ...ICP, configurationId: "icp-2" };
    expect(computeReasoningInputDigest(b)).not.toBe(computeReasoningInputDigest(a));
  });

  it("changes when organization changes (org isolation of cached results)", () => {
    const a = baseInput();
    const b = baseInput();
    b.organizationId = "org-b";
    expect(computeReasoningInputDigest(b)).not.toBe(computeReasoningInputDigest(a));
  });
});

// ---------------------------------------------------------------------------
// Invalidation rules
// ---------------------------------------------------------------------------

describe("invalidation", () => {
  it("reuses intelligence when digest unchanged", () => {
    const digest = computeReasoningInputDigest(baseInput());
    expect(
      canReuseIntelligence({ icpConfigurationId: "icp-1", inputDigest: digest, generatedAt: null }, digest)
    ).toBe(true);
  });

  it("marks stale when ICP changed and classifies the reason", () => {
    const input = baseInput();
    input.signals = [];
    const digest = computeReasoningInputDigest(input);
    const changed = baseInput();
    changed.icp = { ...ICP, configurationId: "icp-9" };
    const check = evaluateStaleness(
      { icpConfigurationId: "icp-1", inputDigest: digest, generatedAt: null },
      changed,
      computeReasoningInputDigest(changed)
    );
    expect(check.stale).toBe(true);
    expect(check.reasons).toContain("icp_changed");
  });


// ---------------------------------------------------------------------------
// AI output schema validation (no fake / ungrounded intelligence)
// ---------------------------------------------------------------------------

describe("AI output schema validation", () => {
  const validOutput = {
    dimensions: {
      icp_fit: {
        dimension: "icp_fit",
        score: 92,
        status: "match",
        summary: "Strong ICP match.",
        positive_factors: [
          {
            id: "f1",
            label: "Industry match",
            polarity: "positive",
            status: "match",
            grounding: [{ refId: "s-1" }],
          },
        ],
        negative_factors: [
          { id: "f2", label: "Employee count above target range", polarity: "negative", status: "mismatch" },
        ],
        unknown_fields: ["company.technologies"],
      },
      timing: {
        dimension: "timing",
        score: null, // insufficient evidence → null is allowed
        status: "unknown",
        summary: null,
        positive_factors: [],
        negative_factors: [],
        unknown_fields: [],
      },
    },
    key_factors: [{ id: "k1", label: "Verified hiring signal", polarity: "positive", status: "match" }],
    concerns: [],
    explanation: "Recent sales hiring may indicate increased GTM activity.",
  };

  it("accepts a valid, grounded output including negative factors and unknowns", () => {
    const result = validateAiIntelligenceOutput(validOutput, baseInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.dimensions.icp_fit?.score).toBe(92);
      expect(result.output.dimensions.timing?.score).toBeNull();
      expect(result.output.dimensions.icp_fit?.negative_factors).toHaveLength(1);
    }
  });

  it("rejects malformed root output", () => {
    const result = validateAiIntelligenceOutput("just text", baseInput());
    expect(result.ok).toBe(false);
  });

  it("rejects out-of-range scores (0–100 scale enforced)", () => {
    const bad = structuredClone(validOutput) as Record<string, unknown>;
    (bad.dimensions as Record<string, unknown>).icp_fit = {
      ...(validOutput.dimensions.icp_fit as unknown as Record<string, unknown>),
      score: 150,
    };
    const result = validateAiIntelligenceOutput(bad, baseInput());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.some((i) => i.field.includes("score"))).toBe(true);
  });

  it("rejects unsupported citations (grounding must reference provided evidence)", () => {
    const bad = structuredClone(validOutput);
    (
      (bad.dimensions as Record<string, Record<string, unknown>>).icp_fit
        .positive_factors as Array<{ grounding?: unknown }>
    )[0].grounding = [{ refId: "signal-999-does-not-exist" }];
    const result = validateAiIntelligenceOutput(bad, baseInput());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.some((i) => i.field.includes("grounding"))).toBe(true);
  });

  it("rejects invalid factor polarity/status values", () => {
    const bad = structuredClone(validOutput);
    (bad.key_factors as Array<{ polarity: string }>)[0].polarity = "maybe";
    const result = validateAiIntelligenceOutput(bad, baseInput());
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Engine abstraction — graceful degradation, no fake intelligence
// ---------------------------------------------------------------------------

describe("engine & model provider abstraction", () => {
  it("fails with model_unavailable when no provider is registered", async () => {
    // Phase 1 registers no real provider on a fresh registry path.
    await expect(runIntelligenceEngine(baseInput(), "prospect_reasoning")).rejects.toBeInstanceOf(
      ReasoningEngineError
    );
    await expect(runIntelligenceEngine(baseInput(), "prospect_reasoning")).rejects.toMatchObject({
      code: "model_unavailable",
    });
  });

  it("validates provider output at the engine boundary and rejects invalid responses", async () => {
    const badProvider: ReasoningModelProvider = {
      descriptor: { providerId: "mock-bad", modelId: "m-1", costClass: "low" },
      supports: (task) => task === "company_reasoning",
      generate: async () => ({ nonsense: true } as never),
    };
    reasoningModelRegistry.register(badProvider);
    await expect(
      runIntelligenceEngine(baseInput(), "company_reasoning")
    ).rejects.toMatchObject({ code: "invalid_output" });
  });

  it("passes through valid provider output", async () => {
    const goodProvider: ReasoningModelProvider = {
      descriptor: { providerId: "mock-good", modelId: "m-2", costClass: "low" },
      supports: () => true,
      generate: async () =>
        ({
          dimensions: {},
          key_factors: [],
          concerns: [],
          explanation: null,
        }),
    };
    reasoningModelRegistry.register(goodProvider);
    const result = await runIntelligenceEngine(baseInput(), "prospect_reasoning");
    expect(result.descriptor.providerId).toBe("mock-good");
    expect(result.output.explanation).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Signal normalization reuses the existing freshness architecture
// ---------------------------------------------------------------------------

describe("signal context normalization", () => {
  it("classifies freshness via the shared signal freshness rules", () => {
    const signals = toReasoningSignals([
      {
        id: "s-1",
        signal_type: "hiring_activity",
        title: "Hiring",
        summary: null,
        status: "verified",
        occurred_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        detected_at: new Date().toISOString(),
        source: "test",
        source_url: null,
      },
    ]);
    expect(signals[0].freshness).toBe("recent");
  });
});

  it("does not invalidate when there was no prior intelligence", () => {
    const input = baseInput();
    const check = evaluateStaleness(
      { icpConfigurationId: null, inputDigest: null, generatedAt: null },
      input,
      computeReasoningInputDigest(input)
    );
    expect(check.stale).toBe(false);
  });
});

