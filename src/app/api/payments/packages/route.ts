// ============================================================================
// Prosventa Payments — Package Catalog API
// GET /api/payments/packages
// Stage 8 — Phase 5
// ============================================================================
// Read-only view of the ACTIVE package catalog. The client displays these
// values; checkout re-resolves everything server-side (price-tamper proof).
// ============================================================================

import { NextResponse } from "next/server";

import { PaymentError } from "@/features/payments/errors";
import { formatMinorAmount, listActivePackages } from "@/features/payments/packages";
import type { CreditPackageDto } from "@/features/credits/api-types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const packages = await listActivePackages();
    const body: CreditPackageDto[] = packages.map((p) => ({
      key: p.key,
      name: p.name,
      description: p.description,
      creditAmount: p.credit_amount,
      currency: p.currency,
      priceMinor: p.price,
      displayPrice: formatMinorAmount(p.price, p.currency),
      // Objectively configured recommendation only — never invented marketing.
      recommended: p.metadata?.recommended === true,
      discountPercent:
        typeof p.metadata?.discount_percent === "number"
          ? p.metadata.discount_percent
          : null,
    }));
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof PaymentError && error.code === "PAYMENT_SERVICE_ERROR") {
      return NextResponse.json(
        { error: "Credit packages are currently unavailable." },
        { status: 503 }
      );
    }
    console.error("[payments] packages failed");
    return NextResponse.json(
      { error: "Unable to load credit packages." },
      { status: 500 }
    );
  }
}
