"use client";

import Link from "next/link";

import { formatCredits } from "@/features/credits/ui-config";

// ============================================================================
// Plan-limit / feature-gate notices — distinct from out-of-credits.
// ============================================================================

/** Plan limit reached ≠ out of credits. Distinct problem, distinct copy. */
export function PlanLimitNotice({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  return (
    <div
      role="status"
      data-testid="plan-limit-reached"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      <h4 className="text-sm font-semibold text-amber-900">
        You&apos;ve reached your {label.toLowerCase()} limit.
      </h4>
      <p className="mt-1 text-sm text-amber-800 tabular-nums">
        Current: {formatCredits(used)} / {formatCredits(limit)}
      </p>
      <p className="mt-1 text-sm text-amber-800">
        Your current plan doesn&apos;t allow additional {label.toLowerCase()}.
      </p>
    </div>
  );
}

/** Feature gate with explanation — never a silently disabled button. */
export function FeatureNotIncludedNotice({ featureName }: { featureName: string }) {
  return (
    <div
      role="status"
      data-testid="feature-not-included"
      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      <h4 className="text-sm font-semibold text-slate-900">{featureName}</h4>
      <p className="mt-1 text-sm text-slate-600">
        This feature isn&apos;t included in your current plan.
      </p>
      <p className="text-sm text-slate-600">Upgrade your plan to unlock it.</p>
      <Link
        href="/dashboard/settings/billing#plan"
        className="mt-3 inline-flex rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        View Plans
      </Link>
    </div>
  );
}

/**
 * Inline batch estimate line (for use next to a Start button). Shows the
 * estimated total as an ESTIMATE plus projected remaining balance.
 */
export function BatchEstimateLine({
  estimatedCost,
  balance,
}: {
  estimatedCost: number;
  balance: number | null;
}) {
  return (
    <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-slate-600" data-testid="batch-estimate">
      <p>
        Estimated usage:{" "}
        <span className="font-semibold text-slate-900 tabular-nums">
          {formatCredits(estimatedCost)} Prosventa Credits
        </span>
      </p>
      {typeof balance === "number" && (
        <p className="mt-0.5 tabular-nums">
          Remaining after completion (estimated):{" "}
          {formatCredits(Math.max(balance - estimatedCost, 0))}
        </p>
      )}
    </div>
  );
}
