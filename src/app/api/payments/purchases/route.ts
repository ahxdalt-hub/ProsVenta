// ============================================================================
// Prosventa Payments — Purchase History API
// GET /api/payments/purchases?page=1&pageSize=10
// Stage 8 — Phase 5
// ============================================================================
// Paginated purchase history via the Phase 4 PurchaseHistory service. The org
// id comes from the caller's membership — a foreign organizationId can never be
// injected by the client.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { PaymentError } from "@/features/payments/errors";
import { PurchaseHistory } from "@/features/payments/history";
import { formatMinorAmount } from "@/features/payments/packages";
import type { PurchasesPageDto } from "@/features/credits/api-types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "No organization found." }, { status: 403 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? 10) || 10, 1), 50);

    const result = await PurchaseHistory.list({
      organizationId: membership.organization_id as string,
      page,
      pageSize,
    });

    const body: PurchasesPageDto = {
      purchases: result.purchases.map((p) => ({
        id: p.id,
        status: p.purchase_status,
        packageName: p.snapshot.package_name,
        credits: p.credits,
        amountMinor: p.amount,
        displayAmount: formatMinorAmount(p.amount, p.currency),
        currency: p.currency,
        refundedAmountMinor: p.refunded_amount,
        createdAt: p.created_at,
      })),
      page: result.page,
      pageSize: result.pageSize,
      hasMore: result.hasMore,
    };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof PaymentError) {
      const status =
        error.code === "UNAUTHORIZED_PAYMENT_OPERATION"
          ? 403
          : error.code === "PAYMENT_PROVIDER_UNAVAILABLE"
            ? 503
            : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    console.error("[payments] purchase history failed");
    return NextResponse.json(
      { error: "Unable to load your purchase history." },
      { status: 500 }
    );
  }
}
