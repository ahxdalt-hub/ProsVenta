// ============================================================================
// Prosventa Signals — Feature 3: Phase 4 Reliability Regression Tests
// ============================================================================
import { describe, it, expect } from "vitest";
import {
  LIVE_SIGNAL_STATUSES,
  TERMINAL_SIGNAL_STATUSES,
  canTransitionSignalStatus,
  getSignalLifecycleFreshness,
  freshnessToDateRange,
} from "./lifecycle";
import { buildDedupeKey, validateSignalInput } from "./dedupe";
import {
  buildEvidenceDedupeKey,
  sanitizeEvidenceUrl,
  validateEvidence,
} from "./evidence";
import type { SignalInput } from "./types";

function validInput(): SignalInput {
  return {
    organization_id: "org-1",
    prospect_id: null,
    signal_type: "funding_event",
    category: "external_event",
    title: "Series A reported",
    description: "A funding round was reported.",
    source: "mock-provider",
    source_url: "https://example.com/a",
    event_id: undefined,
    detected_at: new Date("2026-01-15T10:00:00Z").toISOString(),
    confidence: "medium",
    importance: "high",
  } as unknown as SignalInput;
}

describe("Phase 4 — status read-path consistency", () => {
  it("live statuses include externally-detected states", () => {
    // External detection stores signals as 'detected'/'verified'; every read
    // surface must therefore treat those as live (regression: old code
    // filtered status='active' only and silently hid external signals).
    expect(LIVE_SIGNAL_STATUSES).toContain("detected");
    expect(LIVE_SIGNAL_STATUSES).toContain("verified");
    expect(LIVE_SIGNAL_STATUSES).toContain("active");
  });

  it("terminal states never appear in live statuses", () => {
    for (const t of TERMINAL_SIGNAL_STATUSES) {
      expect(LIVE_SIGNAL_STATUSES).not.toContain(t);
    }
  });
});

describe("Phase 4 — lifecycle transition guards", () => {
  it("dismissal is legal from live states", () => {
    for (const s of ["detected", "verifying", "verified"] as const) {
      expect(canTransitionSignalStatus(s, "dismissed")).toBe(true);
    }
  });

  it("dismissal is illegal from terminal states", () => {
    for (const s of TERMINAL_SIGNAL_STATUSES) {
      expect(canTransitionSignalStatus(s, "dismissed")).toBe(false);
    }
  });

  it("no self-transitions", () => {
    for (const s of [
      "detected",
      "verifying",
      "verified",
      "dismissed",
      "expired",
    ] as const) {
      expect(canTransitionSignalStatus(s, s)).toBe(false);
    }
  });
});

describe("Phase 4 — idempotency keys are stable", () => {
  it("same event → same signal dedupe key across runs", () => {
    const a = buildDedupeKey(validInput());
    const b = buildDedupeKey(validInput());
    expect(a).toBe(b);
  });

  it("different sources → different dedupe keys", () => {
    const a = buildDedupeKey(validInput());
    const b = buildDedupeKey({
      ...validInput(),
      source: "other-provider",
    } as SignalInput);
    expect(a).not.toBe(b);
  });

  it("same evidence captured repeatedly collapses to one key", () => {
    const base = {
      provider: "greenhouse",
      sourceRecordId: "job-123",
      sourceUrl: null,
      occurredAt: "2026-01-10T00:00:00Z",
    };
    expect(buildEvidenceDedupeKey(base)).toBe(
      buildEvidenceDedupeKey({ ...base })
    );
  });
});

describe("Phase 4 — false-positive protection", () => {
  it("unevidenced events fail minimum-evidence validation", () => {
    const issues = validateEvidence({ provider: "x" });
    expect(issues.some((i) => i.field === "source")).toBe(true);
  });

  it("non-public URLs are rejected as evidence anchors", () => {
    expect(sanitizeEvidenceUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeEvidenceUrl("file:///etc/passwd")).toBeNull();
    expect(sanitizeEvidenceUrl("https://example.com/x")).toBe(
      "https://example.com/x"
    );
  });

  it("invalid inputs are filtered before persistence", () => {
    expect(validateSignalInput(validInput())).toHaveLength(0);
    const bad = {
      ...validInput(),
      confidence: "certain",
      detected_at: "not-a-date",
    } as unknown as SignalInput;
    expect(validateSignalInput(bad).length).toBeGreaterThan(0);
  });
});

describe("Phase 4 — centralized freshness consistency", () => {
  it("fresh/aging/expired classification matches the filter ranges", () => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const fresh = getSignalLifecycleFreshness(
      new Date(now - 2 * DAY).toISOString(),
      now
    );
    expect(fresh).toBe("fresh");

    const aging = getSignalLifecycleFreshness(
      new Date(now - 14 * DAY).toISOString(),
      now
    );
    expect(aging).toBe("aging");

    const expired = getSignalLifecycleFreshness(
      new Date(now - 90 * DAY).toISOString(),
      now
    );
    expect(expired).toBe("expired");

    // The fresh band from freshnessToDateRange covers exactly 'fresh' signals.
    const range = freshnessToDateRange("fresh", now);
    expect(range).not.toBeNull();
    expect(new Date(range!.from).getTime()).toBeLessThanOrEqual(now - 2 * DAY);
    expect(new Date(now - 90 * DAY).getTime()).toBeLessThan(
      new Date(range!.from).getTime()
    );
  });
});
