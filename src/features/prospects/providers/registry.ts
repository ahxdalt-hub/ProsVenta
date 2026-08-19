// ============================================================================
// Prosventa Provider Registry
// Stage 2 — Phase 7: Prospect Discovery Engine Foundation
// ============================================================================
// Concrete implementation of the ProviderRegistry contract.
// Future providers (Google Places, Apollo, Clearbit, etc.) will register
// here so they can be discovered and used by the discovery engine.
// ============================================================================

import type { ProspectProvider, ProviderRegistry } from "./types";

class ProspectProviderRegistry implements ProviderRegistry {
  private providers: Map<string, ProspectProvider> = new Map();

  getProvider(id: string): ProspectProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): ProspectProvider[] {
    return Array.from(this.providers.values());
  }

  register(provider: ProspectProvider): void {
    const config = provider.getConfig();
    if (!config.id) {
      throw new Error("ProspectProvider must have a non-empty id.");
    }
    this.providers.set(config.id, provider);
  }
}

/**
 * Singleton registry instance for the entire application.
 * Providers register once at module load time.
 */
export const providerRegistry: ProviderRegistry = new ProspectProviderRegistry();