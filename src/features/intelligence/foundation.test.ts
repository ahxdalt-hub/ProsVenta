// ============================================================================
// Prosventa Intelligence Foundation - Tests
// Stage 5 - Phase 1: Intelligence Foundation
// ============================================================================
// Practical tests for the foundation modules. Follows the CJS-compatible
// script pattern (async main wrapper, relative imports only).
//
// Run: npx tsx src/features/intelligence/foundation.test.ts
// ============================================================================

process.env.INTELLIGENCE_ENABLE_MOCK = "true";

import { normalizeIntelligenceResult, checkFreshness } from "./normalized";
import { IntelligenceError, toIntelligenceError, validateDomain } from "./errors";
import { withRetry, shouldRetry, getBackoffDelay, DEFAULT_RETRY_CONFIG } from "./retry";
import { isValidJobTransition, normalizeJobStatus, shouldCreateJob, shouldUseExistingEnrichment } from "./job-state";
import { mockIntelligenceProvider, MOCK_PROVIDER_ID, registerMockProviderIfEnabled } from "./providers/mock";

let passed = 0;
let failed = 0;

const sleepFn = async () => {};

function assert(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name}`);
  }
}

async function run() {
  // ==========================================================================
  // 1. Provider Adapter Contract
  // ==========================================================================
  console.log("Provider Adapter Contract:");
  assert(
    "mock provider implements contract",
    typeof mockIntelligenceProvider.getConfig === "function"
  );
  assert(
    "mock provider config id is 'mock'",
    mockIntelligenceProvider.getConfig().id === MOCK_PROVIDER_ID
  );
  assert(
    "mock provider supports all 5 operations",
    mockIntelligenceProvider.getConfig().supportedOperations.length === 5
  );
  assert(
    "mock provider is disabled by default",
    mockIntelligenceProvider.getConfig().enabled === false
  );
  assert(
    "registerMockProviderIfEnabled returns true when enabled",
    registerMockProviderIfEnabled() === true
  );

  // ==========================================================================
  // 2. Successful Provider Response Normalization
  // ==========================================================================
  console.log("Normalization (normalizeIntelligenceResult):");
  const normalized = normalizeIntelligenceResult(
    { companyName: "Acme", domain: "acme.com" },
    { provider: "mock", confidence: 87 }
  );
  assert("provider preserved", normalized.provider === "mock");
  assert("confidence preserved", normalized.confidence === 87);
  assert("partial defaults to false", normalized.partial === false);
  assert("warnings default to empty", normalized.warnings.length === 0);
  assert(
    "data payload preserved",
    (normalized.data as { companyName: string }).companyName === "Acme"
  );
  assert("timestamp is ISO", !Number.isNaN(new Date(normalized.timestamp).getTime()));

  // ==========================================================================
  // 3. Provider Failure / Error Normalization
  // ==========================================================================
  console.log("Provider Failure (toIntelligenceError):");
  const timeoutError = toIntelligenceError(new Error("request timed out after 10s"), "mock");
  assert("timeout maps to PROVIDER_TIMEOUT", timeoutError.code === "PROVIDER_TIMEOUT");
  assert("timeout is retryable", timeoutError.retryable === true);

  const authError = toIntelligenceError(new Error("401 api key invalid"), "mock");
  assert("auth maps to AUTHENTICATION_FAILED", authError.code === "AUTHENTICATION_FAILED");
  assert("auth is not retryable", authError.retryable === false);

  const unknownError = toIntelligenceError(new Error("something weird happened"), "mock");
  assert(
    "unknown maps to UNKNOWN_PROVIDER_ERROR",
    unknownError.code === "UNKNOWN_PROVIDER_ERROR"
  );
  assert(
    "error is an IntelligenceError instance",
    unknownError instanceof IntelligenceError
  );

  // ==========================================================================
  // 4. Malformed Provider Response
  // ==========================================================================
  console.log("Malformed Response:");
  const malformed = toIntelligenceError(new Error("malformed response body"), "mock");
  assert("malformed maps to MALFORMED_RESPONSE", malformed.code === "MALFORMED_RESPONSE");
  assert("malformed is not retryable", malformed.retryable === false);

  const invalidDomain = validateDomain("not a domain");
  assert(
    "invalid domain returns error",
    invalidDomain !== null && invalidDomain.code === "INVALID_DOMAIN"
  );
  const validDomain = validateDomain("example.com");
  assert("valid domain returns null", validDomain === null);

  // ==========================================================================
  // 5. Retry Behavior
  // ==========================================================================
  console.log("Retry Behavior (withRetry):");
  let callCount = 0;
  const flaky = async () => {
    callCount++;
    if (callCount < 3) throw new IntelligenceError("PROVIDER_TIMEOUT", { provider: "mock" });
    return "ok";
  };
  const retryResult = await withRetry<string>({
    fn: flaky,
    config: { ...DEFAULT_RETRY_CONFIG, jitter: false },
    sleepFn,
  });
  assert("retry succeeds after transient failure", retryResult.succeeded === true);
  assert("retry data returned", retryResult.data === "ok");
  assert("retry attempted 3 times", retryResult.metadata.attempts === 3);
  assert("retried flag is true", retryResult.metadata.retried === true);

  let permanentCalls = 0;
  const permanent = async () => {
    permanentCalls++;
    throw new IntelligenceError("AUTHENTICATION_FAILED", { provider: "mock" });
  };
  const permanentResult = await withRetry<string>({
    fn: permanent,
    config: { ...DEFAULT_RETRY_CONFIG, jitter: false },
    sleepFn,
  });
  assert("non-retryable fails immediately", permanentResult.succeeded === false);
  assert("non-retryable did not multiply calls", permanentCalls === 1);

  assert(
    "shouldRetry false at max attempts",
    shouldRetry(new IntelligenceError("PROVIDER_TIMEOUT"), 3) === false
  );
  assert(
    "shouldRetry true before max",
    shouldRetry(new IntelligenceError("PROVIDER_TIMEOUT"), 1) === true
  );
  assert("backoff attempt 1 is 0", getBackoffDelay(1) === 0);
  assert(
    "backoff attempt 2 is base*2 (no jitter)",
    getBackoffDelay(2, { ...DEFAULT_RETRY_CONFIG, jitter: false }) === 1000
  );

  // ==========================================================================
  // 6. Job State Transitions
  // ==========================================================================
  console.log("Job State Transitions:");
  assert("pending -> processing valid", isValidJobTransition("pending", "processing"));
  assert("pending -> completed invalid", isValidJobTransition("pending", "completed") === false);
  assert("processing -> completed valid", isValidJobTransition("processing", "completed"));
  assert("processing -> failed valid", isValidJobTransition("processing", "failed"));
  assert("completed -> anything invalid", isValidJobTransition("completed", "processing") === false);
  assert("failed -> processing valid (retry)", isValidJobTransition("failed", "processing"));
  assert("normalize unknown to pending", normalizeJobStatus("weird") === "pending");
  assert("normalize valid preserved", normalizeJobStatus("completed") === "completed");

  // ==========================================================================
  // 7. Duplicate Job Prevention
  // ==========================================================================
  console.log("Duplicate Job Prevention:");
  const activeJobs = [
    { id: "job-1", status: "processing" as const, attempt_count: 1, max_attempts: 3 },
  ];
  const duplicateCheck = shouldCreateJob({ existingJobs: activeJobs });
  assert("active job blocks new job", duplicateCheck.shouldCreate === false);
  assert("active job id reported", duplicateCheck.activeJobId === "job-1");

  const completedJobs = [
    { id: "job-2", status: "completed" as const, attempt_count: 1, max_attempts: 3 },
  ];
  const freshCheck = shouldCreateJob({ existingJobs: completedJobs });
  assert("completed job blocks default", freshCheck.shouldCreate === false);
  const refreshCheck = shouldCreateJob({ existingJobs: completedJobs }, { refresh: true });
  assert("completed job permits refresh", refreshCheck.shouldCreate === true);

  const exhaustedJobs = [
    { id: "job-3", status: "failed" as const, attempt_count: 3, max_attempts: 3 },
  ];
  const exhaustedCheck = shouldCreateJob({ existingJobs: exhaustedJobs });
  assert("exhausted failed job permits retry", exhaustedCheck.shouldCreate === true);

  // ==========================================================================
  // 8. Freshness / Duplicate Prevention Foundation
  // ==========================================================================
  console.log("Freshness (checkFreshness / shouldUseExistingEnrichment):");
  const now = new Date("2025-01-01T00:00:00.000Z").getTime();
  const freshly = checkFreshness({ retrievedAt: new Date(now - 60_000).toISOString(), now });
  assert("1 minute old is fresh", freshly.isFresh === true);
  const stale = checkFreshness({
    retrievedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    now,
  });
  assert("2 days old is stale", stale.isStale === true);
  const missing = checkFreshness({ retrievedAt: null, now });
  assert("missing data is not fresh", missing.isFresh === false);

  const useFresh = shouldUseExistingEnrichment({
    enrichedAt: new Date(now - 30_000).toISOString(),
    isUsable: true,
    now,
  });
  assert("fresh enrichment reused", useFresh.useExisting === true && useFresh.reason === "fresh");
  const useStale = shouldUseExistingEnrichment({
    enrichedAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isUsable: true,
    now,
  });
  assert("stale enrichment refreshed", useStale.useExisting === false && useStale.reason === "stale");

  // ==========================================================================
  // 9. Mock Provider Behavior (deterministic sample data)
  // ==========================================================================
  console.log("Mock Provider Behavior:");
  const companyA = await mockIntelligenceProvider.enrichCompany({ domain: "acme.com" });
  const companyB = await mockIntelligenceProvider.enrichCompany({ domain: "acme.com" });
  assert("mock enrichment deterministic", companyA.industry === companyB.industry);
  assert("mock returns company name", typeof companyA.companyName === "string");
  assert("mock confidence is 100", companyA.confidence === 100);

  const prospect = await mockIntelligenceProvider.enrichProspect({
    domain: "acme.com",
    contactName: "Jane Doe",
  });
  assert("mock prospect preserves name", prospect.contactName === "Jane Doe");
  assert("mock prospect has email", prospect.contactEmail !== null);

  const research = await mockIntelligenceProvider.researchCompany({ domain: "acme.com" });
  assert("mock research has sources", research.sources.length > 0);
  assert("mock research provider attributed", research.sources[0].provider === MOCK_PROVIDER_ID);

  const signals = await mockIntelligenceProvider.getSignals({ domain: "acme.com" });
  assert("mock signals returned", signals.signals.length === 1);

  // ==========================================================================
  console.log("\n" + "-".repeat(60));
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});