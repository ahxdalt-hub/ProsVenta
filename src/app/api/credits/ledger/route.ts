// ============================================================================
// Prosventa Credits — Ledger API
// GET /api/credits/ledger?page=1&pageSize=15
// Stage 8 — Phase 5
// ============================================================================
// Paginated, customer-readable credit history. Server-side pagination only —
// the full ledger is never loaded into the browser. Org scoping comes from the
// caller's membership + RLS.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { CreditError } from "@/features/credits/errors";
import { CreditService } from "@/features/credits/service";
import type { LedgerPageDto } from "@/features/credits/api-types";

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
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? 15) || 15, 1), 100);

    // Fetch one extra entry to compute hasMore without a count query.
    const entries = await CreditService.getLedger(
      membership.organization_id as string,
      { limit: pageSize + 1, offset: (page - 1) * pageSize }
    );

    const body: LedgerPageDto = {
      entries: entries.slice(0, pageSize).map((e) => ({
        id: e.id,
        amount: e.amount,
        type: e.type,
        description: e.description,
        source: e.source,
        referenceType: e.reference_type,
        createdAt: e.created_at,
      })),
      page,
      pageSize,
      hasMore: entries.length > pageSize,
    };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof CreditError && error.code === "UNAUTHORIZED_CREDIT_OPERATION") {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
    console.error("[credits] ledger failed");
    return NextResponse.json({ error: "Unable to load your credit activity." }, { status: 500 });
  }
}
