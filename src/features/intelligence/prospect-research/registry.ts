// ============================================================================
// Prosventa AI Prospect Research — Provider Registry
// Stage 4 — Phase 5: AI Prospect Research
// ============================================================================
// Registry for prospect research providers. Currently registers the grounded
// deterministic engine. Future LLM-based providers can be registered here
// without changing the UI or service contract.
// ============================================================================

import type { ProspectResearchProvider } from "./types";
import { researchProspectGrounded } from "./engine";

// ============================================================================
// Grounded Engine Provider (Default)
// ============================================================================
const groundedEngineProvider: ProspectResearchProvider = {
  id: "grounded-prospect-v1",
  name: "Prosventa Grounded Prospect Research Engine v1",
  model: null,
  research: async (context) => researchProspectGrounded(context),
};

class ProspectResearchProviderRegistryImpl {
  private providers: Map<string, ProspectResearchProvider> = new Map();

  register(provider: ProspectResearchProvider): void {
    if (!provider.id) {
      throw new Error("ProspectResearchProvider must have a non-empty id.");
    }
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): ProspectResearchProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): ProspectResearchProvider[] {
    return Array.from(this.providers.values());
  }
}

// ============================================================================
// Singleton Registry
// ============================================================================
export const prospectResearchProviderRegistry = new ProspectResearchProviderRegistryImpl();

// Register the default grounded engine at module load time.
prospectResearchProviderRegistry.register(groundedEngineProvider);

/**
 * Resolves the active prospect research provider.
 *
 * `PROSPECT_RESEARCH_PROVIDER` env var selects the provider id (defaults to
 * "grounded-prospect-v1"). Falls back to the grounded engine when no provider found.
 */
export function getProspectResearchProvider(providerId?: string): ProspectResearchProvider {
  const configured =
    providerId?.trim() ||
    (process.env.PROSPECT_RESEARCH_PROVIDER ?? "").trim() ||
    "grounded-prospect-v1";

  const provider = prospectResearchProviderRegistry.getProvider(configured);
  if (!provider) {
    // Fall back to the grounded engine rather than failing hard.
    return groundedEngineProvider;
  }
  return provider;
}