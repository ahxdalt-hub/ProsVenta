// ============================================================================
// Prosventa Signals — Phase 1 Foundation Tests
// Feature 3 — Phase 1: Signal Foundation & Data Architecture
// ============================================================================
// Verifies: type registry integrity, lifecycle rules, centralized freshness,
// evidence minimums/dedupe, and query-filter normalization.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  SIGNAL_TYPE_DEFINITIONS,
  getSignalTypeDefinition,
  getSignalTypesByEntity,
  getSignalTypesByCapability,
  isSignalTypeKnown,
} from "./registry";
import {
  canTransitionSignalStatus,
  isTerminalSignalStatus,
  isLiveSignalStatus,
  getSignalLifecycleFreshness,
  getAllowedSignalTransitions,
} from "./lifecycle";
import {
  validateEvidence,
  toEvidenceInsert,
  buildEvidenceDedupeKey,
  sanitizeEvidenceUrl,
} from "./evidence";
import { normalizeSignalQuery, MAX_SIGNAL_PAGE_SIZE } from "./query-filters";
import { SIGNAL_TYPES, SIGNAL_STATUSES } from "./types";

describe("signal type registry", () => {
  it("registers a definition for every canonical signal type", () => {
    for (const type of SIGNAL_TYPES) {
      expect(SIGNAL_TYPE_DEFINITIONS[type]).toBeDefined();
      expect(SIGNAL_TYPE_DEFINITIONS[type].displayName.length).toBeGreaterThan(0);
      expect(SIGNAL_TYPE_DEFINITIONS[type].evidenceRequired.length).toBeGreaterThan(0);
    }
  });

  it("does not register unknown types", () => {
    expect(isSignalTypeKnown("made_up_type")).toBe(false);
    expect(isSignalTypeKnown("funding_event")).toBe(true);
    expect(getSignalTypeDefinition("made_up_type" as never)).toBeNull();
  });

  it("separates company-level and prospect-level entities", () => {
    const company = getSignalTypesByEntity("company");
    const prospect = getSignalTypesByEntity("prospect");
    expect(company).toContain("funding_event");
    expect(company).toContain("hiring_activity");
    expect(prospect).toContain("job_change");
    for (const t of SIGNAL_TYPES) {
      const inCompany = company.includes(t);
      const inProspect = prospect.includes(t);
      expect(inCompany && inProspect).toBe(false);
    }
  });

  it("maps provider capabilities to detectable signal types", () => {
    const businessSignalTypes = getSignalTypesByCapability("business_signals");
    expect(businessSignalTypes).toContain("funding_event");
    expect(businessSignalTypes).not.toContain("prospect_saved");
  });
});

describe("signal lifecycle", () => {
  it("requires validation between detected and verified", () => {
    expect(canTransitionSignalStatus("detected", "verifying")).toBe(true);
    expect(canTransitionSignalStatus("verifying", "verified")).toBe(true);
    expect(canTransitionSignalStatus("detected", "dismissed")).toBe(true);
    expect(canTransitionSignalStatus("expired", "verified")).toBe(false);
    expect(canTransitionSignalStatus("dismissed", "verified")).toBe(false);
    expect(canTransitionSignalStatus("verified", "verified")).toBe(false);
  });

  it("treats dismissed/expired/archived as terminal and others as live", () => {
    expect(isTerminalSignalStatus("expired")).toBe(true);
    expect(isTerminalSignalStatus("dismissed")).toBe(true);
    expect(isTerminalSignalStatus("archived")).toBe(true);
    expect(isTerminalSignalStatus("detected")).toBe(false);
    expect(isLiveSignalStatus("verifying")).toBe(true);
    expect(isLiveSignalStatus("dismissed")).toBe(false);
  });

  it("exposes allowed transitions for every status without dead ends", () => {
    for (const status of SIGNAL_STATUSES) {
      expect(Array.isArray(getAllowedSignalTransitions(status))).toBe(true);
    }
  });

  it("classifies freshness centrally (fresh / aging / expired)", () => {
    const NOW = new Date("2026-08-26T12:00:00Z").getTime();
    expect(getSignalLifecycleFreshness("2026-08-24T12:00:00Z", NOW)).toBe("fresh");
    expect(getSignalLifecycleFreshness("2026-08-10T12:00:00Z", NOW)).toBe("aging");
    expect(getSignalLifecycleFreshness("2026-01-01T12:00:00Z", NOW)).toBe("expired");
  });
});

