// ============================================================================
// Prosventa Signals — Phase 2 Detection Engine Tests
// ============================================================================
// Covers: valid signal → verified; missing evidence → not verified;
// duplicate event → one signal; two providers → one logical signal with two
// evidence records; provider failure → no corrupt signal; rate limit →
// bounded retry honoring Retry-After; organization isolation.
// ============================================================================

import { describe, expect, it } from "vitest";
import type { ExternalSignalDetectionRequest } from "../external/types";
import { validateCandidate } from "./validate";
import { normalizeLeadershipRole } from "./roles";
import { HiringSignalDetector } from "./detectors/hiring";
import type { HiringDetectorInput } from "./detectors/hiring";
import { extractReportedAmount } from "./detectors/funding";
import {
  decideCandidate,
  persistCandidate,
} from "./engine";
import type { DetectionStore, StoredSignalCandidate } from "./detection-store";
import { fetchProviderJson } from "./http";
import {
  resolveGreenhouseSlug,
  fetchGreenhousePostings,
} from "./providers/greenhouse";

const ORG_A = "org-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORG_B = "org-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const NOW = "2026-08-26T12:00:00.000Z";

function hiringInput(overrides: Partial<HiringDetectorInput> = {}): HiringDetectorInput {
  return {
    providerId: "greenhouse-board",
    boardSlug: "acme",
    companyName: "Acme",
    domain: "acme.com",
    boardUrl: "https://boards.greenhouse.io/acme",
    postings: [
      { id: "1", title: "Senior Account Executive", updatedAt: "2026-08-20T00:00:00Z" },
      { id: "2", title: "VP Sales", updatedAt: "2026-08-21T00:00:00Z" },
      { id: "3", title: "Growth Marketer", updatedAt: "2026-08-22T00:00:00Z" },
    ],
    ...overrides,
  };
}

function makeFakeStore(orgId: string) {
  const signals: Array<Record<string, unknown>> = [];
  const evidence: Array<Record<string, unknown>> = [];
  const store: DetectionStore = {
    async getStoredCandidates(candidateOrgId) {
      // ORG ISOLATION at the data-access boundary (in production also RLS).
      if (candidateOrgId !== orgId) return [];
      return signals as unknown as StoredSignalCandidate[];
    },
    async findSignalByDedupeKey(candidateOrgId, dedupeKey) {
      if (candidateOrgId !== orgId) return null;
      const found = signals.find((s) => s.dedupe_key === dedupeKey);
      return found ? { id: found.id as string } : null;
    },
    async insertSignal(input) {
      if (input.organization_id !== orgId) return null; // RLS would reject
      const conflict = signals.some(
        (s) =>
          s.organization_id === input.organization_id &&
          s.dedupe_key === input.dedupe_key
      );
      if (conflict) return null; // DB unique-constraint behavior
      const row = { id: `sig-${signals.length + 1}`, ...input };
      signals.push(row);
      return { id: row.id as string };
    },
    async insertEvidence(input) {
      evidence.push(input);
    },
  };
  return { store, signals, evidence };
}

describe("role normalization", () => {
  it("maps title variants of the same role to one category", () => {
    for (const title of [
      "Vice President of Sales",
      "VP Sales",
      "VP, Sales",
      "VP of Sales",
    ]) {
      expect(normalizeLeadershipRole(title)).toBe("vp_sales");
    }
    expect(normalizeLeadershipRole("Head of Sales")).toBe("head_of_sales");
    expect(normalizeLeadershipRole("Chief Revenue Officer")).toBe("cro");
    expect(normalizeLeadershipRole("Software Engineer")).toBeNull();
  });
});

describe("hiring detector", () => {
  it("produces one verified-capable candidate only for meaningful activity", () => {
    const ctx = { orgId: ORG_A, runId: "r1", nowIso: NOW };
    const candidates = new HiringSignalDetector().detect(hiringInput(), ctx);
    expect(candidates).toHaveLength(1);
    const decision = decideCandidate(candidates[0]);
    expect(decision.verdict).toBe("verified");
    expect(candidates[0].evidence.normalizedData?.relevantJobCount).toBe(3);
  });

  it("does NOT create a hiring signal from one random posting", () => {
    const ctx = { orgId: ORG_A, runId: "r1", nowIso: NOW };
    const candidates = new HiringSignalDetector().detect(
      hiringInput({
        postings: [{ id: "1", title: "Office Manager", updatedAt: "2026-08-20T00:00:00Z" }],
      }),
      ctx
    );
    expect(candidates).toHaveLength(0);
  });
});

describe("funding amount extraction", () => {
  it("extracts only explicitly reported amounts and never invents one", () => {
    expect(extractReportedAmount("Acme raised $20M Series B")).toBe("$20M");
    expect(extractReportedAmount("Acme announced a new funding round")).toBeNull();
  });
});

