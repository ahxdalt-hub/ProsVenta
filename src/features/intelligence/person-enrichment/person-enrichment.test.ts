// ============================================================================
// Prosventa Person Enrichment — Tests
// Stage 6 - Phase 3: People & Decision-Maker Intelligence
// ============================================================================
// Practical tests for the person enrichment module. Follows the CJS-compatible
// script pattern (async main wrapper, relative imports only).
//
// Run: npx tsx src/features/intelligence/person-enrichment/person-enrichment.test.ts
// ============================================================================

process.env.INTELLIGENCE_ENABLE_MOCK = "true";

import { requirePersonIdentity } from "./identity";
import {
  normalizePersonResult,
  detectPartialPersonResult,
  calculatePersonConfidence,
} from "./normalize";
import { assessDecisionMakerRelevance } from "./relevance";
import { shouldCreateJob } from "../job-state";
import { IntelligenceError } from "../errors";
import {
  providerSupportsCapability,
  assertProviderCapability,
  capabilitiesFromOperations,
} from "../capabilities";
import { mockIntelligenceProvider } from "../providers/mock";
import type { ProspectEnrichmentResult } from "../types";

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

function emptyPerson(): ProspectEnrichmentResult {
  return {
    contactName: null,
    firstName: null,
    lastName: null,
    contactEmail: null,
    contactPhone: null,
    jobTitle: null,
    seniority: null,
    department: null,
    companyName: null,
    companyDomain: null,
    linkedin: null,
    profileUrl: null,
    location: null,
    country: null,
    city: null,
    summary: null,
    confidence: null,
  };
}

async function run() {
  // ==========================================================================
  // Identification rules (Test 2 / dangerous-merge prevention)
  // ==========================================================================
  console.log("Person Identification:");
  let threw: unknown = null;
  try {
    requirePersonIdentity({ contactName: "John Smith" });
  } catch (e) {
    threw = e;
  }
  assert("name alone is refused", threw instanceof IntelligenceError && threw.code === "INSUFFICIENT_DATA");

  const byEmail = requirePersonIdentity({ contactEmail: "jane@acme.com", contactName: "Jane Doe" });
  assert("email is strongest identifier", byEmail.strength === "email");

  const byNameCompany = requirePersonIdentity({ contactName: "John Smith", domain: "acme.com" });
  assert("name + domain accepted", byNameCompany.strength === "name_company");

  // ==========================================================================
  // Normalization — never invent data
  // ==========================================================================
  console.log("Normalization:");
  const normalized = normalizePersonResult({
    contactName: "  Jane Doe ",
    jobTitle: "CTO",
    seniority: "C-level",
    department: "Engineering",
    companyName: "Acme",
    companyDomain: "ACME.com",
    contactEmail: "not-an-email",
    confidence: 120,
    totallyUnknownField: "dropped",
  });
  assert("name trimmed", normalized.contactName === "Jane Doe");
  assert("domain lowercased", normalized.companyDomain === "acme.com");
  assert("invalid email NOT stored or invented", normalized.contactEmail === null);
  assert("unknown fields dropped", !("totallyUnknownField" in (normalized as object)));
  assert("confidence clamped to 100", normalized.confidence === 100);

  const empty = normalizePersonResult({ garbage: true });
  assert("empty payload → all-null result", Object.values(empty).every((v) => v === null));

  const partial = detectPartialPersonResult(normalized);
  assert("missing email reported as warning", partial.partial && partial.warnings.some((w) => w.includes("Work email")));

  assert("provider confidence preferred", calculatePersonConfidence(87, emptyPerson()) === 87);
  const completeness = calculatePersonConfidence(null, {
    ...emptyPerson(),
    contactName: "Jane Doe",
    jobTitle: "CTO",
    seniority: "C-level",
    department: "Engineering",
    companyName: "Acme",
    companyDomain: "acme.com",
    contactEmail: "jane@acme.com",
  });
  assert("deterministic completeness fallback (7/8)", completeness === Math.round((7 / 8) * 100));
  assert("no confidence for empty result", calculatePersonConfidence(null, emptyPerson()) === null);

  // ==========================================================================
  // Decision-maker relevance — evidence-based categories
  // ==========================================================================
  console.log("Decision-Maker Relevance:");
  const cto = assessDecisionMakerRelevance({
    ...emptyPerson(),
    jobTitle: "Chief Technology Officer",
    seniority: "C-level",
    department: "Engineering",
  });
  assert("CTO = high relevance", cto.level === "high");
  assert("reason cites actual title", cto.reasons.some((r) => r.toLowerCase().includes("chief")));

  const vpSales = assessDecisionMakerRelevance({
    ...emptyPerson(),
    jobTitle: "VP of Sales",
    seniority: "VP",
    department: "Sales",
  });
  assert("VP Sales in decision department = high", vpSales.level === "high");

  const analyst = assessDecisionMakerRelevance({
    ...emptyPerson(),
    jobTitle: "Junior Analyst",
    department: "Finance",
  });
  assert("junior analyst = low relevance", analyst.level === "low");

  const unknownPerson = assessDecisionMakerRelevance(emptyPerson());
  assert("no evidence = unknown (never fabricated)", unknownPerson.level === "unknown");
  // ==========================================================================
  // Duplicate prevention (Test 5 / Test 10 — repeated clicks)
  // ==========================================================================
  console.log("Duplicate Prevention:");
  const activeJob = shouldCreateJob({
    existingJobs: [{ id: "1", status: "processing", attempt_count: 0, max_attempts: 3 }],
  });
  assert("active job blocks a new request", activeJob.shouldCreate === false && activeJob.hasActiveJob);
  const freshTarget = shouldCreateJob({ existingJobs: [] }, { refresh: false });
  assert("no existing job → create", freshTarget.shouldCreate === true);

  // ==========================================================================
  // Capability gating (Test 4 — unsupported provider)
  // ==========================================================================
  console.log("Capability Gating:");
  assert("mock declares person_enrichment", providerSupportsCapability(mockIntelligenceProvider, "person_enrichment"));
  assert("company-only ops do NOT imply person capability",
    !capabilitiesFromOperations(["company_enrichment"]).includes("person_enrichment"));
  let capThrew: unknown = null;
  const companyOnlyProvider = {
    getConfig: () => ({
      id: "company-only",
      name: "Company Only",
      description: "Test provider",
      requiresApiKey: false,
      enabled: true,
      supportedOperations: ["company_enrichment" as const],
      capabilities: ["company_enrichment" as const],
    }),
  };
  try {
    assertProviderCapability(companyOnlyProvider as never, "person_enrichment");
  } catch (e) {
    capThrew = e;
  }
  assert("unsupported capability throws PROVIDER_UNSUPPORTED",
    capThrew instanceof IntelligenceError && capThrew.code === "PROVIDER_UNSUPPORTED");

  // ==========================================================================
  // Provider-level happy path (Test 1) with the clearly-labelled dev mock
  // ==========================================================================
  console.log("Mock Provider Person Enrichment:");
  const mockResult = await mockIntelligenceProvider.enrichProspect({
    contactEmail: "jane@acme.com",
    contactName: "Jane Doe",
    domain: "acme.com",
    companyName: "Acme",
  });
  assert("mock returns a person result", typeof mockResult === "object" && mockResult !== null);
  const mockNormalized = normalizePersonResult(mockResult);
  const relevanceFromMock = assessDecisionMakerRelevance(mockNormalized);
  assert("mock output produces an evidence-based relevance", ["high", "medium", "low", "unknown"].includes(relevanceFromMock.level));

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});



