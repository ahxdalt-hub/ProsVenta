"use client";

import { StatusDotBadge } from "@/components/ui/Badge";
import type { CreditSummaryDto } from "@/features/credits/api-types";
import { UsageBar } from "./UsageOverview";

function formatPeriod(fromIso: string, toIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${new Date(fromIso).toLocaleDateString("en-US", opts)} – ${new Date(toIso).toLocaleDateString(
    "en-US",
    opts
  )}`;
}

/** Configurable warning banner before a limit is hit. */
export function LimitWarning({ message }: { message: string }) {
  return (
    <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="limit-warning">
      {message}
    </div>
  );
}

export function PlanSummaryCard({ plan }: { plan: NonNullable<CreditSummaryDto["plan"]> }) {
  const billingVariant =
    plan.billingStatus === "active" ? "success" : plan.billingStatus === "past_due" ? "danger" : "neutral";
  return (
    <section id="plan" data-testid="plan-summary" className="premium-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{plan.name}</h3>
        <StatusDotBadge variant={billingVariant}>
          {plan.billingStatus === "past_due" ? "Payment issue" : plan.billingStatus}
        </StatusDotBadge>
      </div>
      {plan.billingStatus === "past_due" && (
        <p className="mt-2 text-xs text-red-700">Your subscription requires attention.</p>
      )}
      {plan.periodStart && plan.periodEnd && (
        <p className="mt-1 text-xs text-slate-400 tabular-nums">
          Current period: {formatPeriod(plan.periodStart, plan.periodEnd)}
        </p>
      )}
      <div className="mt-4 space-y-3">
        {plan.limits.map((l) => (
          <UsageBar key={l.key} label={l.label} used={l.used} limit={l.limitType === "unlimited" ? null : l.value} />
        ))}
      </div>
      {plan.limitExceeded && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Your current usage exceeds this plan&apos;s limits. Existing data is safe, but you
          can&apos;t add more until usage is within the limit.
        </p>
      )}
    </section>
  );
}
