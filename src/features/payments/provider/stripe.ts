// ============================================================================
// Prosventa Payments — Stripe Provider Implementation
// Stage 8 — Phase 4: Payment + Credit Purchase System
// ============================================================================
// Implements PaymentProvider against Stripe's REST API using fetch (no SDK
// dependency). Runs SERVER-SIDE ONLY — the secret key never leaves this file.
//
// SECURITY:
//   - STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are server-only env vars.
//   - Webhook signature verification implements Stripe's v1 HMAC scheme
//     including timestamp/replay protection (default tolerance 5 minutes).
//   - No card data is collected or stored — hosted Checkout is used.
//
// No credentials are invented here: without env keys, isConfigured() is false
// and checkout creation fails gracefully with PAYMENT_PROVIDER_NOT_CONFIGURED.
// ============================================================================

import { createHmac, timingSafeEqual } from "node:crypto";

import { PaymentError } from "../errors";
import type {
  CheckoutRequest,
  CheckoutSession,
  ParsedProviderEvent,
  ProviderRefundResult,
  RefundRequest,
  RetrievedPayment,
} from "../types";
import type { PaymentProvider } from "./types";

const STRIPE_API_BASE = "https://api.stripe.com/v1";
/** Stripe's recommended replay-attack tolerance (seconds). */
const WEBHOOK_TOLERANCE_SECONDS = 300;

function requireSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new PaymentError("PAYMENT_PROVIDER_NOT_CONFIGURED");
  }
  return key;
}

/** Encodes a flat metadata object into Stripe's form-encoded format. */
function formEncode(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    );
  }
  return parts.join("&");
}

