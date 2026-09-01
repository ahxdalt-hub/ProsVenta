// ============================================================================
// Prosventa External Business Signals — Provider Registry
// Stage 6 — Phase 5: External Business Signal Engine
// ============================================================================
// Dedicated registry for signal-capable external providers. Kept separate
// from the enrichment IntelligenceProvider registry because the external
// signal contract is company-event-shaped rather than record-enrichment-
// shaped — but resolution, capability checks and error handling all reuse
// the Phase 1 foundation.
// ============================================================================

import type { ExternalSignalProvider } from "./types";

const registry = new Map<string, ExternalSignalProvider>();

export function registerExternalSignalProvider(provider: ExternalSignalProvider): void {
  const id = provider.getConfig().id;
  if (!id) throw new Error("ExternalSignalProvider must have a non-empty id.");
  registry.set(id, provider);
}

export function getRegisteredExternalSignalProvider(
  id: string
): ExternalSignalProvider | null {
  return registry.get(id) ?? null;
}

export function getRegisteredExternalSignalProviders(): ExternalSignalProvider[] {
  return Array.from(registry.values());
}
