// ============================================================================
// Prosventa Payments — Provider Webhook
// POST /api/payments/webhook
// ============================================================================
// Server-side webhook endpoint. Pipeline: raw body + signature header →
// provider signature verification (HMAC + replay tolerance) → parse →
// event-idempotency (PK on provider event id) → transactional confirmation
// RPC (amount/currency validation + credit grant via grant_credits).
//
// SECURITY:
//   - Arbitrary/unauthenticated POSTs are REJECTED (invalid signature → 400).
//   - No secrets are ever logged.
//   - Always returns 2xx for verified duplicate/unknown events (provider
//     best practice) so retries stop.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

import { PaymentError } from "@/features/payments/errors";
import { getPaymentProvider } from "@/features/payments/provider";
import { PurchaseService } from "@/features/payments/service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureHeaders = {
      "stripe-signature": request.headers.get("stripe-signature"),
    };

    // 1+2. Signature verification + parsing (throws on invalid signatures and
    //      malformed payloads — never processed as payment confirmations).
    const provider = getPaymentProvider();
    const event = provider.verifyAndParseWebhook(rawBody, signatureHeaders);

    // 3–7. Idempotency, purchase identification, state transition,
    //      amount/currency validation and credit granting (transactional).
    const result = await PurchaseService.processWebhookEvent(event);

    // 10. Successful acknowledgement.
    return NextResponse.json({ received: true, outcome: result.outcome });
  } catch (error) {
    if (error instanceof PaymentError) {
      if (
        error.code === "WEBHOOK_SIGNATURE_INVALID" ||
        error.code === "WEBHOOK_PAYLOAD_INVALID"
      ) {
        console.warn("[payments] webhook rejected", { code: error.code });
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error("[payments] webhook processing failed", { code: error.code });
      return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
    }
    console.error("[payments] webhook unexpected error");
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
