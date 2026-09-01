"use client";

import type { CreditSummaryDto } from "@/features/credits/api-types";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { CREDIT_LABEL } from "@/features/credits/ui-config";
import { PlanSummaryCard } from "@/components/dashboard/credits/PlanSummary";
import { PurchaseSelector } from "@/components/dashboard/credits/PurchaseSelector";

// ============================================================================
// PlanBillingSection — Settings › Plan & Billing
// ============================================================================
// Current plan + entitlements (server truth via /api/credits/summary) and the
// purchase flow (server-authoritative catalog via /api/payments/packages).
// The checkout sends ONLY a package key — price/credits/currency are always
// resolved server-side.
// ============================================================================

export function PlanBillingSection() {
  const { data, error, loading, refresh } =
    useApiResource<CreditSummaryDto>("/api/credits/summary");

  const balance = typeof data?.wallet?.balance === "number" ? data.wallet.balance : null;

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading plan information">
        <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data?.plan) {
    return (
      <div role="alert" className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-medium text-slate-700">
          Unable to load your plan information.
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data?.plan ? (
        <PlanSummaryCard plan={data.plan} />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No active plan information is available for this workspace yet.
        </div>
      )}

      {data?.wallet && (
        <p className="text-xs text-slate-400 tabular-nums">
          Current {CREDIT_LABEL} balance:{" "}
          <span className="font-medium text-slate-700">
            {data.wallet.balance.toLocaleString("en-US")}
          </span>
          {" · "}Monthly allocation:{" "}
          <span className="font-medium text-slate-700">
            {data.wallet.monthlyAllowance > 0
              ? data.wallet.monthlyAllowance.toLocaleString("en-US")
              : "—"}
          </span>
        </p>
      )}

      <section id="get-credits" aria-labelledby="billing-packages-title">
        <h2 id="billing-packages-title" className="mb-3 text-base font-semibold text-slate-900">
          Get {CREDIT_LABEL}
        </h2>
        <PurchaseSelector balance={balance} />
      </section>

      <p className="text-xs text-slate-400">
        Purchases use secure checkout and are confirmed by the payment provider
        before credits are added to your workspace.
      </p>
    </div>
  );
}
