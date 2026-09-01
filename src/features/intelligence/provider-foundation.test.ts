// ============================================================================
// Prosventa Intelligence Provider Foundation - Tests
// Stage 6 - Phase 1: Data Provider & Enrichment Foundation
// ============================================================================
// Covers: A. Mock provider (dev)  B. No provider  C. Unsupported capability
// D. Provider failure  E. Organization isolation (RLS in migration)
// F. Normalized response  G. Production safety (no silent mock fallback)
//
// Run: npx tsx src/features/intelligence/provider-foundation.test.ts
// ============================================================================

process.env.INTELLIGENCE_ENABLE_MOCK = "true";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  capabilitiesFromOperations,
  providerSupportsCapability,
  assertProviderCapability,
  PROVIDER_CAPABILITIES,
} from "./capabilities";
import { resolveProviderStatus } from "./status";
import { registerMockProviderIfEnabled, mockIntelligenceProvider, MOCK_PROVIDER_ID } from "./providers/mock";
import { normalizeIntelligenceResult } from "./normalized";
import { toIntelligenceError, IntelligenceError } from "./errors";
import type { IntelligenceProvider, CompanyEnrichmentResult } from "./types";
import type { ProviderCapability } from "./capabilities";

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

// Minimal single-capability provider used to exercise capability gating (C).
class CompanyOnlyProvider implements IntelligenceProvider {
  getConfig() {
    return {
      id: "company-only",
      name: "Company Only Test Provider",
      description: "Test stub supporting only company enrichment.",
      requiresApiKey: true,
      enabled: true,
      supportedOperations: ["company_enrichment" as const],
      capabilities: ["company_enrichment", "technology_data"] as ProviderCapability[],
    };
  }
  async enrichCompany(): Promise<CompanyEnrichmentResult> {
    throw new Error("not implemented");
  }
  async enrichProspect(): Promise<never> {
    throw new Error("unsupported");
  }
  async researchCompany(): Promise<never> {
    throw new Error("unsupported");
  }
  async researchProspect(): Promise<never> {
    throw new Error("unsupported");
  }
  async getSignals(): Promise<never> {
    throw new Error("unsupported");
  }
}

const setNodeEnv = (value: string) => {
  (process.env as Record<string, string>).NODE_ENV = value;
};

