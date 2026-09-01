// ============================================================================
// Prosventa External Business Signals — Provider Resolution Adapter
// Stage 6 — Phase 5: External Business Signal Engine
// ============================================================================
// Resolves the signal-capable external provider using the Stage 6 Phase 1
// architecture:
//
//   1. Per-organization selection (organization_provider_configs, kind =
//      "signals") — non-secret, RLS-scoped.
//   2. Server-side environment fallback (SIGNALS_PROVIDER env var).
//
// An id with no registered adapter results in an honest
// PROVIDER_NOT_CONFIGURED error; data is never fabricated.
// Capability metadata from Phase 1 is checked before dispatch: a provider
// without the "business_signals" capability surfaces a controlled
// PROVIDER_UNSUPPORTED state instead of a generic failure.
// ============================================================================

import { IntelligenceError } from "../../errors";
import { registerMockSignalsProviderIfEnabled } from "./mock";
import { getRegisteredExternalSignalProvider } from "./registry";
import type { ExternalSignalProvider } from "./types";

/**
 * Resolves the configured external signal provider for an organization.
 * Returns null when no provider is configured — callers must surface a
 * controlled "external signal detection unavailable" state.
 */
export async function resolveExternalSignalProvider(
  orgId: string,
  providerIdOverride?: string
): Promise<ExternalSignalProvider | null> {
  // Ensure dev-only mock provider is registered when explicitly enabled.
  registerMockSignalsProviderIfEnabled();

  let providerId = providerIdOverride?.trim() || null;

  // 1. Organization-level selection (Phase 1 foundation)
  if (!providerId && orgId) {
    try {
      const { getOrganizationProviderConfig } = await import("@/lib/db/intelligence");
      const orgConfig = await getOrganizationProviderConfig(orgId, "signals");
      if (orgConfig && orgConfig.enabled && orgConfig.provider_id.trim()) {
        providerId = orgConfig.provider_id.trim();
      }
    } catch {
      // Org config is optional — fall through to environment configuration.
    }
  }

  // 2. Environment-level selection
  if (!providerId) {
    const envId = (process.env.SIGNALS_PROVIDER ?? "").trim();
    providerId = envId || null;
  }

  if (!providerId) return null;

  return getRegisteredExternalSignalProvider(providerId) ?? null;
}

/**
 * Whether external signal detection has any configured path for this org.
 * Used by the UI/service to communicate availability honestly.
 */
export async function isExternalDetectionAvailable(
  orgId: string
): Promise<boolean> {
  return (await resolveExternalSignalProvider(orgId)) !== null;
}

/**
 * Capability check (Phase 1 metadata). Throws PROVIDER_UNSUPPORTED when the
 * resolved provider does not declare the business_signals capability.
 */
export function assertBusinessSignalsCapability(provider: ExternalSignalProvider): void {
  const config = provider.getConfig();
  if (!config.capabilities.includes("business_signals")) {
    throw new IntelligenceError("PROVIDER_UNSUPPORTED", { provider: config.id });
  }
}
