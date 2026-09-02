"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  CREDIT_LABEL,
  formatCredits,
  getCreditHealth,
} from "@/features/credits/ui-config";
import type { CreditSummaryDto } from "@/features/credits/api-types";
import { settingsDeepLink } from "@/lib/settings/navigation";
import { EASE_OUT } from "@/lib/motion";
import { CreditToken } from "./CreditToken";
import { AnimatedCreditValue } from "./AnimatedCreditValue";

// ============================================================================
// CreditsPopover — compact quick overview anchored to the topbar credit button
// ============================================================================
// Opens directly beneath the Prosventa Credits button. The window shell
// (header, title, surface, border/radius, shadow, spacing, entrance/exit
// animation) is preserved. Content shows ONLY: current balance (with a
// restrained allowance-based visualization), the current plan, and one CTA
// into Settings → Credits & Usage. All values come from the single
// /api/credits/summary fetch owned by CreditBalanceHeader — no duplicate
// queries, no client-computed financial values. Detailed credit management
// (usage history, packages, purchases) stays in Settings.
// ============================================================================

interface CreditsPopoverProps {
  open: boolean;
  /** Authoritative summary already fetched by CreditBalanceHeader. */
  data: CreditSummaryDto | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Called when the CTA navigates so the popover closes cleanly. */
  onNavigate: () => void;
}

/** Subtle health presentation — mirrors Settings › Credits & Usage semantics. */
const HEALTH_META: Record<
  string,
  { label: string; badge: string; bar: string }
> = {
  healthy: {
    label: "Healthy",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    bar: "bg-emerald-500",
  },
  low: {
    label: "Running low",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    bar: "bg-amber-500",
  },
  critical: {
    label: "Almost empty",
    badge: "bg-orange-50 text-orange-700 ring-orange-200",
    bar: "bg-orange-500",
  },
  empty: {
    label: "No credits",
    badge: "bg-red-50 text-red-700 ring-red-200",
    bar: "bg-red-500",
  },
};

function SkeletonBar({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-pulse rounded bg-slate-100 ${className}`}
    />
  );
}

export function CreditsPopover({
  open,
  data,
  loading,
  error,
  refresh,
  onNavigate,
}: CreditsPopoverProps) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);

  const wallet = data?.wallet ?? null;
  const balance = wallet ? wallet.balance : null;
  const allowance =
    wallet && wallet.monthlyAllowance > 0 ? wallet.monthlyAllowance : null;
  const plan = data?.plan ?? null;
  const health =
    HEALTH_META[
      getCreditHealth({ balance: balance ?? 0, monthlyAllowance: allowance })
    ];
  // Visualization ONLY when the real monthly allowance exists — never an
  // arbitrary percentage against a made-up allocation.
  const remainingPct =
    balance !== null && allowance
      ? Math.max(0, Math.min(100, Math.round((balance / allowance) * 100)))
      : null;
  const loadingData = loading && !data;
  // Keep the popover fully inside the viewport on narrow screens.
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;
    const margin = 12;
    const rect = el.getBoundingClientRect();
    let offset = 0;
    if (rect.right > window.innerWidth - margin) {
      offset = window.innerWidth - margin - rect.right;
    } else if (rect.left < margin) {
      offset = margin - rect.left;
    }
    setDx(offset);
  }, [open]);

  // Move keyboard focus into the popover when it opens.
  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <div
      className="absolute right-0 top-full z-50 mt-2"
      style={{ transform: `translateX(${dx}px)` }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label={`${CREDIT_LABEL} overview`}
        tabIndex={-1}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -6 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -6 }}
        transition={{ duration: reduce ? 0.15 : 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "top right" }}
        className="w-[380px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] focus:outline-none"
        data-testid="credits-popover"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <CreditToken size={16} />
          </span>
          <p className="text-sm font-semibold tracking-tight text-slate-900">
            {CREDIT_LABEL}
          </p>
        </div>

        {/* ---- Error state: never fabricate values -------------------------- */}
        {error && balance === null && !loadingData ? (
          <div className="px-4 py-6 text-center" role="alert">
            <p className="text-sm text-slate-600">
              Unable to load your credit balance.
            </p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-3 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="px-4 py-4">
            {/* ---- Primary credit display --------------------------------- */}
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Credits remaining
            </p>
            <div className="mt-1.5 flex items-end justify-between gap-3">
              {loadingData || balance === null ? (
                <SkeletonBar className="h-8 w-24" />
              ) : (
                <p
                  aria-live="polite"
                  className="text-3xl font-bold leading-none tracking-tight text-slate-900 tabular-nums"
                >
                  <AnimatedCreditValue value={balance} />
                </p>
              )}
              {balance !== null && health ? (
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${health.badge}`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${health.bar}`}
                  />
                  {health.label}
                </span>
              ) : (
                <SkeletonBar className="h-5 w-20" />
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">credits available</p>

            {/* ---- Allowance visualization (real allocation only) ---------- */}
            {remainingPct !== null && allowance ? (
              <div className="mt-3">
                <div
                  role="progressbar"
                  aria-label="Credits remaining relative to the monthly plan allowance"
                  aria-valuenow={remainingPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                >
                  <motion.span
                    className={`block h-full rounded-full ${
                      health?.bar ?? "bg-sky-500"
                    }`}
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${remainingPct}%` }}
                    transition={{ duration: reduce ? 0 : 0.3, ease: EASE_OUT }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
                  {remainingPct}% of monthly allowance ·{" "}
                  {formatCredits(balance ?? 0)} / {formatCredits(allowance)}
                </p>
              </div>
            ) : null}

            {/* ---- Current plan ------------------------------------------- */}
            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Current plan
              </p>
              {loadingData ? (
                <div className="mt-1.5 space-y-1.5">
                  <SkeletonBar className="h-4 w-24" />
                  <SkeletonBar className="h-3 w-32" />
                </div>
              ) : plan ? (
                <>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {plan.name}
                  </p>
                  {allowance ? (
                    <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                      {formatCredits(allowance)} credits / month
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-0.5 text-sm text-slate-400">Unavailable</p>
              )}
            </div>

            {/* ---- Single CTA into the existing Settings monetization area - */}
            <Link
              href={settingsDeepLink("credits")}
              onClick={onNavigate}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <span className="text-white/80">
                <CreditToken size={16} />
              </span>
              Top up credits
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}