async function run() {
  const originalNodeEnv = process.env.NODE_ENV;

  // ==========================================================================
  // A. Mock Provider (development)
  // ==========================================================================
  console.log("A. Mock Provider (dev):");
  setNodeEnv("development");
  assert("mock registers when enabled", registerMockProviderIfEnabled() === true);
  const mockCompany = await mockIntelligenceProvider.enrichCompany({ domain: "acme.test" });
  assert("mock enrichment returns data", typeof mockCompany.companyName === "string");
  assert(
    "mock declares full capability set",
    PROVIDER_CAPABILITIES.every((c) => providerSupportsCapability(mockIntelligenceProvider, c))
  );

  // ==========================================================================
  // B. No Provider Configured
  // ==========================================================================
  console.log("B. No Provider:");
  const missing = resolveProviderStatus({ providerId: "nonexistent-provider" });
  assert("unknown provider is not_configured", missing.status === "not_configured");
  assert("message is user-safe", missing.message === "Provider not configured.");
  assert("no fabricated capabilities", missing.capabilities.length === 0);

  // ==========================================================================
  // C. Unsupported Capability
  // ==========================================================================
  console.log("C. Unsupported Capability:");
  const companyOnly = new CompanyOnlyProvider();
  assert(
    "company-only does not support contact_data",
    !providerSupportsCapability(companyOnly, "contact_data")
  );

  let unsupportedError: IntelligenceError | null = null;
  try {
    assertProviderCapability(companyOnly, "contact_data");
  } catch (error) {
    unsupportedError = error as IntelligenceError;
  }
  assert(
    "unsupported request throws PROVIDER_UNSUPPORTED",
    unsupportedError?.code === "PROVIDER_UNSUPPORTED"
  );
  assert(
    "unsupported error hides vendor internals",
    !!unsupportedError &&
      !unsupportedError.message.includes("company-only") &&
      !unsupportedError.message.toLowerCase().includes("axios")
  );
  assert(
    "supported capability passes gate",
    (() => {
      try {
        assertProviderCapability(companyOnly, "technology_data");
        return true;
      } catch {
        return false;
      }
    })()
  );

  // ==========================================================================
  // D. Provider Failure Normalization
  // ==========================================================================
  console.log("D. Provider Failure:");
  const timeoutErr = toIntelligenceError(new Error("AxiosError: timeout of 15000ms exceeded"), "company-only");
  assert("timeout normalizes to PROVIDER_TIMEOUT", timeoutErr.code === "PROVIDER_TIMEOUT");
  const authErr = toIntelligenceError(new Error("Request failed with status code 401"), "company-only");
  assert("auth failure normalizes to AUTHENTICATION_FAILED", authErr.code === "AUTHENTICATION_FAILED");
  const rateErr = toIntelligenceError(new Error("429 too many requests"), "company-only");
  assert("rate limit normalizes to RATE_LIMITED", rateErr.code === "RATE_LIMITED");
  assert("retryable flags set correctly", timeoutErr.retryable === true && authErr.retryable === false);
  const rawLeakCheck = toIntelligenceError(new Error("secret-key sk-live-abcdef123456 invalid"), "company-only");
  assert(
    "raw vendor message not exposed verbatim",
    !rawLeakCheck.message.includes("sk-live-abcdef123456")
  );

  // Disabled mock must refuse to fabricate data rather than silently return it.
  setNodeEnv("production");
  let disabledRefused = false;
  try {
    await mockIntelligenceProvider.enrichCompany({ domain: "acme.test" });
  } catch {
    disabledRefused = true;
  }
  assert("disabled mock refuses to fabricate data", disabledRefused);

  // ==========================================================================
  // E. Organization Isolation (migration-level verification)
  // ==========================================================================
  console.log("E. Organization Isolation:");
  const migrationSql = readFileSync(
    join(process.cwd(), "supabase", "migrations", "20260824000001_create_organization_provider_configs.sql"),
    "utf8"
  );
  assert("org provider config table enables RLS", /ENABLE ROW LEVEL SECURITY/.test(migrationSql));
  assert(
    "RLS scoped to organization_members + auth.uid()",
    /om\.organization_id = organization_provider_configs\.organization_id/.test(migrationSql) &&
      /om\.user_id = auth\.uid\(\)/.test(migrationSql)
  );
  assert(
    "usage metadata column added for credit preparation",
    /ADD COLUMN IF NOT EXISTS usage_metadata JSONB/.test(migrationSql)
  );

  // ==========================================================================
  // F. Normalized Response
  // ==========================================================================
  console.log("F. Normalized Response:");
  setNodeEnv("development");
  const normalized = normalizeIntelligenceResult(mockCompany, {
    provider: MOCK_PROVIDER_ID,
    confidence: mockCompany.confidence,
  });
  assert(
    "provider response wrapped in internal envelope",
    normalized.provider === MOCK_PROVIDER_ID && normalized.data === mockCompany
  );
  assert("timestamp recorded", !Number.isNaN(new Date(normalized.timestamp).getTime()));
  assert("confidence preserved", normalized.confidence === mockCompany.confidence);

  const derived = capabilitiesFromOperations(["company_enrichment"]);
  assert(
    "capabilities derived from operations only include supported ones",
    derived.includes("company_enrichment") &&
      derived.includes("technology_data") &&
      !derived.includes("business_signals")
  );

  // ==========================================================================
  // G. Production Safety (no silent mock fallback)
  // ==========================================================================
  console.log("G. Production Safety:");
  setNodeEnv("production");
  const prodStatus = resolveProviderStatus({ providerId: "mock" });
  assert("production reports mock as not configured", prodStatus.status === "not_configured");
  assert(
    "production prompts for a real provider",
    prodStatus.message.includes("Configure a real provider")
  );
  setNodeEnv(originalNodeEnv);

  // ==========================================================================
  console.log("\n" + "-".repeat(60));
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});
