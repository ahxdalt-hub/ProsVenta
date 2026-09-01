// ============================================================================
// Prosventa Enrichment — Display Model Tests (Phase 2)
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  detectEnrichmentCategories,
  formatFreshnessLabel,
  hasUsefulEnrichmentData,
  mergeEnrichmentResponses,
} from "./display";
import type { NormalizedEnrichmentResponse } from "./types";

function makeResponse(
  overrides: Partial<NormalizedEnrichmentResponse> = {}
): NormalizedEnrichmentResponse {
  return {
    person: {
      fullName: null,
      jobTitle: null,
      seniority: null,
      profileUrl: null,
      location: null,
    },
    contact: { email: null, phone: null },
    company: {
      name: null,
      domain: null,
      industry: null,
      employeeCount: null,
      location: null,
      description: null,
      website: null,
    },
    technology: { technologies: [] },
    metadata: {
      provider: "test",
      providerRecordId: null,
      retrievedAt: new Date().toISOString(),
      confidence: null,
      warnings: [],
    },
    ...overrides,
  };
}

describe("mergeEnrichmentResponses", () => {
  it("returns the primary response when secondary is null", () => {
    const primary = makeResponse();
    expect(mergeEnrichmentResponses(primary, null)).toBe(primary);
  });

  it("returns the secondary response when primary is null", () => {
    const secondary = makeResponse();
    expect(mergeEnrichmentResponses(null, secondary)).toBe(secondary);
  });

  it("prefers non-null values and never lets null erase data", () => {
    const person = makeResponse({
      person: {
        fullName: "Jane Doe",
        jobTitle: "CTO",
        seniority: null,
        profileUrl: null,
        location: null,
      },
      contact: { email: "jane@acme.com", phone: null },
    });
    const company = makeResponse({
      company: {
        name: "Acme",
        domain: "acme.com",
        industry: "Software",
        employeeCount: 120,
        location: null,
        description: "Makes things",
        website: "https://acme.com",
      },
      technology: { technologies: ["react"] },
    });

    const merged = mergeEnrichmentResponses(person, company)!;
    expect(merged.person.fullName).toBe("Jane Doe");
    expect(merged.contact.email).toBe("jane@acme.com");
    expect(merged.company.name).toBe("Acme");
    expect(merged.company.industry).toBe("Software");
    expect(merged.company.description).toBe("Makes things");
    expect(merged.technology.technologies).toEqual(["react"]);
    // Null on one side never erases the other side's value.
    expect(merged.person.jobTitle).toBe("CTO");
  });
});

describe("detectEnrichmentCategories / hasUsefulEnrichmentData", () => {
  it("reports no categories for an empty response", () => {
    const cats = detectEnrichmentCategories(makeResponse());
    expect(cats).toEqual({
      person: false,
      company: false,
      contact: false,
      technology: false,
    });
    expect(hasUsefulEnrichmentData(makeResponse())).toBe(false);
    expect(hasUsefulEnrichmentData(null)).toBe(false);
  });

  it("detects only genuinely present categories", () => {
    const response = makeResponse({
      person: {
        fullName: "J",
        jobTitle: null,
        seniority: null,
        profileUrl: null,
        location: null,
      },
    });
    const cats = detectEnrichmentCategories(response);
    expect(cats.person).toBe(true);
    expect(cats.company).toBe(false);
    expect(hasUsefulEnrichmentData(response)).toBe(true);
  });
});

describe("formatFreshnessLabel", () => {
  it("returns null when there is no timestamp", () => {
    expect(formatFreshnessLabel(null)).toBeNull();
    expect(formatFreshnessLabel("not-a-date")).toBeNull();
  });

  it("formats real ages without inventing data", () => {
    const now = new Date();
    expect(formatFreshnessLabel(now.toISOString())).toBe("today");
    const daysAgo3 = new Date(Date.now() - 4 * 86_400_000).toISOString();
    expect(formatFreshnessLabel(daysAgo3)).toMatch(/days ago/);
  });
});
