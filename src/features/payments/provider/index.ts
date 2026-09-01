// ============================================================================
// Prosventa Payments — Provider Registry
// Stage 8 — Phase 4: Payment + Credit Purchase System
// ============================================================================
// THE single place a provider is selected. Application code calls
// getPaymentProvider() — never provider SDKs. Substituting another provider
// later means adding ONE entry here; the credit system is untouched.
//
// No provider is enabled until PAYMENT_PROVIDER is explicitly configured.
// No credentials are invented anywhere in Prosventa.
// ============================================================================

import "server-only";

import { PaymentError } from "../errors";
import { StripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

const REGISTRY: Readonly<Record<string, PaymentProvider>> = {
  stripe: StripeProvider,
};

/** Reads PAYMENT_PROVIDER (default: none configured → payments disabled). */
export function getConfiguredProviderId(): string | null {
  const id = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  return id && id.length > 0 ? id : null;
}

/**
 * Resolves the configured provider. Throws PAYMENT_PROVIDER_NOT_CONFIGURED
 * when no provider is set or credentials are missing — callers translate
 * this into graceful user-facing states (never a fake success).
 */
export function getPaymentProvider(): PaymentProvider {
  const id = getConfiguredProviderId();
  if (!id) {
    throw new PaymentError("PAYMENT_PROVIDER_NOT_CONFIGURED");
  }
  const provider = REGISTRY[id];
  if (!provider) {
    throw new PaymentError("PAYMENT_PROVIDER_NOT_CONFIGURED");
  }
  if (!provider.isConfigured()) {
    throw new PaymentError("PAYMENT_PROVIDER_NOT_CONFIGURED");
  }
  return provider;
}

export type { PaymentProvider };
