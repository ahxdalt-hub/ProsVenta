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

// ============================================================================
// Prosventa Lead Provider Accessor (server-only)
// Stage 2 — Phase 8: Real Lead Discovery
// ============================================================================
// Resolves the active lead discovery provider for server-side services.
// Lead providers implement the richer paginated LeadDiscoveryProvider
// contract and are tracked separately from legacy ProspectProvider entries.
// Registration is lazy so provider modules (and their env reads) never run
// in a client bundle. Replace or add providers here — nothing upstream changes.
// ============================================================================

import { ApolloLeadProvider, APOLLO_PROVIDER_ID } from "./apollo";
import type { LeadDiscoveryProvider } from "./types";

const leadProviders = new Map<string, LeadDiscoveryProvider>();
let registered = false;

function ensureRegistered(): void {
  if (registered) return;
  const apollo = new ApolloLeadProvider();
  leadProviders.set(apollo.getConfig().id, apollo);
  registered = true;
}

/**
 * Returns the active lead discovery provider, or null when none is
 * configured. The caller decides how to surface PROVIDER_NOT_CONFIGURED.
 */
export function getActiveLeadProvider(): LeadDiscoveryProvider | null {
  ensureRegistered();
  return leadProviders.get(APOLLO_PROVIDER_ID) ?? null;
}
