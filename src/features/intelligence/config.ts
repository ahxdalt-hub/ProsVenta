// ============================================================================
// Prosventa Intelligence Provider Configuration
// Stage 5 - Phase 1: Intelligence Foundation
// ============================================================================
// Server-side configuration for intelligence providers.
//
// Rules:
//   - Provider credentials come from environment variables, NEVER hardcoded.
//   - Secrets must never be exposed via NEXT_PUBLIC_* variables.
//   - Provider is optional in this phase; no fake key is required to run.
// ============================================================================

export type ProviderKind =
  | "company_enrichment"
  | "prospect_enrichment"
  | "research"
  | "intent"
  | "ai";

export interface ProviderEnvConfig {
  /** Provider id (e.g. "clearbit", "apollo", "mock") */
  id: string;
  /** Provider kind */
  kind: ProviderKind;
  /** Environment variable holding the API key (server-side only) */
  apiKeyEnvVar: string | null;
  /** Whether the key is currently set in the environment */
  isConfigured: boolean;
  /** Timeout in milliseconds for provider calls (default 15s) */
  timeoutMs: number;
}

// ============================================================================
// Server-side env access (never expose secrets to the client)
// ============================================================================

function readEnv(name: string): string | null {
  // In Next.js server context this is always the server-side env.
  return process.env[name] ?? null;
}

// ============================================================================
// Provider Resolution
// ============================================================================

export const INTELLIGENCE_ENV = {
  companyProviderId: "INTELLIGENCE_COMPANY_PROVIDER",
  prospectProviderId: "INTELLIGENCE_PROSPECT_PROVIDER",
  researchProviderId: "COMPANY_RESEARCH_PROVIDER",
  companyApiKey: "INTELLIGENCE_COMPANY_API_KEY",
  prospectApiKey: "INTELLIGENCE_PROSPECT_API_KEY",
  aiApiKey: "INTELLIGENCE_AI_API_KEY",
  timeoutMs: "INTELLIGENCE_PROVIDER_TIMEOUT_MS",
} as const;

export interface IntelligenceEnvironment {
  /** Active company enrichment provider id (env or default) */
  companyProviderId: string;
  /** Active prospect enrichment provider id (env or default) */
  prospectProviderId: string;
  /** Active research provider id (env or default) */
  researchProviderId: string;
  /** Whether a company enrichment key is configured */
  companyProviderConfigured: boolean;
  /** Whether a prospect enrichment key is configured */
  prospectProviderConfigured: boolean;
  /** Whether an AI/research key is configured */
  aiProviderConfigured: boolean;
  /** Provider timeout in ms */
  timeoutMs: number;
}

/**
 * Reads the current intelligence environment configuration.
 * Safe to call from server components/actions only.
 */
export function getIntelligenceEnvironment(): IntelligenceEnvironment {
  const companyProviderId =
    readEnv(INTELLIGENCE_ENV.companyProviderId)?.trim() || "company-enrichment";
  const prospectProviderId =
    readEnv(INTELLIGENCE_ENV.prospectProviderId)?.trim() || "prospect-enrichment";
  const researchProviderId =
    readEnv(INTELLIGENCE_ENV.researchProviderId)?.trim() || "grounded-v1";

  const timeoutRaw = readEnv(INTELLIGENCE_ENV.timeoutMs);
  const timeoutMs = timeoutRaw ? parseInt(timeoutRaw, 10) : 15_000;

  return {
    companyProviderId,
    prospectProviderId,
    researchProviderId,
    companyProviderConfigured: Boolean(readEnv(INTELLIGENCE_ENV.companyApiKey)),
    prospectProviderConfigured: Boolean(readEnv(INTELLIGENCE_ENV.prospectApiKey)),
    aiProviderConfigured: Boolean(readEnv(INTELLIGENCE_ENV.aiApiKey)),
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15_000,
  };
}

/**
 * Resolves a provider's environment configuration by id/kind.
 * Returns null for unknown providers so callers can report availability.
 */
export function getProviderEnvConfig(
  providerId: string,
  kind: ProviderKind
): ProviderEnvConfig {
  let apiKeyEnvVar: string | null = null;

  switch (kind) {
    case "company_enrichment":
      apiKeyEnvVar = INTELLIGENCE_ENV.companyApiKey;
      break;
    case "prospect_enrichment":
      apiKeyEnvVar = INTELLIGENCE_ENV.prospectApiKey;
      break;
    case "ai":
    case "research":
      apiKeyEnvVar = INTELLIGENCE_ENV.aiApiKey;
      break;
    case "intent":
      apiKeyEnvVar = null;
      break;
  }

  const { timeoutMs } = getIntelligenceEnvironment();
  return {
    id: providerId,
    kind,
    apiKeyEnvVar,
    isConfigured: apiKeyEnvVar ? Boolean(readEnv(apiKeyEnvVar)) : false,
    timeoutMs,
  };
}

/**
 * Determines whether the mock provider may be enabled.
 * The mock provider is development-only and must never run in production.
 */
export function isMockProviderEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const flag = readEnv("INTELLIGENCE_ENABLE_MOCK");
  return flag === "true" || flag === "1";
}