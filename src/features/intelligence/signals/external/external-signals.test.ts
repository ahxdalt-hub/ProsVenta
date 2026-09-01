// ============================================================================
// Prosventa External Business Signals — Unit Tests
// Stage 6 — Phase 5: External Business Signal Engine
// ============================================================================

import { describe, it, expect } from "vitest";
import { normalizeExternalEventType, isExternalSignalType, type ExternalSignal } from "./types";
import { tokenizeTitle, toNormalizedSignalInput } from "./normalize";
import { getExternalSignalFreshness, formatEventAge, SIGNAL_FRESHNESS_LABELS } from "./freshness";
import { computeExternalImportance } from "./relevance";
import { findDuplicateExternalSignal } from "./dedupe";

const NOW = new Date("2026-08-24T12:00:00Z").getTime();

function makeExternalSignal(overrides: Partial<ExternalSignal> = {}): ExternalSignal {
  return {
    providerSignalId: "evt-1",
    eventTypeRaw: "funding_round",
    title: "Acme raised $20M Series B",
    description: "Acme announced a Series B financing.",
    sourceUrl: "https://example.com/press/acme-series-b",
    sourceName: "Example Press",
    publishedAt: "2026-08-22T09:00:00Z",
    retrievedAt: "2026-08-24T10:00:00Z",
    confidence: "high",
    ...overrides,
  };
}

describe("event type normalization", () => {
  it("maps provider vocabularies to Prosventa signal types", () => {
    expect(normalizeExternalEventType("series_b")).toBeNull(); // unknown → dropped
    expect(normalizeExternalEventType("FUNDING_ROUND")).toBe("funding_event");
    expect(normalizeExternalEventType("executive_appointment")).toBe("leadership_change");
    expect(normalizeExternalEventType("department_hiring")).toBe("hiring_activity");
  });

  it("classifies which types can come from external providers", () => {
    expect(isExternalSignalType("funding_event")).toBe(true);
    expect(isExternalSignalType("prospect_imported")).toBe(false);
  });
});

describe("freshness", () => {
  it("classifies Recent / Aging / Historical from actual dates", () => {
    expect(getExternalSignalFreshness("2026-08-20T00:00:00Z", NOW)).toBe("recent");
    expect(getExternalSignalFreshness("2026-08-05T00:00:00Z", NOW)).toBe("aging");
    expect(getExternalSignalFreshness("2026-05-01T00:00:00Z", NOW)).toBe("historical");
  });

  it("exposes human-readable labels", () => {
    expect(SIGNAL_FRESHNESS_LABELS.recent).toBe("Recent");
    expect(formatEventAge("2026-08-20T12:00:00Z", NOW)).toBe("4 days ago");
  });
});

describe("importance methodology (explainable, no arbitrary scores)", () => {
  it("rates a recent high-confidence funding event higher than an old low-confidence one", () => {
    // Dates are relative to Date.now() so the test does not silently drift
    // out of the "recent" freshness window as wall-clock time advances.
    const DAY = 24 * 60 * 60 * 1000;
    const recent = computeExternalImportance({
      signalType: "funding_event",
      publishedAt: new Date(Date.now() - 1 * DAY).toISOString(),
      confidence: "high",
    });
    const old = computeExternalImportance({
      signalType: "funding_event",
      publishedAt: new Date(Date.now() - 200 * DAY).toISOString(),
      confidence: "low",
    });
    expect(recent.score).toBeGreaterThan(old.score);
    expect(recent.importance).toBe("high");
    expect(old.importance).toBe("low");
  });

  it("never auto-rates a signal as critical", () => {
    const result = computeExternalImportance({
      signalType: "funding_event",
      publishedAt: "2026-08-24T00:00:00Z",
      confidence: "high",
    });
    expect(result.importance).not.toBe("critical");
    expect(result.factors.typeWeight).toBeGreaterThan(0);
  });
});

describe("cross-provider deduplication", () => {
  const stored = [
    {
      id: "s1",
      signal_type: "funding_event",
      title: "Acme announces $20M Series B financing",
      source_url: null,
      provider: "provider-b",
      provider_signal_id: "pb-999",
      detected_at: "2026-08-22T00:00:00Z",
    },
  ];

  it("deduplicates the same event described differently by another provider", () => {
    const dup = findDuplicateExternalSignal(
      { ...makeExternalSignal(), resolvedType: "funding_event" },
      stored
    );
    expect(dup?.id).toBe("s1");
  });

  it("deduplicates on identical provider event ids even with different wording", () => {
    const dup = findDuplicateExternalSignal(
      {
        ...makeExternalSignal({ title: "Completely different wording", providerSignalId: "pb-999" }),
        resolvedType: "funding_event",
      },
      stored
    );
    expect(dup?.id).toBe("s1");
  });

  it("does not deduplicate different provider event ids with unrelated titles", () => {
    const dup = findDuplicateExternalSignal(
      {
        ...makeExternalSignal({
          title: "Totally unrelated announcement about widgets",
          providerSignalId: "evt-other",
        }),
        resolvedType: "funding_event",
      },
      stored
    );
    expect(dup).toBeNull();
  });

  it("does NOT merge unrelated events that happen close together", () => {
    const notDup = findDuplicateExternalSignal(
      {
        ...makeExternalSignal({
          eventTypeRaw: "executive_appointment",
          title: "Acme appoints new CFO",
          providerSignalId: "evt-other",
        }),
        resolvedType: "leadership_change",
      },
      stored
    );
    expect(notDup).toBeNull();
  });
});

describe("normalization into SignalInput", () => {
  it("produces grounded, provenance-bearing signals with cautious interpretation", () => {
    const normalized = toNormalizedSignalInput(
      makeExternalSignal(),
      { domain: "acme.com" },
      "provider-a"
    );
    expect(normalized).not.toBeNull();
    expect(normalized!.signal_type).toBe("funding_event");
    expect(normalized!.category).toBe("external_event");
    expect(normalized!.source).toBe("provider-a");
    expect(normalized!.source_url).toBe("https://example.com/press/acme-series-b");
    expect(normalized!.company_key).toBe("acme.com");
    expect(normalized!.interpretation).toContain("Prosventa interpretation");
    expect(normalized!.interpretation).toContain("not proof of intent");
  });

  it("rejects non-public source URLs instead of storing them", () => {
    const normalized = toNormalizedSignalInput(
      makeExternalSignal({ sourceUrl: "javascript:alert(1)" }),
      { domain: "acme.com" },
      "provider-a"
    );
    expect(normalized!.source_url).toBeNull();
  });

  it("drops events without a usable date or mappable type", () => {
    expect(
      toNormalizedSignalInput(
        makeExternalSignal({ publishedAt: null, retrievedAt: "not-a-date" }),
        { domain: "x.com" },
        "p"
      )
    ).toBeNull();
    expect(
      toNormalizedSignalInput(makeExternalSignal({ eventTypeRaw: "unknown_type" }), { domain: "x.com" }, "p")
    ).toBeNull();
  });

  it("tokenizes titles into significant keywords for event identity", () => {
    expect(tokenizeTitle("Acme raised $20M Series B")).toContain("acme");
    expect(tokenizeTitle("Acme raised $20M Series B")).not.toContain("raised");
  });
});
