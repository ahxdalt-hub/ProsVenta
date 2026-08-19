// Prosventa Prospect Enrichment Provider Adapter
// Stage 4 — Phase 3: Contact & Prospect Intelligence
// Adapter boundary for prospect/contact enrichment. No external provider is
// configured yet, so this clearly reports PROVIDER_NOT_CONFIGURED rather than
// fabricating results. Plug in a real provider by registering it in the
// intelligence registry.

import { intelligenceProviderRegistry } from "./registry";
import { IntelligenceError } from "../errors";
import type { IntelligenceProvider } from "../types";

export function getProspectEnrichmentProvider(providerId?: string): IntelligenceProvider {
  const id = providerId?.trim() || "prospect-enrichment";
  const provider = intelligenceProviderRegistry.getProvider(id);
  if (!provider) {
    throw new IntelligenceError("PROVIDER_NOT_CONFIGURED", { provider: id });
  }
  return provider;
}

export function getConfiguredProspectProviderId(): string | null {
  const configured = process.env.INTELLIGENCE_PROSPECT_PROVIDER;
  return configured && configured.trim() ? configured.trim() : null;
}