describe("candidate validation", () => {
  it("verified: realistic provider leadership event passes", () => {
    const candidate = {
      detectorId: "leadership-signal",
      signalType: "leadership_change" as const,
      category: "company_change" as const,
      title: "John Smith joins Acme as VP Sales",
      description: "Announced today.",
      companyKey: "acme.com",
      person: { name: "John Smith", titleRaw: "VP Sales" },
      previousCompany: null,
      amount: null,
      occurredAt: "2026-08-25T00:00:00Z",
      detectedAt: NOW,
      confidence: "high" as const,
      sourceName: "PR Newswire",
      sourceUrl: "https://www.prnewswire.com/acme-vp-sales",
      sourceRecordId: "evt-1",
      provider: "provider-a",
      evidence: {
        provider: "provider-a",
        evidenceType: "article" as const,
        sourceRecordId: "evt-1",
        occurredAt: "2026-08-25T00:00:00Z",
        normalizedData: {},
      },
    };
    expect(validateCandidate(candidate).verdict).toBe("verified");
  });

  it("missing role: partial leadership event stays a candidate, never verified", () => {
    expect(
      validateCandidate({
        detectorId: "d",
        signalType: "leadership_change",
        category: "company_change",
        title: "John Smith joins Acme",
        description: "",
        companyKey: "acme.com",
        person: { name: "John Smith", titleRaw: null },
        previousCompany: null,
        amount: null,
        occurredAt: null,
        detectedAt: NOW,
        confidence: "medium",
        sourceName: "Provider",
        sourceUrl: "https://example.com/x",
        sourceRecordId: "evt-2",
        provider: "p",
        evidence: { provider: "p", normalizedData: {} },
      }).verdict
    ).toBe("candidate");
  });

  it("no source anchor: rejected outright", () => {
    expect(
      validateCandidate({
        detectorId: "d",
        signalType: "hiring_activity",
        category: "company_change",
        title: "t",
        description: "",
        companyKey: "acme.com",
        person: null,
        previousCompany: null,
        amount: null,
        occurredAt: "2026-08-25T00:00:00Z",
        detectedAt: NOW,
        confidence: "low",
        sourceName: "x",
        sourceUrl: null,
        sourceRecordId: null,
        provider: "p",
        evidence: { provider: "p", normalizedData: { relevantJobCount: 5 } },
      }).verdict
    ).toBe("rejected");
  });
});

describe("deduplication + persistence", () => {
  function hiringCandidate(provider: string, sourceUrl: string | null) {
    const detector = new HiringSignalDetector();
    const [candidate] = detector.detect(
      hiringInput({ providerId: provider, boardUrl: sourceUrl ?? "" }),
      { orgId: ORG_A, runId: "r", nowIso: NOW }
    );
    return candidate;
  }

  it("same event twice → ONE signal", async () => {
    const { store, signals } = makeFakeStore(ORG_A);
    const stored: StoredSignalCandidate[] = [];
    const candidate = hiringCandidate("greenhouse-board", "https://boards.greenhouse.io/acme");

    const first = await persistCandidate(ORG_A, null, decideCandidate(candidate), stored, store);
    expect(first.outcome).toBe("created");

    // Second run: the same event now appears among stored candidates.
    stored.push({
      id: "sig-1",
      signal_type: candidate.signalType,
      title: candidate.title,
      source_url: candidate.sourceUrl,
      provider: candidate.provider,
      provider_signal_id: candidate.sourceRecordId,
      detected_at: candidate.detectedAt,
    });
    const second = await persistCandidate(ORG_A, null, decideCandidate(candidate), stored, store);
    expect(["duplicate", "evidence-aggregated"]).toContain(second.outcome);
    expect(signals).toHaveLength(1);
  });

  it("two providers reporting the same event → one signal, two evidence records", async () => {
    const { store, evidence } = makeFakeStore(ORG_A);

    const gh = hiringCandidate("greenhouse-board", "https://boards.greenhouse.io/acme");
    await persistCandidate(ORG_A, null, decideCandidate(gh), [], store);

    // Lever reports the same real-world activity (identical type + title
    // tokens + same event day) → anchor-3 identity match.
    const lv = hiringCandidate("lever-board", "https://jobs.lever.co/acme");
    const stored = [
      {
        id: "sig-1",
        signal_type: gh.signalType,
        title: gh.title,
        source_url: gh.sourceUrl,
        provider: gh.provider,
        provider_signal_id: gh.sourceRecordId,
        detected_at: gh.detectedAt,
        occurred_at: gh.occurredAt, // identity compares EVENT days
      },
    ];
    const outcome = await persistCandidate(ORG_A, null, decideCandidate(lv), stored, store);

    // The lever event must NOT become a second user-visible signal; its
    // evidence is attached to the existing one instead.
    expect(["duplicate", "evidence-aggregated"]).toContain(outcome.outcome);
    expect(outcome.signalId).toBe("sig-1");
    expect(evidence.length).toBe(2); // aggregated, not a second signal
  });

  it("concurrent duplicate insert loses on the dedupe-key constraint and aggregates evidence", async () => {
    const { store, signals, evidence } = makeFakeStore(ORG_A);
    const candidate = hiringCandidate("greenhouse-board", "https://boards.greenhouse.io/acme");
    const decision = decideCandidate(candidate);

    // Job A inserts successfully.
    await persistCandidate(ORG_A, null, decision, [], store);
    // Job B (concurrent) has a stale snapshot — no anchor match — but its
    // INSERT hits UNIQUE (organization_id, dedupe_key) → null → aggregation.
    const outcome = await persistCandidate(ORG_A, null, decision, [], store);
    expect(outcome.outcome).toBe("evidence-aggregated");
    expect(signals).toHaveLength(1);
    expect(evidence.length).toBeGreaterThanOrEqual(2);
  });

  it("organization isolation: org B cannot see or reuse org A signals", async () => {
    const a = makeFakeStore(ORG_A);
    const candidate = hiringCandidate("greenhouse-board", "https://boards.greenhouse.io/acme");
    await persistCandidate(ORG_A, null, decideCandidate(candidate), [], a.store);

    expect(await a.store.getStoredCandidates(ORG_B, "acme.com")).toEqual([]);
    expect(await a.store.findSignalByDedupeKey(ORG_B, "anything")).toBeNull();

    const b = makeFakeStore(ORG_B);
    const createdB = await persistCandidate(ORG_B, null, decideCandidate(candidate), [], b.store);
    expect(createdB.outcome).toBe("created");
    expect(b.signals[0].organization_id).toBe(ORG_B);
    expect(a.signals[0].organization_id).toBe(ORG_A);
  });
});

