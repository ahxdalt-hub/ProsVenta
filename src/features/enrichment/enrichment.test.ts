// ============================================================================
// Prosventa Enrichment Foundation — Tests
// Feature 2: Enrichment - Phase 1 of 4
// ============================================================================
// Covers the pure foundation only (no DB, no providers):
//   A. Canonical status model + transitions + DB-status mapping
//   B. Normalized enrichment response (safe-missing normalization)
//   C. Field accounting (returned/partial detection)
//   D. Idempotency key construction
// ============================================================================

import { describe, expect, it } from "vitest";

import { buildEnrichmentIdempotencyKey } from "./idempotency";
import {
  cleanDomain,
  cleanString,
  collectReturnedFields,
  isPartialResponse,
  normalizeEnrichmentPayload,
} from "./normalize";
import {
  ENRICHMENT_OPERATION_STATUSES,
  isDisplayableEnrichmentStatus,
  isValidEnrichmentTransition,
  mapDbEnrichmentStatus,
  mapDbJobStatus,
} from "./status";

// ============================================================================
// A. Status model
// ============================================================================

describe("enrichment status model", () => {
  it("exposes exactly the six controlled states", () => {
    expect(ENRICHMENT_OPERATION_STATUSES).toEqual([
      "not_enriched",
      "queued",
      "processing",
      "completed",
      "partial",
      "failed",
    ]);
  });

  it("allows only the documented happy-path transitions", () => {
    expect(isValidEnrichmentTransition("not_enriched", "queued")).toBe(true);
    expect(isValidEnrichmentTransition("queued", "processing")).toBe(true);
    expect(isValidEnrichmentTransition("processing", "completed")).toBe(true);
    expect(isValidEnrichmentTransition("processing", "partial")).toBe(true);
    expect(isValidEnrichmentTransition("processing", "failed")).toBe(true);
  });

  it("blocks illegal transitions", () => {
    expect(isValidEnrichmentTransition("not_enriched", "completed")).toBe(false);
    expect(isValidEnrichmentTransition("completed", "completed")).toBe(false);
    expect(isValidEnrichmentTransition("failed", "completed")).toBe(false);
    expect(isValidEnrichmentTransition("queued", "not_enriched")).toBe(false);
  });

  it("permits explicit refresh/retry back to queued", () => {
    expect(isValidEnrichmentTransition("completed", "queued")).toBe(true);
    expect(isValidEnrichmentTransition("partial", "queued")).toBe(true);
    expect(isValidEnrichmentTransition("failed", "queued")).toBe(true);
  });

  it("maps legacy/unknown DB statuses safely onto the canonical model", () => {
    expect(mapDbEnrichmentStatus(null)).toBe("not_enriched");
    expect(mapDbEnrichmentStatus(undefined)).toBe("not_enriched");
    expect(mapDbEnrichmentStatus("none")).toBe("not_enriched");
    expect(mapDbEnrichmentStatus("queued")).toBe("queued");
    expect(mapDbEnrichmentStatus("pending")).toBe("queued");
    expect(mapDbEnrichmentStatus("processing")).toBe("processing");
    expect(mapDbEnrichmentStatus("completed")).toBe("completed");
    expect(mapDbEnrichmentStatus("completed", { hasPartialData: true })).toBe("partial");
    expect(mapDbEnrichmentStatus("partial")).toBe("partial");
    expect(mapDbEnrichmentStatus("failed")).toBe("failed");
    // Unknown values never crash the UI.
    expect(mapDbEnrichmentStatus("something_new")).toBe("not_enriched");
  });

  it("maps job statuses onto the same lifecycle", () => {
    expect(mapDbJobStatus("pending")).toBe("queued");
    expect(mapDbJobStatus("processing")).toBe("processing");
    expect(mapDbJobStatus("completed")).toBe("completed");
    expect(mapDbJobStatus("failed")).toBe("failed");
    expect(mapDbJobStatus(null)).toBe("not_enriched");
  });

  it("identifies displayable data states", () => {
    expect(isDisplayableEnrichmentStatus("completed")).toBe(true);
    expect(isDisplayableEnrichmentStatus("partial")).toBe(true);
    expect(isDisplayableEnrichmentStatus("queued")).toBe(false);
    expect(isDisplayableEnrichmentStatus("not_enriched")).toBe(false);
  });
});

// ============================================================================
// B. Normalization
// ============================================================================

