// ============================================================================
// Prosventa Intelligence — View Model Mapping Tests (Phase 3)
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  mapViewFromRows,
  priorityCategoryForScore,
  evidenceTypeLabel,
} from "./view";

const readyRow = {
  status: "ready",
  explanation: "Acme scores 92/100 on your ICP.",
  scores: {
    dimensions: {
      overall_priority: {
        dimension: "overall_priority",
        score: 88,
        status: "match",
        summary: "Very high priority (88/100).",
        positive_factors: [],
        negative_factors: [],
        unknown_fields: [],
      },
      icp_fit: {
        dimension: "icp_fit",
        score: 92,
        status: "match",
        summary: null,
        positive_factors: [{ id: "icp.industry.match", label: "Strong industry match", polarity: "positive", status: "match", detail: "SaaS" }],
        negative_factors: [],
        unknown_fields: ["company.employee_count"],
      },
    },
  },
  key_factors: [
    { id: "kf.1", label: "Strong industry match", polarity: "positive", status: "match", grounding: [] },
  ],
  concerns: [
    { id: "concern.unknown.company.employee_count", label: "Unverified information", polarity: "negative", status: "unknown", grounding: [] },
  ],
  confidence: {
    overall: 82,
    level: "high",
    components: {
      evidence_quality: { value: 90 },
      evidence_quantity: { value: 70 },
      source_reliability: { value: 85 },
      freshness: { value: 80 },
      consistency: { value: 85 },
    },
  },
  freshness: { oldestEvidenceAt: "2026-08-01T00:00:00Z", newestEvidenceAt: "2026-08-24T00:00:00Z" },
  generated_at: "2026-08-25T10:00:00Z",
};

const evidenceRow = {
  id: "ref-1",
  ref_type: "signal",
  source: "greenhouse",
  occurred_at: "2026-08-24T00:00:00Z",
  captured_at: "2026-08-24T01:00:00Z",
  freshness: "fresh",
  note: "New VP Sales posted",
};

describe("priorityCategoryForScore", () => {
  it("mirrors the deterministic thresholds", () => {
    expect(priorityCategoryForScore(92)).toBe("very_high");
    expect(priorityCategoryForScore(80)).toBe("very_high");
    expect(priorityCategoryForScore(79)).toBe("high");
    expect(priorityCategoryForScore(60)).toBe("high");
    expect(priorityCategoryForScore(45)).toBe("medium");
    expect(priorityCategoryForScore(20)).toBe("low");
    expect(priorityCategoryForScore(10)).toBe("very_low");
  });

  it("stays unknown for missing scores — never coerced to very_low", () => {
    expect(priorityCategoryForScore(null)).toBe("unknown");
  });
});

describe("mapViewFromRows", () => {
  it("maps a ready insight with evidence", () => {
    const view = mapViewFromRows(readyRow, [evidenceRow]);
    expect(view.state).toBe("ready");
    expect(view.dimensions.map((d) => d.dimension)).toEqual(["overall_priority", "icp_fit"]);
    expect(view.dimensions[1].unknown_fields).toEqual(["company.employee_count"]);
    expect(view.keyFactors[0].label).toBe("Strong industry match");
    expect(view.concerns[0].status).toBe("unknown"); // unknown ≠ mismatch
    expect(view.confidence?.level).toBe("high");
    expect(view.evidence[0]).toMatchObject({
      refId: "ref-1",
      typeLabel: "Verified signal",
      source: "greenhouse",
      freshness: "fresh",
    });
    expect(view.newestEvidenceAt).toBe("2026-08-24T00:00:00Z");
  });

  it("returns state none when nothing was ever generated", () => {
    const view = mapViewFromRows(null, []);
    expect(view.state).toBe("none");
    expect(view.message).toBeNull();
  });

  it("returns the honest insufficient-evidence state when requested", () => {
    const view = mapViewFromRows(null, [], { insufficientEvidence: true });
    expect(view.state).toBe("insufficient_evidence");
    expect(view.message).toContain("Not enough verified information yet");
  });

  it("hides internals on failure and exposes only a safe message", () => {
    const view = mapViewFromRows(
      { ...readyRow, status: "failed", scores: {}, key_factors: [], concerns: [] },
      []
    );
    expect(view.state).toBe("failed");
    expect(view.message).not.toMatch(/provider|api|key|stack/i);
    expect(view.dimensions).toEqual([]);
  });

  it("marks stale rows as stale but keeps them presentable", () => {
    const view = mapViewFromRows({ ...readyRow, status: "stale" }, []);
    expect(view.state).toBe("stale");
    expect(view.dimensions.length).toBeGreaterThan(0);
  });

  it("treats processing rows as in-flight with no content shown", () => {
    const view = mapViewFromRows({ ...readyRow, status: "processing" }, []);
    expect(view.state).toBe("processing");
    expect(view.dimensions).toEqual([]);
    expect(view.keyFactors).toEqual([]);
  });

  it("tolerates malformed JSONB blocks", () => {
    const view = mapViewFromRows(
      { ...readyRow, scores: { dimensions: "garbage" } as unknown as Record<string, unknown>, key_factors: "nope" as unknown as unknown[], confidence: null },
      []
    );
    expect(view.dimensions).toEqual([]);
    expect(view.keyFactors).toEqual([]);
    expect(view.confidence).toBeNull();
  });
});

describe("evidenceTypeLabel", () => {
  it("labels known ref types and falls back safely", () => {
    expect(evidenceTypeLabel("signal")).toBe("Verified signal");
    expect(evidenceTypeLabel("enrichment")).toBe("Enrichment");
    expect(evidenceTypeLabel("mystery")).toBe("Evidence");
  });
});
