// ============================================================================
// Prosventa Payments — PaymentProvider Interface
// Stage 8 — Phase 4: Payment + Credit Purchase System
// ============================================================================
// THE only contract application code uses for payment operations. Provider
// SDKs/HTTP details live behind this interface — never spread through the app.
// A different provider can be substituted by implementing this interface and
// registering it in provider/index.ts. Nothing else in the codebase changes.
// ============================================================================

import type {
  CheckoutRequest,
  CheckoutSession,
  ParsedProviderEvent,
  ProviderRefundResult,
  RefundRequest,
  RetrievedPayment,
} from "../types";

export interface PaymentProvider {
  /** Registry identifier ("stripe", …). Stored on purchase/payment rows. */
  readonly id: string;

  /** True when required credentials are present in the server environment. */
  isConfigured(): boolean;

  /** Creates a hosted checkout session. Card data NEVER touches Prosventa. */
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;

  /** Authoritative payment status straight from the provider. */
  retrievePayment(providerPaymentId: string): Promise<RetrievedPayment>;

  /**
   * Verifies a raw webhook request body + signature headers and parses it.
   * MUST reject invalid signatures / malformed payloads by throwing.
   */
  verifyAndParseWebhook(
    rawBody: string,
    signatureHeaders: Record<string, string | null>
  ): ParsedProviderEvent;

  /** Issues a refund (full when amount omitted and supported). */
  refundPayment(request: RefundRequest): Promise<ProviderRefundResult>;

  /**
   * Optional subscription retrieval — implemented only where the plan
   * architecture requires recurring payments.
   */
  retrieveSubscription?(subscriptionId: string): Promise<{
    id: string;
    status: string;
    metadata: Record<string, unknown>;
  }>;
}
