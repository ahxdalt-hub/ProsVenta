// ============================================================================
// Prosventa Company Enrichment — Tests
// Stage 5 — Phase 2: Company Enrichment
// ============================================================================
// Practical tests for the company enrichment module. Follows the CJS-compatible
// script pattern (async main wrapper, relative imports only).
//
// Run: npx tsx src/features/intelligence/company-enrichment/company-enrichment.test.ts
// ============================================================================

process.env.INTELLIGENCE_ENABLE_MOCK = "true";

import { normalizeDomain } from "../domain";
import { calculateConfidence, confidenceLabel } from "./confidence";
import { detectPartialResult } from "./partial";
import { shouldCreateJob, shouldUseExistingEnrichment } from "../job-state";
import { toIntelligenceError, IntelligenceError } from "../errors";
import { mockIntelligenceProvider, MOCK_PROVIDER_ID } from "../providers/mock";
import type { CompanyEnrichmentResult } from "../types";

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name}`);
  }
}

function emptyResult(): CompanyEnrichmentResult {
  return {
    companyName: null,
    domain: null,
    website: null,
    description: null,
    industry: null,
    employeeCount: null,
    employeeRange: null,
    headquarters: null,
    country: null,
    city: null,
    companyType: null,
    foundedYear: null,
    logoUrl: null,
    linkedin: null,
    revenue: null,
    technologies: [],
    confidence: null,
  };
}

async function run() {
  // ==========================================================================
  // 1. Domain Normalization
  // ==========================================================================
  console.log("Domain Normalization:");
  assert("plain domain preserved", normalizeDomain("acme.com") === "acme.com");
  assert("www stripped", normalizeDomain("www.acme.com") === "acme.com");
  assert("protocol stripped", normalizeDomain("https://acme.com") === "acme.com");
  assert("trailing slash stripped", normalizeDomain("acme.com/") === "acme.com");
  assert("path stripped", normalizeDomain("https://www.acme.com/about") === "acme.com");
  assert("uppercase lowercased", normalizeDomain("ACME.COM") === "acme.com");
  assert("subdomain preserved", normalizeDomain("sub.acme.com") === "sub.acme.com");
  assert("invalid text rejected", normalizeDomain("not a domain") === null);
  assert("empty rejected", normalizeDomain("") === null);
  assert("port rejected", normalizeDomain("acme.com:8080") === null);

  // ==========================================================================
  // 2. Confidence Calculation
  // ==========================================================================
  console.log("Confidence Calculation:");
  const full = emptyResult();
  full.companyName = "Acme";
  full.domain = "acme.com";
  full.website = "https://acme.com";
  full.description = "A company";
  full.industry = "Software";
  full.employeeCount = 120;
  full.employeeRange = "51-200";
  full.headquarters = "Dubai, UAE";
  full.country = "AE";
  full.city = "Dubai";
  full.companyType = "Private";
  full.foundedYear = 2018;
  full.technologies = ["AWS", "React"];

  assert(
    "provider confidence preferred",
    calculateConfidence(87, full) === 87
  );
  assert(
    "provider confidence clamped to 100",
    calculateConfidence(150, full) === 100
  );
  const deterministic = calculateConfidence(null, full);
  assert(
    "deterministic fallback is 100 for complete result",
    deterministic === 100
  );
  const partial = emptyResult();
  partial.companyName = "Acme";
  partial.domain = "acme.com";
  const partialConfidence = calculateConfidence(null, partial);
  assert(
    "deterministic fallback lower for partial result",
    partialConfidence !== null && partialConfidence < 100
  );
  assert(
    "empty result confidence is null",
    calculateConfidence(null, emptyResult()) === null
  );
  assert("confidence label high", confidenceLabel(90) === "High");
  assert("confidence label medium", confidenceLabel(60) === "Medium");
  assert("confidence label low", confidenceLabel(30) === "Low");
  assert("confidence label unknown", confidenceLabel(null) === "Unknown");

  // ==========================================================================
  // 3. Partial Result Detection
  // ==========================================================================
  console.log("Partial Result Detection:");
  const complete = detectPartialResult(full);
  assert("complete result not partial", complete.partial === false);
  assert("complete result no warnings", complete.warnings.length === 0);

  const partialResult = detectPartialResult(partial);
  assert("partial result flagged", partialResult.partial === true);
  assert(
    "partial result has warnings",
    partialResult.warnings.length > 0
  );
  assert(
    "partial warns about missing industry",
    partialResult.warnings.some((w) => w.includes("Industry"))
  );

  // ==========================================================================
  // 4. Duplicate Job Prevention
  // ==========================================================================
  console.log("Duplicate Job Prevention:");
  const activeJobs = [
    { id: "job-1", status: "processing" as const, attempt_count: 1, max_attempts: 3 },
  ];
  const dupCheck = shouldCreateJob({ existingJobs: activeJobs });
  assert("active job blocks new job", dupCheck.shouldCreate === false);
  assert("active job id reported", dupCheck.activeJobId === "job-1");

  const completedJobs = [
    { id: "job-2", status: "completed" as const, attempt_count: 1, max_attempts: 3 },
  ];
  assert(
    "completed job blocks default",
    shouldCreateJob({ existingJobs: completedJobs }).shouldCreate === false
  );
  assert(
    "completed job permits refresh",
    shouldCreateJob({ existingJobs: completedJobs }, { refresh: true }).shouldCreate === true
  );

  // ==========================================================================
  // 5. Freshness / Cache Behavior
  // ==========================================================================
  console.log("Freshness / Cache Behavior:");
  const now = new Date("2025-01-01T00:00:00.000Z").getTime();
  const fresh = shouldUseExistingEnrichment({
    enrichedAt: new Date(now - 60_000).toISOString(),
    isUsable: true,
    now,
  });
  assert("fresh enrichment reused", fresh.useExisting === true && fresh.reason === "fresh");

  const stale = shouldUseExistingEnrichment({
    enrichedAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isUsable: true,
    now,
  });
  assert("stale enrichment refreshed", stale.useExisting === false && stale.reason === "stale");

  const missing = shouldUseExistingEnrichment({
    enrichedAt: null,
    isUsable: true,
    now,
  });
  assert("missing enrichment not reused", missing.useExisting === false && missing.reason === "missing");

  const unusable = shouldUseExistingEnrichment({
    enrichedAt: new Date(now - 60_000).toISOString(),
    isUsable: false,
    now,
  });
  assert("unusable enrichment not reused", unusable.useExisting === false && unusable.reason === "unusable");

  // ==========================================================================
  // 6. Error Normalization
  // ==========================================================================
  console.log("Error Normalization:");
  const timeout = toIntelligenceError(new Error("request timed out"), "mock");
  assert("timeout maps to PROVIDER_TIMEOUT", timeout.code === "PROVIDER_TIMEOUT");
  assert("timeout is retryable", timeout.retryable === true);

  const notFound = toIntelligenceError(new Error("company not found"), "mock");
  assert("not found maps to NOT_FOUND", notFound.code === "NOT_FOUND");
  assert("not found is not retryable", notFound.retryable === false);

  const auth = toIntelligenceError(new Error("401 invalid api key"), "mock");
  assert("auth maps to AUTHENTICATION_FAILED", auth.code === "AUTHENTICATION_FAILED");

  const malformed = toIntelligenceError(new Error("malformed response body"), "mock");
  assert("malformed maps to MALFORMED_RESPONSE", malformed.code === "MALFORMED_RESPONSE");

  const unknown = toIntelligenceError(new Error("weird"), "mock");
  assert("unknown maps to UNKNOWN_PROVIDER_ERROR", unknown.code === "UNKNOWN_PROVIDER_ERROR");
  assert("error is IntelligenceError", unknown instanceof IntelligenceError);

  // ==========================================================================
  // 7. Mock Provider Behavior
  // ==========================================================================
  console.log("Mock Provider Behavior:");
  const companyA = await mockIntelligenceProvider.enrichCompany({ domain: "acme.com" });
  const companyB = await mockIntelligenceProvider.enrichCompany({ domain: "acme.com" });
  assert("mock enrichment deterministic", companyA.industry === companyB.industry);
  assert("mock returns company name", typeof companyA.companyName === "string");
  assert("mock returns domain", companyA.domain === "acme.com");
  assert("mock returns technologies", companyA.technologies.length > 0);
  assert("mock provider id", mockIntelligenceProvider.getConfig().id === MOCK_PROVIDER_ID);

  // ==========================================================================
  console.log("\n" + "-".repeat(60));
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});