describe("evidence model", () => {
  const validBase = {
    provider: "provider-a",
    sourceRecordId: "evt-1",
    sourceUrl: "https://example.com/press",
    occurredAt: "2026-08-20T09:00:00Z",
  };

  it("accepts evidence that meets minimum requirements", () => {
    expect(validateEvidence(validBase)).toHaveLength(0);

    const insert = toEvidenceInsert(validBase, "org-1", "signal-1");
    expect(insert).not.toBeNull();
    expect(insert!.organization_id).toBe("org-1");
    expect(insert!.signal_id).toBe("signal-1");
    expect(insert!.occurred_at).toBe("2026-08-20T09:00:00.000Z");
    expect(insert!.dedupe_key.startsWith("provider-a|provider_record|evt-1")).toBe(true);
  });

  it("rejects evidence with no anchor (no record id AND no public URL)", () => {
    const issues = validateEvidence({ provider: "provider-a" });
    expect(issues.some((i) => i.field === "source")).toBe(true);
    expect(toEvidenceInsert({ provider: "provider-a" }, "org", "sig")).toBeNull();
  });

  it("rejects evidence without a provider/source", () => {
    const issues = validateEvidence({ ...validBase, provider: "" });
    expect(issues.some((i) => i.field === "provider")).toBe(true);
  });

  it("never stores invalid event dates or non-public URLs", () => {
    expect(
      validateEvidence({ ...validBase, occurredAt: "not-a-date" }).some(
        (i) => i.field === "occurred_at"
      )
    ).toBe(true);
    expect(sanitizeEvidenceUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeEvidenceUrl("https://ok.example.com/x")).toBe("https://ok.example.com/x");
  });

  it("deduplicates identical evidence deterministically", () => {
    const a = buildEvidenceDedupeKey(validBase);
    const b = buildEvidenceDedupeKey({
      ...validBase,
      occurredAt: "2026-08-20T23:59:59Z", // same day → same key
    });
    expect(a).toBe(b);

    const c = buildEvidenceDedupeKey({ ...validBase, provider: "provider-b" });
    expect(c).not.toBe(a);
  });
});

describe("signal query filters", () => {
  it("normalizes a valid filter set into a bounded plan", () => {
    const { plan, issues } = normalizeSignalQuery("org-1", {
      signal_type: ["funding_event"],
      status: ["detected", "verifying"],
      limit: 50,
      offset: 20,
    });
    expect(issues).toHaveLength(0);
    expect(plan).toMatchObject({
      organization_id: "org-1",
      signal_type: ["funding_event"],
      status: ["detected", "verifying"],
      limit: 50,
      offset: 20,
      order_by: "occurred_at",
      order_dir: "desc",
    });
  });

  it("rejects unscoped queries (no organization)", () => {
    const { plan, issues } = normalizeSignalQuery("", {});
    expect(plan).toBeNull();
    expect(issues.join(" ")).toContain("organization_id");
  });

  it("rejects unknown types/statuses instead of querying them", () => {
    const bad = normalizeSignalQuery("org-1", {
      signal_type: ["nope" as never],
      status: ["wat" as never],
    });
    expect(bad.plan).toBeNull();
    expect(bad.issues.length).toBe(2);
  });

  it("caps page size and clamps negative offsets", () => {
    const { plan } = normalizeSignalQuery("org-1", { limit: 100000, offset: -5 });
    expect(plan!.limit).toBe(MAX_SIGNAL_PAGE_SIZE);
    expect(plan!.offset).toBe(0);
  });

  it("converts freshness bands into occurred_at date ranges", () => {
    const fresh = normalizeSignalQuery("org-1", { freshness: "fresh" });
    const historical = normalizeSignalQuery("org-1", { freshness: "historical" });
    expect(fresh.plan!.occurred_from).toBeTruthy();
    expect(fresh.plan!.occurred_to).toBeTruthy();
    expect(historical.plan!.occurred_from).toBeTruthy();
    expect(new Date(historical.plan!.occurred_to!).getTime()).toBeLessThan(Date.now());
  });
});