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