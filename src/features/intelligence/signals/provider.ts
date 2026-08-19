// ============================================================================
// Prosventa Buying & Intent Signals — External Provider Adapter
// Stage 4 — Phase 7: Buying & Intent Signals
// ============================================================================
// Adapter boundary for external signal detection. No external provider is
// configured yet, so this clearly reports PROVIDER_NOT_CONFIGURED rather than
// fabricating signals. Plug in a real provider by registering it in the
// signal provider registry.
//
// IMPORTANT: If no provider is configured, the UI must clearly indicate that
// external signal detection is unavailable. Never fabricate signals.
// ============================================================================

import { IntelligenceError } from "../errors";
import type { SignalProvider } from "./types";

/**
 * Resolves the configured external signal provider.
 *
 * `SIGNALS_PROVIDER` env var selects the provider id. Returns null when no
 * external provider is configured — the service layer then reports that
 * external signal detection is unavailable (without fabricating signals).
 */
export function getSignalProvider(providerId?: string): SignalProvider | null {
  const id = providerId?.trim() || (process.env.SIGNALS_PROVIDER ?? "").trim();
  if (!id) return null;

  // No external providers are registered yet. When a real provider is added,
  // it will be registered in the signal provider registry and resolved here.
  // Until then, we never fabricate signals.
  return null;
}

/**
 * Returns whether external signal detection is configured.
 * Used by the UI to clearly indicate availability.
 */
export function isExternalSignalDetectionConfigured(): boolean {
  const id = (process.env.SIGNALS_PROVIDER ?? "").trim();
  return id.length > 0;
}

/**
 * Throws a typed error when external signal detection is requested but not
 * configured. The service layer catches this and reports it safely.
 */
export function requireSignalProvider(providerId?: string): SignalProvider {
  const provider = getSignalProvider(providerId);
  if (!provider) {
    throw new IntelligenceError("PROVIDER_NOT_CONFIGURED", { provider: providerId ?? "signals" });
  }
  return provider;
}