describe("normalizeEnrichmentPayload", () => {
  it("returns an all-null safe structure for empty/garbage input", () => {
    for (const input of [null, undefined, "nope", 42, {}, []]) {
      const r = normalizeEnrichmentPayload(input);
      expect(r.person.fullName).toBeNull();
      expect(r.contact.email).toBeNull();
      expect(r.company.name).toBeNull();
      expect(r.company.employeeCount).toBeNull();
      expect(r.technology.technologies).toEqual([]);
      expect(r.metadata.warnings).toEqual([]);
    }
  });

  it("normalizes a flat provider payload", () => {
    const r = normalizeEnrichmentPayload({
      contactName: "  Jane Doe  ",
      jobTitle: "VP Engineering",
      contactEmail: "jane@acme.com",
      companyDomain: "HTTPS://WWW.Acme.COM/about",
      employeeCount: 1200.7,
      technologies: ["React", " Postgres ", 123],
    });
    expect(r.person.fullName).toBe("Jane Doe");
    expect(r.person.jobTitle).toBe("VP Engineering");
    expect(r.contact.email).toBe("jane@acme.com");
    expect(r.company.domain).toBe("acme.com");
    expect(r.company.website).toBe("https://acme.com");
    expect(r.company.employeeCount).toBe(1201);
    expect(r.technology.technologies).toEqual(["React", "Postgres"]);
  });

  it("normalizes an already-sectioned payload", () => {
    const r = normalizeEnrichmentPayload(
      {
        person: { fullName: "John Smith" },
        contact: { email: "bad-email" },
        company: { name: "Globex" },
        confidence: 250,
        providerRecordId: "prov-1",
      },
      { provider: "mock" }
    );
    expect(r.person.fullName).toBe("John Smith");
    expect(r.contact.email).toBeNull(); // invalid shape rejected, not guessed
    expect(r.company.name).toBe("Globex");
    expect(r.metadata.confidence).toBe(100); // clamped
    expect(r.metadata.providerRecordId).toBe("prov-1");
  });

  it("never invents emails or domains", () => {
    const r = normalizeEnrichmentPayload({
      contactEmail: "not-an-email",
      domain: "no spaces here",
    });
    expect(r.contact.email).toBeNull();
    expect(r.company.domain).toBeNull();
    expect(r.company.website).toBeNull();
  });
});

describe("scalar cleaners", () => {
  it("cleanString trims and rejects empties/non-strings", () => {
    expect(cleanString("  x ")).toBe("x");
    expect(cleanString("   ")).toBeNull();
    expect(cleanString(5)).toBeNull();
  });

  it("cleanDomain strips protocol/path/www and lowercases", () => {
    expect(cleanDomain("https://www.Example.com/path?q=1")).toBe("example.com");
    expect(cleanDomain("not a domain")).toBeNull();
    expect(cleanDomain("localhost")).toBeNull();
  });
});

// ============================================================================
// C. Field accounting
// ============================================================================

describe("field accounting", () => {
  it("reports exactly which requested fields were returned", () => {
    const r = normalizeEnrichmentPayload({
      contactName: "Jane Doe",
      jobTitle: "CTO",
      companyDomain: "acme.com",
    });
    const returned = collectReturnedFields(r, [
      "person.fullName",
      "person.jobTitle",
      "contact.email",
      "company.domain",
    ]);
    expect(returned).toEqual(["person.fullName", "person.jobTitle", "company.domain"]);
  });

  it("detects partial responses", () => {
    const full = normalizeEnrichmentPayload({
      fullName: "A", jobTitle: "B", seniority: "C", profileUrl: "https://x.y",
      location: "D", email: "a@b.c", phone: "1", name: "E", domain: "e.co",
      industry: "F", employeeCount: 1, description: "G", website: "https://e.co",
    });
    expect(isPartialResponse(full)).toBe(false);

    const partial = normalizeEnrichmentPayload({ fullName: "Only a name" });
    expect(isPartialResponse(partial)).toBe(true);

    const empty = normalizeEnrichmentPayload({});
    expect(isPartialResponse(empty)).toBe(false); // nothing returned ≠ partial
  });
});

// ============================================================================
// D. Idempotency
// ============================================================================

describe("buildEnrichmentIdempotencyKey", () => {
  const base = {
    prospectId: "p-1",
    operation: "prospect_enrichment" as const,
    provider: "apollo",
  };

  it("is stable within the same window and distinct across windows/scopes", () => {
    const t = 1_700_000_000_000;
    const k1 = buildEnrichmentIdempotencyKey({ ...base, now: t });
    const k2 = buildEnrichmentIdempotencyKey({ ...base, now: t + 1000 });
    expect(k1).toBe(k2);

    const k3 = buildEnrichmentIdempotencyKey({ ...base, now: t, scope: "org-a" });
    expect(k3).not.toBe(k1);

    const k4 = buildEnrichmentIdempotencyKey({ ...base, now: t + 60_000 });
    expect(k4).not.toBe(k1);
  });

  it("differs per prospect / operation / provider", () => {
    const t = 1_700_000_000_000;
    const keys = new Set([
      buildEnrichmentIdempotencyKey({ ...base, now: t }),
      buildEnrichmentIdempotencyKey({ ...base, now: t, prospectId: "p-2" }),
      buildEnrichmentIdempotencyKey({ ...base, now: t, operation: "company_enrichment" }),
      buildEnrichmentIdempotencyKey({ ...base, now: t, provider: "clearbit" }),
    ]);
    expect(keys.size).toBe(4);
  });
});

