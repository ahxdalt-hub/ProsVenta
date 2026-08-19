// ============================================================================
// Prosventa Intelligence Provider Registry
// Stage 4 — Phase 1: Intelligence Foundation
// ============================================================================
// Concrete implementation of the IntelligenceProviderRegistry contract.
// Future providers (Clearbit, Apollo, etc.) will register here so they can
// be discovered and used by the intelligence service.
// ============================================================================

import type { IntelligenceProvider, IntelligenceProviderRegistry } from "../types";

class IntelligenceProviderRegistryImpl implements IntelligenceProviderRegistry {
  private providers: Map<string, IntelligenceProvider> = new Map();

  getProvider(id: string): IntelligenceProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): IntelligenceProvider[] {
    return Array.from(this.providers.values());
  }

  register(provider: IntelligenceProvider): void {
    const config = provider.getConfig();
    if (!config.id) {
      throw new Error("IntelligenceProvider must have a non-empty id.");
    }
    this.providers.set(config.id, provider);
  }
}

/**
 * Singleton registry instance for the entire application.
 * Providers register once at module load time.
 */
export const intelligenceProviderRegistry: IntelligenceProviderRegistry =
  new IntelligenceProviderRegistryImpl();