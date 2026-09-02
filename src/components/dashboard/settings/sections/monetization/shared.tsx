"use client";

// ============================================================================
// Monetization shared UI — Settings › Credits / Plan & Billing / Purchases
// ============================================================================
// Client-safe helpers shared by the three monetization sections. Everything
// financial displayed here is SERVER-AUTHORITATIVE — this module only formats
// confirmed values and reuses the EXISTING checkout flow (POST
// /api/payments/checkout → provider hosted checkout → /settings/billing/return).
// ============================================================================

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type {
  CheckoutResultDto,
  CreditPackageDto,
} from "@/features/credits/api-types";
import { formatCredits } from "@/features/credits/ui-config";
import { cn } from "@/lib/utils";

/** sessionStorage key shared with the payment return page (existing flow). */
export const PENDING_PURCHASE_KEY = "prosventa.pending-purchase";

// ----------------------------------------------------------------------------
// Formatting
// ----------------------------------------------------------------------------

/** "2026-08-15T…" → "Aug 15, 2026" (customer-facing, stable). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "2026-08" → "August 2026" (billing period label). */
export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ----------------------------------------------------------------------------
// Checkout — reuses the existing, already-implemented payment flow
// ----------------------------------------------------------------------------

export interface PackageCheckout {
  /** Package key currently preparing a checkout (loading state), if any. */
  startingKey: string | null;
  error: string | null;
  start: (pkg: CreditPackageDto) => Promise<void>;
  clearError: () => void;
}

/**
 * Starts a hosted checkout for a package. Sends ONLY the package key — the
 * server re-resolves the authoritative price/credits (price-tamper proof).
 * Errors (e.g. payment provider not configured) surface as a safe message;
 * a purchase is NEVER presented as completed without backend confirmation.
 */
export function usePackageCheckout(): PackageCheckout {
  const [startingKey, setStartingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (pkg: CreditPackageDto) => {
      if (startingKey) return; // duplicate-click protection
      setStartingKey(pkg.key);
      setError(null);
      try {
        const res = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            packageKey: pkg.key,
            requestId: crypto.randomUUID(), // server-side idempotency key
          }),
        });
        const body = (await res.json()) as CheckoutResultDto & { error?: string };
        if (!res.ok || !body.checkoutUrl) {
          throw new Error(
            body.error ?? "We couldn't start your checkout. Please try again."
          );
        }
        // Remember the purchase for the return page's authoritative status poll.
        try {
          sessionStorage.setItem(PENDING_PURCHASE_KEY, body.purchaseId);
        } catch {
          /* storage unavailable — return page falls back to generic state */
        }
        window.location.assign(body.checkoutUrl);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "We couldn't start your checkout."
        );
        setStartingKey(null);
      }
    },
    [startingKey]
  );

  const clearError = useCallback(() => setError(null), []);

  return { startingKey, error, start, clearError };
}

/** Effective value of a package: credits per one major currency unit. */
export function packageUnitValue(pkg: CreditPackageDto): number | null {
  const major = pkg.priceMinor / 100;
  if (major <= 0) return null;
  return pkg.creditAmount / major;
}


// ----------------------------------------------------------------------------
// Badges
// ----------------------------------------------------------------------------

type BadgeVariant = Parameters<typeof Badge>[0]["variant"];

const LEDGER_BADGES: Record<string, { label: string; variant: BadgeVariant }> = {
  grant: { label: "Granted", variant: "success" },
  purchase: { label: "Purchase", variant: "default" },
  topup: { label: "Top-up", variant: "default" },
  consumption: { label: "Used", variant: "neutral" },
  deduction: { label: "Used", variant: "neutral" },
  refund: { label: "Refund", variant: "warning" },
  adjustment: { label: "Adjustment", variant: "neutral" },
  expiration: { label: "Expired", variant: "warning" },
  reservation: { label: "Reserved", variant: "neutral" },
  release: { label: "Released", variant: "neutral" },
};

/** Ledger movement → calm, honest status badge. */
export function LedgerTypeBadge({ type }: { type: string }) {
  const entry = LEDGER_BADGES[type] ?? {
    label: "Credit activity",
    variant: "neutral" as BadgeVariant,
  };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

const PURCHASE_BADGES: Record<string, { label: string; variant: BadgeVariant }> = {
  paid: { label: "Paid", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  processing: { label: "Processing", variant: "default" },
  failed: { label: "Failed", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  expired: { label: "Expired", variant: "neutral" },
  refunded: { label: "Refunded", variant: "warning" },
  partially_refunded: { label: "Partially refunded", variant: "warning" },
};

/** Authoritative purchase status → presentation badge. */
export function PurchaseStatusBadge({ status }: { status: string }) {
  const entry = PURCHASE_BADGES[status] ?? {
    label: status,
    variant: "neutral" as BadgeVariant,
  };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

// ----------------------------------------------------------------------------
// Loading skeletons & shared states
// ----------------------------------------------------------------------------

export function SummarySkeleton() {
  return (
    <div className="premium-card p-6 sm:p-7" aria-busy="true">
      <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 h-10 w-40 animate-pulse rounded-lg bg-slate-100" />
      <div className="mt-6 h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
      <div className="mt-3 h-3 w-56 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-lg bg-slate-50"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

/** Error state with a retry action (existing Prosventa convention). */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-center"
    >
      <p className="text-sm font-medium text-slate-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Retry
      </button>
    </div>
  );
}

/** Compact stat tile used in the summaries of all three sections. */
export function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3.5",
        className
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** Shared credit-count label ("1,200 Credits"). */
export function creditCount(credits: number): string {
  return `${formatCredits(credits)} Credits`;
}