async function stripeRequest<T>(
  path: string,
  method: "GET" | "POST",
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const key = requireSecretKey();
  let response: Response;
  try {
    response = await fetch(`${STRIPE_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: method === "POST" ? formEncode(params ?? {}) : undefined,
    });
  } catch (cause) {
    // Network timeout / provider outage → graceful failure: no purchase state
    // change, no credits. Structured for Phase 6 observability.
    throw new PaymentError("PAYMENT_PROVIDER_UNAVAILABLE", { cause });
  }

  const json = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;

  if (!response.ok || !json) {
    console.error("[payments:stripe] API error", {
      path,
      status: response.status,
      // Never log request bodies or the secret key — status code only.
    });
    throw new PaymentError("PAYMENT_PROVIDER_UNAVAILABLE", {
      cause: json?.error?.message ?? `HTTP ${response.status}`,
    });
  }
  return json;
}

/**
 * Verifies Stripe's `Stripe-Signature` header (scheme v1):
 *   signed_payload = `${timestamp}.${rawBody}`
 *   expected       = HMAC-SHA256(webhookSecret, signed_payload)
 * Rejects missing/tampered signatures and stale timestamps (replay guard).
 * Exported for direct unit testing of the security boundary.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (!signatureHeader || !secret) return false;

  let timestamp: string | undefined;
  const received: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === "t") timestamp = v;
    if (k === "v1") received.push(v);
  }
  if (!timestamp || received.length === 0) return false;

  // Replay protection: reject events outside the tolerance window.
  const age = nowSeconds - Number(timestamp);
  if (!Number.isFinite(age) || Math.abs(age) > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return received.some((signature) => {
    const a = Buffer.from(signature, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

function mapIntentStatus(status: string): RetrievedPayment["status"] {
  switch (status) {
    case "succeeded":
      return "succeeded";
    case "canceled":
      return "cancelled";
    default:
      // requires_payment_method / requires_action / processing / failed …
      return status === "failed" ? "failed" : "pending";
  }
}

interface StripeIntent {
  id: string;
  status: string;
  amount: number;
  currency: string;
}

export const StripeProvider: PaymentProvider = {
  id: "stripe",

  isConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  },

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const session = await stripeRequest<{
      id: string;
      url: string;
      expires_at?: number;
    }>("/checkout/sessions", "POST", {
      mode: "payment",
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": request.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": request.amount,
      "line_items[0][price_data][product_data][name]": request.description,
      success_url: request.successUrl,
      cancel_url: request.cancelUrl,
      client_reference_id: request.internalReference,
      customer_email: request.customerEmail ?? undefined,
      ...Object.fromEntries(
        Object.entries(request.metadata).map(([k, v]) => [`metadata[${k}]`, v])
      ),
    });

    return {
      provider: "stripe",
      providerOrderId: session.id,
      checkoutUrl: session.url,
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null,
    };
  },

  async retrievePayment(providerPaymentId: string): Promise<RetrievedPayment> {
    // We store the Checkout Session id as provider_order_id; the authoritative
    // money object is its PaymentIntent.
    if (providerPaymentId.startsWith("cs_")) {
      const session = await stripeRequest<{
        payment_intent?: StripeIntent | null;
      }>(`/checkout/sessions/${providerPaymentId}`, "GET");

      if (!session.payment_intent) {
        return {
          providerPaymentId: null,
          status: "pending",
          amount: null,
          currency: null,
          paymentMethodType: null,
          rawStatus: "session_no_intent",
        };
      }
      return {
        providerPaymentId: session.payment_intent.id,
        status: mapIntentStatus(session.payment_intent.status),
        amount: session.payment_intent.amount,
        currency: session.payment_intent.currency.toUpperCase(),
        paymentMethodType: null,
        rawStatus: session.payment_intent.status,
      };
    }

    const intent = await stripeRequest<StripeIntent>(
      `/payment_intents/${providerPaymentId}`,
      "GET"
    );
    return {
      providerPaymentId: intent.id,
      status: mapIntentStatus(intent.status),
      amount: intent.amount,
      currency: intent.currency.toUpperCase(),
      paymentMethodType: null,
      rawStatus: intent.status,
    };
  },

  verifyAndParseWebhook(
    rawBody: string,
    signatureHeaders: Record<string, string | null>
  ): ParsedProviderEvent {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature =
      signatureHeaders["stripe-signature"] ??
      signatureHeaders["Stripe-Signature"] ??
      null;

    // NEVER trust arbitrary POSTs: reject unsigned/invalid requests outright.
    if (!verifyStripeSignature(rawBody, signature, secret ?? "")) {
      throw new PaymentError("WEBHOOK_SIGNATURE_INVALID");
    }

    let payload: {
      id?: string;
      type?: string;
      data?: {
        object?: {
          id?: string;
          object?: string;
          amount?: number;
          amount_total?: number;
          currency?: string;
          client_reference_id?: string | null;
          payment_intent?: string | null;
          charge?: string | null;
          metadata?: Record<string, string>;
        };
      };
    };
    try {
      payload = JSON.parse(rawBody);
    } catch (cause) {
      throw new PaymentError("WEBHOOK_PAYLOAD_INVALID", { cause });
    }
    if (!payload.id || !payload.type || !payload.data?.object) {
      throw new PaymentError("WEBHOOK_PAYLOAD_INVALID");
    }

    const obj = payload.data.object;
    const paymentId =
      obj.payment_intent ??
      (obj.object === "payment_intent" ? obj.id : (obj.charge ?? null));

    let kind: ParsedProviderEvent["kind"] = "unknown";
    switch (payload.type) {
      case "checkout.session.completed":
      case "payment_intent.succeeded":
        kind = "payment_succeeded";
        break;
      case "payment_intent.payment_failed":
        kind = "payment_failed";
        break;
      case "charge.refunded":
        kind = "refund_processed";
        break;
    }

    return {
      eventId: payload.id,
      eventType: payload.type,
      providerPaymentId: paymentId ?? null,
      internalReference:
        obj.client_reference_id ?? obj.metadata?.purchase_id ?? null,
      amount: obj.amount_total ?? obj.amount ?? null,
      currency: obj.currency ? obj.currency.toUpperCase() : null,
      kind,
      metadata: obj.metadata ?? {},
    };
  },

  async refundPayment(request: RefundRequest): Promise<ProviderRefundResult> {
    const refund = await stripeRequest<{
      id: string;
      status: string;
      amount: number;
    }>("/refunds", "POST", {
      payment_intent: request.providerPaymentId,
      amount: request.amount ?? undefined,
    });
    return {
      providerRefundId: refund.id,
      amount: refund.amount,
      status:
        refund.status === "succeeded"
          ? "succeeded"
          : refund.status === "failed"
            ? "failed"
            : "pending",
    };
  },
};