describe("slug resolution policy", () => {
  it("never guesses a slug without explicit configuration", () => {
    const request: ExternalSignalDetectionRequest = { domain: "unknown-corp.com" };
    expect(resolveGreenhouseSlug(request)).toBeNull();
  });

  it("uses explicit env mapping when configured", () => {
    process.env.SIGNALS_GREENHOUSE_BOARDS = "acme.com=acme-board";
    const request: ExternalSignalDetectionRequest = { domain: "acme.com" };
    expect(resolveGreenhouseSlug(request)).toBe("acme-board");
    delete process.env.SIGNALS_GREENHOUSE_BOARDS;
  });
});

describe("provider HTTP policy", () => {
  it("classifies permanent auth failures and does NOT retry", async () => {
    let calls = 0;
    const result = await fetchProviderJson<{ ok: boolean }>("https://x.test/api", {
      providerId: "test-provider",
      maxAttempts: 3,
      sleepImpl: async () => {},
      fetchImpl: (async () => {
        calls++;
        return new Response("unauthorized", { status: 401 });
      }) as typeof fetch,
    });
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe("AUTHENTICATION_FAILED");
    expect(result.error?.retryable).toBe(false);
    expect(calls).toBe(1);
  });

  it("429 honors Retry-After and succeeds within the bounded attempts", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const result = await fetchProviderJson<{ jobs: number[] }>("https://x.test/jobs", {
      providerId: "test-provider",
      maxAttempts: 3,
      sleepImpl: async (ms) => {
        sleeps.push(ms);
      },
      fetchImpl: (async () => {
        calls++;
        if (calls === 1) {
          return new Response("slow down", { status: 429, headers: { "retry-after": "1" } });
        }
        return new Response(JSON.stringify({ jobs: [1] }), { status: 200 });
      }) as typeof fetch,
    });
    expect(result.data).toEqual({ jobs: [1] });
    expect(calls).toBe(2);
    expect(sleeps[0]).toBe(1000); // Retry-After honored, not generic backoff
  });

  it("gives up after bounded attempts on persistent rate limiting", async () => {
    let calls = 0;
    const result = await fetchProviderJson("https://x.test/jobs", {
      providerId: "test-provider",
      maxAttempts: 3,
      sleepImpl: async () => {},
      fetchImpl: (async () => {
        calls++;
        return new Response("slow down", { status: 429 });
      }) as typeof fetch,
    });
    expect(result.error?.code).toBe("RATE_LIMITED");
    expect(calls).toBe(3);
  });

  it("malformed JSON is a permanent failure — no corrupt data enters storage", async () => {
    const result = await fetchProviderJson("https://x.test/jobs", {
      providerId: "test-provider",
      fetchImpl: (async () =>
        new Response("<html>not json</html>", { status: 200 })) as typeof fetch,
    });
    expect(result.error?.code).toBe("MALFORMED_RESPONSE");
    expect(result.error?.retryable).toBe(false);
  });

  it("greenhouse adapter maps provider failure honestly instead of faking postings", async () => {
    const result = await fetchGreenhousePostings("acme", {
      maxAttempts: 1,
      fetchImpl: (async () => new Response("boom", { status: 500 })) as typeof fetch,
    });
    expect(result.postings).toBeNull();
    expect(result.errorCode).toBe("PROVIDER_UNAVAILABLE");
  });
});




