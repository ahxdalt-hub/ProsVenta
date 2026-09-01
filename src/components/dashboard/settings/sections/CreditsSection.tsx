"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type { CreditSummaryDto } from "@/features/credits/api-types";
import {
  getCreditHealth,
  formatCredits,
  CREDIT_LABEL,
} from "@/features/credits/ui-config";
import { CREDIT_OPERATION_CATALOG } from "@/features/credits/operations";
import { CreditToken } from "@/components/dashboard/credits/CreditToken";
import { AnimatedCreditValue } from "@/components/dashboard/credits/AnimatedCreditValue";
import { CreditLedgerView } from "@/components/dashboard/credits/CreditLedgerView";
import { UsageSummaryCard } from "@/components/dashboard/credits/UsageSummary";
import { settingsHref } from "@/lib/settings/navigation";

// ============================================================================
// CreditsSection — Settings › Credits & Usage
// ============================================================================
// Answers, in order: how many credits do I have, what have I used, what costs
// credits, where did they go, and how do I get more. All values come from the
// server (/api/credits/*) — never fabricated. Operation costs are rendered
// straight from CREDIT_OPERATION_CATALOG, the single pricing source of truth.
// ============================================================================

const CATALOG_ENTRIES = Object.values(CREDIT_OPERATION_CATALOG).filter(
  (op) => op.enabled
);

export function CreditsSection() {
  const { data, loading, refreshing, refresh } =
    useApiResource<CreditSummaryDto>("/api/credits/summary");

  const wallet = data?.wallet ?? null;
  const balance = typeof wallet?.balance === "number" ? wallet.balance : null;
  const health =
    balance !== null
      ? getCreditHealth({
          balance,
          monthlyAllowance: wallet?.monthlyAllowance ?? null,
        })
      : null;
  const usage = data?.usage ?? null;

  return (
    <div className="space-y-6">
      {/* Balance hero — primary but restrained */}
      <section
        className="premium-card flex items-center justify-between gap-4 p-6"
        data-testid="credits-balance"
      >
        <div className="flex items-center gap-3">
          <span className="text-sky-600">
            <CreditToken size={48} />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Available {CREDIT_LABEL}
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
              /* Load failure ≠ zero credits */
              <div role="alert" className="mt-1">
                <p className="text-sm text-slate-500">
                  Unable to load your credit balance.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-1.5"
                  onClick={() => void refresh()}
                >
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
          <Link
            href={settingsHref("plan-billing")}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50"
          >
            Get more credits
          </Link>
        </div>
      </section>

      {/* Usage */}
      <section aria-labelledby="credits-usage-title">
        <h2
          id="credits-usage-title"
          className="mb-3 text-base font-semibold text-slate-900"
        >
          Usage this billing period
        </h2>
        {loading ? (
          <div className="h-48 animate-pulse rounded-xl bg-slate-100" aria-busy="true" />
        ) : usage ? (
          <UsageSummaryCard usage={usage} />
        ) : (
          <div
            className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center"
            data-testid="credits-usage-empty"
          >
            <h4 className="text-sm font-semibold text-slate-900">
              No credit usage yet.
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              You haven&apos;t used any Prosventa Credits yet. Intelligence actions
              like company enrichment, prospect research and signal detection
              consume credits when they run.
            </p>
          </div>
        )}
      </section>

      {/* Cost catalog — authoritative prices only */}
      <section aria-labelledby="credit-costs-title">
        <h2
          id="credit-costs-title"
          className="mb-1 text-base font-semibold text-slate-900"
        >
          What costs credits
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Costs are shown before you run an action. Failed operations are not
          charged.
        </p>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {CATALOG_ENTRIES.map((op) => (
            <li
              key={op.key}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {op.displayName}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {op.description}
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 tabular-nums">
                <CreditToken size={16} />
                {formatCredits(op.cost)} credit{op.cost === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Ledger */}
      <section aria-labelledby="credits-ledger-title">
        <h2
          id="credits-ledger-title"
          className="mb-3 text-base font-semibold text-slate-900"
        >
          Credit history
        </h2>
        <CreditLedgerView />
      </section>
    </div>
  );
}

