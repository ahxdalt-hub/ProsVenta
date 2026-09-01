"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type { CreditSummaryDto } from "@/features/credits/api-types";
import {
  getCreditHealth,
  CREDIT_LABEL,
} from "@/features/credits/ui-config";
import { CreditToken } from "./CreditToken";
import { AnimatedCreditValue } from "./AnimatedCreditValue";
import { CreditsPopover } from "./CreditsPopover";

// ============================================================================
// CreditBalanceHeader — application-shell credit balance
// Stage 8 — Phase 5 · Settings rebuild Phase 4
// ============================================================================
// Subtle topbar widget: "Prosventa Credits / 5,240". Never dominates the UI.
// Click opens a compact quick-overview POPOVER anchored to this button instead
// of navigating away. The single /api/credits/summary fetch here feeds both the
// button and the popover — no extra requests. On load FAILURE it never shows
// 0 — it shows a neutral "unavailable" state with retry (critical distinction).
// The popover's "View billing details" CTA routes to the canonical NEW Settings
// landing page (/dashboard/settings?focus=billing), which smooth-scrolls to and
// highlights the Billing section.
// ============================================================================

export function CreditBalanceHeader() {
  const router = useRouter();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { data, error, loading, refreshing, refresh } =
    useApiResource<CreditSummaryDto>("/api/credits/summary");

  const closePopover = useCallback((restoreFocus = true) => {
    setPopoverOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Outside click + Escape dismissal. Clicks INSIDE never close it.
  useEffect(() => {
    if (!popoverOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopover();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [popoverOpen, closePopover]);

  const handleViewBilling = () => {
    setPopoverOpen(false);
    router.push("/dashboard/settings?focus=billing");
  };

  const balance =
    typeof data?.wallet?.balance === "number" ? data.wallet.balance : null;
  const health = getCreditHealth({
    balance: balance ?? 0,
    monthlyAllowance: data?.wallet?.monthlyAllowance ?? null,
  });

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setPopoverOpen((prev) => !prev)}
        aria-expanded={popoverOpen}
        aria-haspopup="dialog"
        aria-label={
          balance !== null
            ? `${CREDIT_LABEL}: ${balance}. Show credits overview.`
            : `${CREDIT_LABEL} balance unavailable. Show credits overview.`
        }
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        data-testid="credit-balance-header"
        data-health={health}
      >
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {CREDIT_LABEL}
          </span>
          {loading ? (
            <span
              className="inline-block h-4 w-12 animate-pulse rounded bg-slate-100"
              aria-hidden="true"
            />
          ) : error && balance === null ? (
            // NETWORK FAILURE ≠ zero credits. Neutral unavailable state + retry.
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              Unavailable
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  void refresh();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    void refresh();
                  }
                }}
                className="rounded px-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Retry
              </span>
            </span>
          ) : (
            <span
              aria-live="polite"
              className={`text-sm ${
                health === "critical" || health === "empty"
                  ? "text-amber-600"
                  : "text-slate-900"
              }`}
            >
              <AnimatedCreditValue value={balance ?? 0} />
            </span>
          )}
        </span>
        <span className="text-sky-600">
          <CreditToken size={20} />
        </span>
        {refreshing && (
          <span className="sr-only" role="status">
            Updating balance…
          </span>
        )}
      </button>

      <AnimatePresence>
        {popoverOpen && (
          <CreditsPopover
            open={popoverOpen}
            onViewBilling={handleViewBilling}
            data={data}
            loading={loading}
            error={error}
            onRetry={() => void refresh()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
