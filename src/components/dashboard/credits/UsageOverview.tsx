"use client";

import { formatCredits } from "@/features/credits/ui-config";

// ============================================================================
// UsageOverview — usage progress bars
// ============================================================================

/** Progress bar — neutral blue; amber reserved for genuinely high usage. */
export function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  if (limit === null) {
    return (
      <div className="text-sm text-slate-500" data-testid="usage-bar-unlimited">
        <span className="font-medium text-slate-700">{label}</span> · Unlimited
      </div>
    );
  }
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = pct >= 95 ? "bg-amber-500" : "bg-sky-500";
  return (
    <div data-testid="usage-bar" data-pct={pct}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="tabular-nums text-slate-400">
          {formatCredits(used)} / {formatCredits(limit)} · {pct}%
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} usage ${pct}%`}
      >
        <div className={`h-full rounded-full transition-[width] duration-200 ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
