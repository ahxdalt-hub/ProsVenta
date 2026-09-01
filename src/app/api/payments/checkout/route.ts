// ============================================================================
// Prosventa Payments — Checkout API
// POST /api/payments/checkout
// ============================================================================
// Server-authoritative checkout creation. The client sends ONLY the package
// key (and an optional double-click-protection request id). Price, credits,
// currency, organization and payment state are resolved server-side.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

import { PaymentError } from "@/features/payments/errors";
import { PurchaseService } from "@/features/payments/service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const packageKey = typeof body.packageKey === "string" ? body.packageKey : "";
    if (!packageKey) {
      return NextResponse.json(
        { error: "packageKey is required." },
        { status: 400 }
      );
    }

    // Only safe publishable context is derived from the request origin.
    const origin = request.nextUrl.origin;
    const result = await PurchaseService.createCheckout({
      packageKey,
      clientRequestId:
        typeof body.requestId === "string" ? body.requestId : null,
      successUrl: `${origin}/dashboard/settings/billing/return?status=processing`,
      cancelUrl: `${origin}/dashboard/settings/billing/return?status=cancelled`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof PaymentError) {
      const status =
        error.code === "UNAUTHORIZED_PAYMENT_OPERATION"
          ? 403
          : error.code === "PACKAGE_NOT_FOUND" ||
              error.code === "PACKAGE_NOT_AVAILABLE" ||
              error.code === "INVALID_CHECKOUT_REQUEST" ||
              error.code === "DUPLICATE_PURCHASE_REQUEST"
            ? error.code === "DUPLICATE_PURCHASE_REQUEST"
              ? 409
              : 400
            : error.code === "PAYMENT_PROVIDER_NOT_CONFIGURED" ||
                error.code === "PAYMENT_PROVIDER_UNAVAILABLE"
              ? 503
              : 500;
      console.error("[payments] checkout failed", {
        code: error.code,
      });
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    console.error("[payments] checkout unexpected error");
    return NextResponse.json(
      { error: "An unexpected error occurred while starting your purchase." },
      { status: 500 }
    );
  }
}
