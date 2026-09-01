// ============================================================================
// Prosventa Credits — Summary API
// GET /api/credits/summary
// Stage 8 — Phase 5
// ============================================================================
// ONE authoritative read for balance + usage + plan/billing state. Composes
// existing Phase 1–3 services (CreditService / UsageService /
// EntitlementService). The client NEVER computes financial values itself.
// ============================================================================

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { CreditError } from "@/features/credits/errors";
import { CreditService } from "@/features/credits/service";
import { UsageService } from "@/features/credits/usage-service";
import { EntitlementService } from "@/features/plans/service";
import type { CreditSummaryDto } from "@/features/credits/api-types";

export const dynamic = "force-dynamic";

/** Resolves the caller's organization from DB membership (never client input). */
async function resolveOrganizationId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new CreditError("UNAUTHORIZED_CREDIT_OPERATION");
  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (error || !membership) {
    throw new CreditError("UNAUTHORIZED_CREDIT_OPERATION");
  }
  return membership.organization_id as string;
}

function monthRange(monthKey: string): { periodStart: string; periodEnd: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { periodStart: start.toISOString(), periodEnd: end.toISOString() };
}

export async function GET() {
  try {
    const organizationId = await resolveOrganizationId();

    const [balanceResult, billingSummary] = await Promise.allSettled([
      (async () => {
        const wallet = await CreditService.getWallet(organizationId);
        return wallet;
      })(),
      EntitlementService.getBillingSummary(organizationId),
    ]);

    // ---- Wallet (authoritative balance) ------------------------------------
    let walletDto: CreditSummaryDto["wallet"] = null;
    let monthKey: string | null = null;
    if (balanceResult.status === "fulfilled") {
      const w = balanceResult.value as Record<string, unknown>;
      monthKey = typeof w.month_key === "string" ? w.month_key : null;
      walletDto = {
        balance: Number(w.balance ?? 0),
        reserved: Number(w.reserved ?? 0),
        monthlyAllowance: Number(w.monthly_allowance ?? 0),
        lifetimePurchased: Number(w.lifetime_purchased ?? 0),
      };
    }

    // ---- Usage aggregates for the CURRENT billing month ---------------------
    let usageDto: CreditSummaryDto["usage"] = null;
    if (monthKey) {
      try {
        const range = monthRange(monthKey);
        const aggregates = await UsageService.aggregate(organizationId, {
          from: new Date(range.periodStart),
          to: new Date(range.periodEnd),
        });
        usageDto = {
          monthKey,
          periodStart: range.periodStart,
          periodEnd: range.periodEnd,
          usedCredits: aggregates.totalCredits,
          operationCount: aggregates.usageCount,
          byCategory: Object.entries(aggregates.byCategory)
            .map(([category, credits]) => ({ category, credits }))
            .filter((entry) => entry.credits > 0)
            .sort((a, b) => b.credits - a.credits),
        };
      } catch (usageErr) {
        // Usage being unavailable must NOT zero out the balance view.
        console.error("[credits] usage aggregate failed", usageErr);
      }
    }

    // ---- Plan / billing summary --------------------------------------------
    let planDto: CreditSummaryDto["plan"] = null;
    if (billingSummary.status === "fulfilled") {
      const s = billingSummary.value;
      planDto = {
        name: s.plan.name,
        key: s.plan.key,
        billingStatus: s.subscription.billing_status,
        billingInterval: s.subscription.billing_interval,
        periodStart: s.subscription.period_start,
        periodEnd: s.subscription.period_end,
        limitExceeded: s.subscription.limit_exceeded,
        limits: s.limits,
      };
    }

    const body: CreditSummaryDto = {
      wallet: walletDto,
      usage: usageDto,
      plan: planDto,
    };
    return NextResponse.json(body);
  } catch (error) {
    if (
      error instanceof CreditError &&
      error.code === "UNAUTHORIZED_CREDIT_OPERATION"
    ) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    if (
      error instanceof CreditError &&
      error.code === "WALLET_NOT_FOUND"
    ) {
      // No wallet yet is a legitimate state (fresh org) — not an error page.
      const body: CreditSummaryDto = { wallet: null, usage: null, plan: null };
      return NextResponse.json(body);
    }
    console.error("[credits] summary failed");
    return NextResponse.json(
      { error: "Unable to load your credit information." },
      { status: 500 }
    );
  }
}
