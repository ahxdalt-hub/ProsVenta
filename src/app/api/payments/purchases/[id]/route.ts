// ============================================================================
// Prosventa Payments — Purchase Status API
// GET /api/payments/purchases/[id]
// ============================================================================
// The redirect landing page polls this endpoint. A successful checkout
// redirect is NOT proof of payment — this route asks the provider when the
// purchase is still pending and returns the AUTHORITATIVE state. Credits are
// granted only by the transactional confirmation RPC inside the service.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

import { PaymentError } from "@/features/payments/errors";
import { PurchaseService } from "@/features/payments/service";
import { CreditService } from "@/features/credits/service";
import { toCreditError } from "@/features/credits/errors";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const purchase = await PurchaseService.getVerifiedStatus(id);

    // Balance is read only AFTER confirmation so the UI can safely display
    // "credits added" — and never before the backend confirms the grant.
    let balance: number | null = null;
    if (purchase.purchase_status === "paid") {
      try {
        balance = await CreditService.getBalance(purchase.organization_id);
      } catch (creditErr) {
        void toCreditError(creditErr);
      }
    }

    return NextResponse.json({
      purchase: {
        id: purchase.id,
        status: purchase.purchase_status,
        credits: purchase.credits,
        amount: purchase.amount,
        currency: purchase.currency,
        packageKey: purchase.snapshot.package_key,
        createdAt: purchase.created_at,
      },
      balance,
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      const status =
        error.code === "UNAUTHORIZED_PAYMENT_OPERATION"
          ? 403
          : error.code === "PURCHASE_NOT_FOUND"
            ? 404
            : error.code === "PAYMENT_PROVIDER_UNAVAILABLE"
              ? 503
              : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    console.error("[payments] status unexpected error");
    return NextResponse.json(
      { error: "An unexpected error occurred while checking your purchase." },
      { status: 500 }
    );
  }
}
