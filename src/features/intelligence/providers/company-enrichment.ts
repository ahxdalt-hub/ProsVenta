// Prosventa Company Enrichment Provider Adapter
// Stage 4 — Phase 2: Company Enrichment
// Adapter boundary for company enrichment. No external provider is configured
// yet, so this clearly reports PROVIDER_NOT_CONFIGURED rather than fake data.
// Plug in a real provider by registering it in the intelligence registry.

import { intelligenceProviderRegistry } from "./registry";
import { IntelligenceError } from "../errors";
import { registerMockProviderIfEnabled } from "./mock";
import type { IntelligenceProvider } from "../types";

export function getCompanyEnrichmentProvider(providerId?: string): IntelligenceProvider {
  // Ensure the development mock provider is registered when explicitly enabled.
  // This is idempotent and never runs in production.
  registerMockProviderIfEnabled();

  const id = providerId?.trim() || "company-enrichment";
  const provider = intelligenceProviderRegistry.getProvider(id);
  if (!provider) {
    throw new IntelligenceError("PROVIDER_NOT_CONFIGURED", { provider: id });
  }
  return provider;
}

export function getConfiguredProviderId(): string | null {
  const configured = process.env.INTELLIGENCE_COMPANY_PROVIDER;
  return configured && configured.trim() ? configured.trim() : null;
}

/**
 * Resolves the company enrichment provider id for a specific organization
 * using the Stage 6 - Phase 1 architecture:
 *
 *   1. Per-organization provider selection (`organization_provider_configs`,
 *      kind = "company_enrichment") — non-secret, RLS-scoped.
 *   2. Server-side environment fallback (`INTELLIGENCE_COMPANY_PROVIDER`).
 *
 * The returned id is only an identifier — the actual adapter must be
 * registered in the intelligence registry. An id with no registered adapter
 * (e.g. "clearbit" without credentials/adapter) results in an honest
 * PROVIDER_NOT_CONFIGURED error at resolution time; data is never fabricated.
 */
export async function resolveCompanyEnrichmentProviderId(orgId: string): Promise<string> {
  // 1. Organization-level selection (Phase 1 foundation)
  if (orgId) {
    try {
      const { getOrganizationProviderConfig } = await import("@/lib/db/intelligence");
      const orgConfig = await getOrganizationProviderConfig(orgId, "company_enrichment");
      if (orgConfig && orgConfig.enabled && orgConfig.provider_id.trim()) {
        return orgConfig.provider_id.trim();
      }
    } catch {
      // Org config is optional — fall through to environment configuration.
    }
  }

  // 2. Environment-level selection
  return getConfiguredProviderId() ?? "company-enrichment";
}