"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CreditToken } from "./CreditToken";

// ============================================================================
// Prosventa Credits — Credit Balance Component
// Stage 8 — Phase 1: Prosventa Credits Architecture
// ============================================================================
// Reusable balance display: [Prosventa Credit Token] 2,450
//
// States: normal, compact, loading (skeleton), zero (clean — no aggressive
// red warnings; purchase/upgrade actions arrive in later phases) and
// insufficient (soft amber emphasis). Balance is provided via prop or fetched
// server-side and passed down — this component never recomputes the ledger.
// ============================================================================

export type CreditBalanceState = "normal" | "loading" | "zero" | "insufficient";

interface CreditBalanceProps {
  /** Available credit count. Omit when `balance` is being loaded. */
  balance?: number | null;
  /** Compact mode for tight layouts (top bars, table headers). */
  compact?: boolean;
  /** Overrides the derived display state when needed. */
  state?: CreditBalanceState;
  className?: string;
}

function deriveState(balance: number | null | undefined): CreditBalanceState {
  if (balance === null || balance === undefined) return "loading";
  if (balance <= 0) return "zero";
  if (balance < 10) return "insufficient";
  return "normal";
}

export function CreditBalance({ balance, compact = false, state, className }: CreditBalanceProps) {
  const resolvedState: CreditBalanceState =
    state ?? deriveState(typeof balance === "number" ? balance : null);

  // Avoid hydration mismatch on formatted output for SSR consumers.
  const [formatted, setFormatted] = useState<string>(
    typeof balance === "number" ? String(balance) : "—"
  );
  useEffect(() => {
    if (typeof balance === "number") {
      setFormatted(new Intl.NumberFormat("en-US").format(balance));
    }
  }, [balance]);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border transition-colors",
        compact ? "gap-1 px-1.5 py-0.5 text-[12px]" : "gap-1.5 px-2.5 py-1 text-sm",
        resolvedState === "zero" && "border-slate-200 bg-slate-50 text-slate-500",
        resolvedState === "insufficient" && "border-amber-200 bg-amber-50 text-amber-700",
        resolvedState === "normal" && "border-sky-100 bg-sky-50 text-sky-700",
        resolvedState === "loading" && "animate-pulse border-slate-200 bg-slate-50 text-slate-300",
        className
      )}
      data-testid="credit-balance"
      data-state={resolvedState}
    >
      <CreditToken size={compact ? 16 : 20} title="Prosventa Credits" />
      {resolvedState === "loading" ? (
        <span className="inline-block h-3.5 w-8 rounded bg-slate-200" aria-label="Loading credits" />
      ) : (
        <span className="font-medium tabular-nums">{formatted}</span>
      )}
    </span>
  );
}
