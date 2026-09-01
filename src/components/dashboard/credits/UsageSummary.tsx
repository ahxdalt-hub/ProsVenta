"use client";

import type { CreditSummaryDto } from "@/features/credits/api-types";
import { formatCredits, CREDIT_LABEL } from "@/features/credits/ui-config";

function formatPeriod(fromIso: string, toIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${new Date(fromIso).toLocaleDateString("en-US", opts)} – ${new Date(toIso).toLocaleDateString(
    "en-US",
    opts
  )}`;
}

export function UsageSummaryCard({ usage }: { usage: NonNullable<CreditSummaryDto["usage"]> }) {
  return (
    <section data-testid="usage-summary" className="premium-card p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">This month</h3>
        {/* Clear period label so monthly usage ≠ lifetime credits */}
        <span className="text-xs text-slate-400 tabular-nums">
          {formatPeriod(usage.periodStart, usage.periodEnd)}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-slate-400">Credits used</dt>
          <dd className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatCredits(usage.usedCredits)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Operations</dt>
          <dd className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatCredits(usage.operationCount)}
          </dd>
        </div>
      </dl>
      {usage.byCategory.length > 0 && (
        <div className="mt-5 space-y-2.5" data-testid="usage-breakdown">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            By operation type
          </h4>
          {usage.byCategory.map((entry) => (
            <div key={entry.category} className="flex items-center justify-between text-xs">
              <span className="capitalize text-slate-600">{entry.category}</span>
              <span className="font-medium text-slate-900 tabular-nums">
                {formatCredits(entry.credits)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Zero-balance state: calm and actionable — never visually alarming. */
export function ZeroBalanceState() {
  return (
    <div role="status" data-testid="zero-balance" className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
      <p className="font-medium text-slate-800">You&apos;ve used all available Credits.</p>
      <a href="#get-credits" className="mt-2 inline-flex rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800">
        Get {CREDIT_LABEL}
      </a>
    </div>
  );
}
