"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type { CreditSummaryDto } from "@/features/credits/api-types";
import {
  getCreditHealth,
  formatCredits,
  USAGE_WARNING_RATIO,
  CREDIT_LABEL,
} from "@/features/credits/ui-config";
import { CreditToken } from "./CreditToken";
import { AnimatedCreditValue } from "./AnimatedCreditValue";
import { PurchaseSelector } from "./PurchaseSelector";
import { PurchaseHistory } from "./PurchaseHistory";
import { CreditLedgerView } from "./CreditLedgerView";
import { UsageSummaryCard, ZeroBalanceState } from "./UsageSummary";
import { PlanSummaryCard, LimitWarning } from "./PlanSummary";

// ============================================================================
// BillingOverview — composable billing/credits experience
// ============================================================================
// Composes the REUSABLE components (balance, PlanSummary, UsageSummary, Credit
// Ledger, PurchaseHistory, PurchaseSelector). The future Settings rebuild will
// consume these same components — this page does NOT redesign Settings.
// ============================================================================

export function BillingOverview() {
  const { data, error, loading, refreshing, refresh } =
    useApiResource<CreditSummaryDto>("/api/credits/summary");

  const wallet = data?.wallet ?? null;
  const balance = typeof wallet?.balance === "number" ? wallet.balance : null;
  const health =
    balance !== null
      ? getCreditHealth({ balance, monthlyAllowance: wallet?.monthlyAllowance ?? null })
      : null;
  const usage = data?.usage ?? null;

  const usageWarning =
    usage && wallet && wallet.monthlyAllowance > 0 &&
    usage.usedCredits >= wallet.monthlyAllowance * USAGE_WARNING_RATIO &&
    usage.usedCredits < wallet.monthlyAllowance
      ? `You've used ${Math.round((usage.usedCredits / wallet.monthlyAllowance) * 100)}% of this month's ${CREDIT_LABEL}.`
      : null;

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading billing information">
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  const balanceHero = (
    <section className="premium-card flex items-center justify-between gap-4 p-6" data-testid="billing-balance">
      <div className="flex items-center gap-3">
        <span className="text-sky-600">
          <CreditToken size={48} />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {CREDIT_LABEL}
          </p>
          {balance !== null ? (
            <p
              aria-live="polite"
              className={`text-2xl font-bold tracking-tight tabular-nums ${
                health === "critical" || health === "empty" || health === "low"
                  ? "text-amber-600"
                  : "text-slate-900"
              }`}
            >
              <AnimatedCreditValue value={balance} />
            </p>
          ) : (
            /* NETWORK FAILURE ≠ zero credits */
            <div role="alert" className="mt-1">
              <p className="text-sm text-slate-500">Unable to load your credit balance.</p>
              <Button variant="secondary" size="sm" className="mt-1.5" onClick={() => void refresh()}>
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {refreshing && <span role="status">Updating…</span>}
        {wallet && wallet.reserved > 0 && (
          <span title="Held for in-flight operations" className="tabular-nums">
            {formatCredits(wallet.reserved)} reserved
          </span>
        )}
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      {balanceHero}

      {error && balance !== null && (
        <p role="status" className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Showing your last confirmed balance — we couldn&apos;t reach the server just now.
        </p>
      )}

      {health === "empty" && <ZeroBalanceState />}
      {health === "low" && (
        <LimitWarning message={`Your ${CREDIT_LABEL} balance is getting low.`} />
      )}
      {usageWarning && <LimitWarning message={usageWarning} />}

      <div className="grid gap-4 lg:grid-cols-2">
        {data?.plan && <PlanSummaryCard key="plan" plan={data.plan} />}
        {usage && <UsageSummaryCard usage={usage} />}
      </div>

      <section id="get-credits" aria-labelledby="get-credits-title" data-testid="purchase-section">
        <h2 id="get-credits-title" className="mb-3 text-base font-semibold text-slate-900">
          Get {CREDIT_LABEL}
        </h2>
        <PurchaseSelector balance={balance} />
      </section>

      <section aria-labelledby="ledger-title">
        <h2 id="ledger-title" className="mb-3 text-base font-semibold text-slate-900">
          Credit History
        </h2>
        <CreditLedgerView />
      </section>

      <section aria-labelledby="history-title">
        <h2 id="history-title" className="mb-3 text-base font-semibold text-slate-900">
          Purchases
        </h2>
        <PurchaseHistory />
      </section>

      <p className="pt-2 text-center text-xs text-slate-300">
        Questions about billing?{" "}
        <Link href="/dashboard/help" className="underline hover:text-slate-500">
          Visit Help Center
        </Link>
      </p>
    </div>
  );
}

