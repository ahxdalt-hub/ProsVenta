"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { CreditSummaryDto } from "@/features/credits/api-types";
import { getCreditHealth, formatCredits, CREDIT_LABEL } from "@/features/credits/ui-config";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import { CreditToken } from "./CreditToken";

// ============================================================================
// CreditsPopover — compact quick overview anchored to the topbar credit button
// ============================================================================
// Opens directly beneath the Prosventa Credits button. Shows the REAL balance
// (fed from the header's existing /api/credits/summary fetch — no extra
// requests). The only navigation action is "View billing details", which goes
// to the canonical NEW Settings landing page with a Billing-focus instruction.
// Entrance/exit: subtle fade + scale + vertical settle (~220ms), fade-only
// when reduced motion is preferred.
// ============================================================================

interface CreditsPopoverProps {
  open: boolean;
  onViewBilling: () => void;
  data: CreditSummaryDto | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function CreditsPopover({
  open,
  onViewBilling,
  data,
  loading,
  error,
  onRetry,
}: CreditsPopoverProps) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);

  const balance =
    typeof data?.wallet?.balance === "number" ? data.wallet.balance : null;
  const monthlyAllowance = data?.wallet?.monthlyAllowance ?? null;
  const health = getCreditHealth({ balance: balance ?? 0, monthlyAllowance });

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
        className="w-[340px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] focus:outline-none"
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

        {/* Balance */}
        <div className="px-4 pb-1 pt-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Your available credits
          </p>
          {loading ? (
            <span
              className="mt-1 inline-block h-7 w-24 animate-pulse rounded bg-slate-100"
              aria-hidden="true"
            />
          ) : error && balance === null ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
              Balance unavailable
              <button
                type="button"
                onClick={onRetry}
                className="rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Retry
              </button>
            </p>
          ) : (
            <p
              aria-live="polite"
              className={`mt-0.5 text-[28px] font-bold leading-tight tabular-nums ${
                health === "critical" || health === "empty"
                  ? "text-amber-600"
                  : "text-slate-900"
              }`}
            >
              {formatCredits(balance ?? 0)}
            </p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Credits power Prosventa&apos;s intelligence features such as
            enrichment, research, signals, and automation.
          </p>
        </div>

        {/* Usage / balance context */}
        <div className="mx-4 mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <DashboardIcon name="analytics" size={13} className="text-slate-400" />
            Current balance
          </span>
          <span className="text-xs font-semibold tabular-nums text-slate-900">
            {balance !== null ? formatCredits(balance) : "—"}
          </span>
        </div>

        {/* CTA */}
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={onViewBilling}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            data-testid="credits-popover-billing-cta"
          >
            View billing details
            <DashboardIcon name="chevron-down" size={14} className="-rotate-90" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}