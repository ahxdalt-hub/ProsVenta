// ============================================================================
// Prosventa Intelligence Provider Status
// Stage 6 - Phase 1: Data Provider & Enrichment Foundation
// ============================================================================
// Unified provider status concept so the rest of Prosventa never mistakes
// "not configured" for "no data", or mock data for real intelligence.
//
//   not_configured — no provider id resolved / nothing registered & no key
//   configured     — credentials/configuration exist but provider unavailable
//   available      — provider registered and usable right now
//   error          — configuration/connection invalid
//   unsupported    — provider does not support the requested capability
// ============================================================================

import { getIntelligenceEnvironment } from "./config";
import type { ProviderKind } from "./config";
import { capabilitiesFromOperations, type ProviderCapability } from "./capabilities";
import { intelligenceProviderRegistry } from "./providers/registry";
import type { IntelligenceProvider } from "./types";

export type ProviderStatus =
  | "not_configured"
  | "configured"
  | "available"
  | "error"
  | "unsupported";

export interface ResolvedProviderStatus {
  status: ProviderStatus;
  /** Provider id that was evaluated */
  providerId: string;
  /** Human-readable explanation safe for UI display */
  message: string;
  /** Capabilities the provider supports (when resolvable) */
  capabilities: ProviderCapability[];
}

const KIND_ENV_VAR: Record<ProviderKind, string> = {
  company_enrichment: "INTELLIGENCE_COMPANY_PROVIDER",
  prospect_enrichment: "INTELLIGENCE_PROSPECT_PROVIDER",
  research: "COMPANY_RESEARCH_PROVIDER",
  intent: "",
  ai: "",
};

/**
 * Resolves whether an environment-configured provider is usable.
 * Pure over registry state + environment — server-side only because it reads
 * process.env. Never exposes credential values, only their presence.
 */
export function resolveProviderStatus(options: {
  providerId: string;
  kind?: ProviderKind;
  capability?: ProviderCapability;
}): ResolvedProviderStatus {
  const { providerId, kind = "company_enrichment" } = options;

  // Mock providers are development-only; production must report them as
  // not configured rather than silently fabricating intelligence.
  if (providerId === "mock" && process.env.NODE_ENV === "production") {
    return {
      status: "not_configured",
      providerId,
      message: "Mock intelligence is disabled in production. Configure a real provider.",
      capabilities: [],
    };
  }

  const provider = intelligenceProviderRegistry.getProvider(providerId);

  if (!provider) {
    // Distinguish "explicitly configured but not implemented" (error)
    // from "nothing configured at all".
    const envVar = KIND_ENV_VAR[kind];
    const envValue = envVar ? process.env[envVar]?.trim() : undefined;
    const apiKeyConfigured = Boolean(getIntelligenceEnvironment().companyProviderConfigured || getIntelligenceEnvironment().prospectProviderConfigured);

    if (envValue && envValue !== providerDefaultForKind(kind)) {
      return {
        status: "error",
        providerId,
        message: `Provider "${providerId}" is configured but not available in this deployment.`,
        capabilities: [],
      };
    }
    if (!apiKeyConfigured && envVar) {
      return {
        status: "not_configured",
        providerId,
        message: "Provider not configured.",
        capabilities: [],
      };
    }
    return {
      status: "not_configured",
      providerId,
      message: "Provider not configured.",
      capabilities: [],
    };
  }

  const config = provider.getConfig();
  const capabilities =
    config.capabilities && config.capabilities.length > 0
      ? [...config.capabilities]
      : capabilitiesFromOperations(config.supportedOperations);

  if (options.capability && !capabilities.includes(options.capability)) {
    return {
      status: "unsupported",
      providerId,
      message: `Provider "${config.name}" does not support ${options.capability.replace(/_/g, " ")}.`,
      capabilities,
    };
  }

  return {
    status: "available",
    providerId,
    message: `Provider "${config.name}" is available.`,
    capabilities,
  };
}

function providerDefaultForKind(kind: ProviderKind): string {
  switch (kind) {
    case "company_enrichment":
      return "company-enrichment";
    case "prospect_enrichment":
      return "prospect-enrichment";
    case "research":
      return "grounded-v1";
    default:
      return "";
  }
}

/**
 * Lists all registered providers with their derived capabilities.
 * Used by admin/diagnostics surfaces; contains no secrets.
 */
export function listRegisteredProviders(): Array<{
  id: string;
  name: string;
  enabled: boolean;
  requiresApiKey: boolean;
  capabilities: ProviderCapability[];
}> {
  return intelligenceProviderRegistry.getAllProviders().map((provider: IntelligenceProvider) => {
    const config = provider.getConfig();
    return {
      id: config.id,
      name: config.name,
      enabled: config.enabled,
      requiresApiKey: config.requiresApiKey,
      capabilities:
        config.capabilities && config.capabilities.length > 0
          ? [...config.capabilities]
          : capabilitiesFromOperations(config.supportedOperations),
    };
  });
}