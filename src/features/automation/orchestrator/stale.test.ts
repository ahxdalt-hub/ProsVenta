// ============================================================================
// Prosventa Automation Orchestrator — Stuck Execution Detection Tests
// Stage 7 — Phase 6: End-to-End Integration & Hardening
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  STUCK_EXECUTION_MS,
  computeLastActivityAt,
  isExecutionStuck,
} from "./stale";

const NOW = Date.parse("2026-08-24T12:00:00.000Z");
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

describe("computeLastActivityAt", () => {
  it("returns null when there is no timestamp evidence", () => {
    expect(computeLastActivityAt({ startedAt: null, lastStepActivityAt: null })).toBeNull();
    expect(computeLastActivityAt({ startedAt: "", lastStepActivityAt: "" })).toBeNull();
    expect(computeLastActivityAt({ startedAt: "garbage", lastStepActivityAt: null })).toBeNull();
  });

  it("uses the LATER of start time and last step activity", () => {
    const started = minutesAgo(60);
    const step = minutesAgo(10);
    expect(
      computeLastActivityAt({ startedAt: started, lastStepActivityAt: step })
    ).toBe(Date.parse(step));
    expect(
      computeLastActivityAt({ startedAt: step, lastStepActivityAt: started })
    ).toBe(Date.parse(step));
  });
});

describe("isExecutionStuck", () => {
  it("flags an active execution with no activity beyond the threshold", () => {
    expect(
      isExecutionStuck(
        { status: "running", startedAt: minutesAgo(45), lastStepActivityAt: null, now: NOW },
        STUCK_EXECUTION_MS
      )
    ).toBe(true);
  });

  it("does NOT flag a legitimately slow execution with recent step activity", () => {
    expect(
      isExecutionStuck(
        { status: "running", startedAt: minutesAgo(120), lastStepActivityAt: minutesAgo(5), now: NOW },
        STUCK_EXECUTION_MS
      )
    ).toBe(false);
  });

  it("respects the exact threshold boundary", () => {
    const exactlyAtThreshold = minutesAgo(STUCK_EXECUTION_MS / 60_000);
    expect(
      isExecutionStuck(
        { status: "running", startedAt: exactlyAtThreshold, lastStepActivityAt: null, now: NOW },
        STUCK_EXECUTION_MS
      )
    ).toBe(false); // not STRICTLY beyond
  });

  it("never flags terminal or user-paused states", () => {
    for (const status of ["completed", "failed", "cancelled", "paused"]) {
      expect(
        isExecutionStuck(
          { status, startedAt: minutesAgo(10_000), lastStepActivityAt: null, now: NOW },
          STUCK_EXECUTION_MS
        )
      ).toBe(false);
    }
  });

  it("never guesses when no timestamps exist", () => {
    expect(
      isExecutionStuck({ status: "queued", startedAt: null, lastStepActivityAt: null, now: NOW })
    ).toBe(false);
  });

  it("supports custom thresholds", () => {
    expect(
      isExecutionStuck(
        { status: "waiting", startedAt: minutesAgo(20), lastStepActivityAt: null, now: NOW },
        10 * 60_000
      )
    ).toBe(true);
  });
});
