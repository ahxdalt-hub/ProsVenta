// ============================================================================
// Prosventa Intelligence — Phase 4 Production Hardening Tests
// ============================================================================
// Covers: stuck-job recovery decisions (§21), input validation (§7),
// per-organization generation cost protection (§23/§26) and the provider
// retry classification policy (§19).
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  GenerationThrottle,
  STUCK_GENERATION_THRESHOLD_MS,
  isStuckGeneration,
  isValidCompanyKey,
  isValidUuid,
} from "./hardening";
import { classifyProviderStatus } from "./providers/openai-compatible";

describe("isStuckGeneration", () => {
  const NOW = Date.parse("2026-08-28T12:00:00Z");

  it("flags a pending row with no timestamp as stuck (cannot be trusted live)", () => {
    expect(isStuckGeneration(null, NOW)).toBe(true);
  });

  it("flags an invalid timestamp as stuck", () => {
    expect(isStuckGeneration("not-a-date", NOW)).toBe(true);
  });

  it("does NOT flag recent activity", () => {
    const oneMinuteAgo = new Date(NOW - 60_000).toISOString();
    expect(isStuckGeneration(oneMinuteAgo, NOW)).toBe(false);
  });

  it("flags activity older than the threshold", () => {
    const old = new Date(NOW - STUCK_GENERATION_THRESHOLD_MS - 1).toISOString();
    expect(isStuckGeneration(old, NOW)).toBe(true);
  });

  it("treats activity exactly at the threshold as not yet stuck", () => {
    const exact = new Date(NOW - STUCK_GENERATION_THRESHOLD_MS).toISOString();
    expect(isStuckGeneration(exact, NOW)).toBe(false);
  });
});

describe("input validation", () => {
  it("accepts valid UUIDs and rejects malformed ids before any DB call", () => {
    expect(isValidUuid("31bd1981-49b3-4506-800d-356b7f883583")).toBe(true);
    expect(isValidUuid("not-a-uuid")).toBe(false);
    expect(isValidUuid("'; DROP TABLE prospects; --")).toBe(false);
    expect(isValidUuid("")).toBe(false);
    expect(isValidUuid(123)).toBe(false);
    expect(isValidUuid(null)).toBe(false);
  });

  it("accepts normalized hostname company keys and rejects garbage", () => {
    expect(isValidCompanyKey("acme.com")).toBe(true);
    expect(isValidCompanyKey("sub.acme.co.uk")).toBe(true);
    expect(isValidCompanyKey("no-tld")).toBe(false);
    expect(isValidCompanyKey("")).toBe(false);
    expect(isValidCompanyKey("bad host.com")).toBe(false);
    expect(isValidCompanyKey("a".repeat(300))).toBe(false);
  });
});

describe("GenerationThrottle", () => {
  it("allows the first request then enforces the min interval", () => {
    let now = 1_000_000;
    const throttle = new GenerationThrottle(2_000, 3, () => now);

    expect(throttle.tryAcquire("org-1").allowed).toBe(true);
    const second = throttle.tryAcquire("org-1");
    expect(second.allowed).toBe(false);
    expect(second.reason).toBe("interval");
    expect(second.retryInMs).toBeGreaterThan(0);

    now += 2_000;
    expect(throttle.tryAcquire("org-1").allowed).toBe(true);
  });

  it("enforces the concurrency cap independently of the interval", () => {
    let now = 1_000_000;
    const throttle = new GenerationThrottle(0, 2, () => now); // no interval limit

    expect(throttle.tryAcquire("org-1").allowed).toBe(true);
    now += 10;
    expect(throttle.tryAcquire("org-1").allowed).toBe(true);
    now += 10;
    const third = throttle.tryAcquire("org-1");
    expect(third.allowed).toBe(false);
    expect(third.reason).toBe("concurrency");
  });

  it("isolation: throttling is per organization", () => {
    const throttle = new GenerationThrottle(60_000, 3, () => 1_000_000);
    expect(throttle.tryAcquire("org-A").allowed).toBe(true);
    expect(throttle.tryAcquire("org-B").allowed).toBe(true);
  });

  it("release frees a concurrency slot", () => {
    let now = 1_000_000;
    const throttle = new GenerationThrottle(0, 1, () => now);
    expect(throttle.tryAcquire("org-1").allowed).toBe(true);
    expect(throttle.tryAcquire("org-1").reason).toBe("concurrency");
    throttle.release("org-1");
    now += 10; // move past any interval bookkeeping
    expect(throttle.tryAcquire("org-1").allowed).toBe(true);
  });

  it("release never drives the active count negative", () => {
    const throttle = new GenerationThrottle(0, 3, () => 0);
    throttle.release("org-x");
    throttle.release("org-x");
    // Still functional afterwards.
    expect(throttle.tryAcquire("org-x").allowed).toBe(true);
  });
});

describe("provider retry classification (§19)", () => {
  it("classifies rate limits as transient model_rate_limited", () => {
    const e = classifyProviderStatus(429);
    expect(e?.code).toBe("model_rate_limited");
  });

  it("classifies server errors as transient provider failures", () => {
    expect(classifyProviderStatus(500)?.code).toBe("provider_failure");
    expect(classifyProviderStatus(503)?.code).toBe("provider_failure");
  });

  it("never retries auth or bad-request responses (permanent)", () => {
    expect(classifyProviderStatus(401)).toBeNull();
    expect(classifyProviderStatus(400)).toBeNull();
    expect(classifyProviderStatus(404)).toBeNull();
  });
});
