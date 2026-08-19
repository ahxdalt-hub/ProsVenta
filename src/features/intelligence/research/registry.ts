// ============================================================================
// Prosventa AI Company Research — Provider Registry
// Stage 4 — Phase 4: AI Company Research
// ============================================================================
// Registry for company research providers. Currently registers the grounded
// deterministic engine. Future LLM-based providers can be registered here
// without changing the UI or service contract.
// ============================================================================

import type { CompanyResearchProvider } from "./types";
import { researchCompanyGrounded } from "./engine";

// ============================================================================
// Grounded Engine Provider (Default)
// ============================================================================
const groundedEngineProvider: CompanyResearchProvider = {
  id: "grounded-v1",
  name: "Prosventa Grounded Research Engine v1",
  model: null,
  research: async (context) => researchCompanyGrounded(context),
};

class CompanyResearchProviderRegistryImpl {
  private providers: Map<string, CompanyResearchProvider> = new Map();

  register(provider: CompanyResearchProvider): void {
    if (!provider.id) {
      throw new Error("CompanyResearchProvider must have a non-empty id.");
    }
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): CompanyResearchProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): CompanyResearchProvider[] {
    return Array.from(this.providers.values());
  }
}

// ============================================================================
// Singleton Registry
// ============================================================================
export const companyResearchProviderRegistry = new CompanyResearchProviderRegistryImpl();

// Register the default grounded engine at module load time.
companyResearchProviderRegistry.register(groundedEngineProvider);

/**
 * Resolves the active company research provider.
 *
 * `COMPANY_RESEARCH_PROVIDER` env var selects the provider id (defaults to
 * "grounded-v1"). Falls back to the grounded engine when no provider found.
 */
export function getCompanyResearchProvider(providerId?: string): CompanyResearchProvider {
  const configured =
    providerId?.trim() ||
    (process.env.COMPANY_RESEARCH_PROVIDER ?? "").trim() ||
    "grounded-v1";

  const provider = companyResearchProviderRegistry.getProvider(configured);
  if (!provider) {
    // Fall back to the grounded engine rather than failing hard.
    return groundedEngineProvider;
  }
  return provider;
}