"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { StatusDotBadge } from "@/components/ui/Badge";
import { formatCredits, CREDIT_LABEL } from "@/features/credits/ui-config";
import { CreditTokenPulse, CreditGainReveal } from "./AnimatedCreditValue";
import { CreditToken } from "./CreditToken";

// ============================================================================
// PaymentResult — authoritative payment outcome views
// Only ever shows states the backend confirmed. Never "successful" while
// pending; never implies money was/wasn't charged when the state is uncertain.
// ============================================================================

export function PaymentProcessingView({ stillConfirming = false }: { stillConfirming?: boolean }) {
  return (
    <div className="flex flex-col items-center py-12 text-center" role="status" aria-live="polite">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" aria-hidden="true" />
      <h3 className="mt-5 text-base font-semibold text-slate-900">Payment processing</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {stillConfirming
          ? "We're still confirming your payment. This can take a short while — you don't need to do anything."
          : "We're confirming your payment and updating your Prosventa Credits."}
      </p>
    </div>
  );
}

export function PaymentSuccessView({
  credits,
  newBalance,
  receipt,
}: {
  credits: number;
  newBalance: number | null;
  receipt?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-10 text-center" aria-live="polite">
      <CreditTokenPulse>
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      </CreditTokenPulse>
      <h3 className="mt-4 text-base font-semibold text-slate-900">Payment successful ✓</h3>
      <div className="mt-3 flex items-center gap-2">
        <CreditGainReveal amount={credits} />
        <span className="text-sm text-slate-600">{CREDIT_LABEL}</span>
      </div>
      {typeof newBalance === "number" ? (
        <p className="mt-2 text-sm text-slate-500 tabular-nums" role="status">
          New balance: {formatCredits(newBalance)} Credits
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Balance will update shortly.</p>
      )}
      {receipt}
      <Link
        href="/dashboard/settings/billing"
        className="mt-6 inline-flex rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Back to Billing
      </Link>
    </div>
  );
}

export function PaymentFailureView({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center py-10 text-center" role="alert" aria-live="assertive">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <CreditToken size={32} className="text-slate-400" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-900">
        Payment couldn&apos;t be completed
      </h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        No Prosventa Credits were added. Your existing balance is unchanged.
      </p>
      <div className="mt-6 flex gap-2">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try Again
          </Button>
        )}
        <Link
          href="/dashboard/settings/billing"
          className="inline-flex items-center rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
        >
          Back to Billing
        </Link>
      </div>
    </div>
  );
}

/** Concise receipt summary — no provider internals exposed. */
export function ReceiptSummary({
  createdAt,
  packageName,
  credits,
  displayAmount,
  status,
  referenceId,
}: {
  createdAt: string;
  packageName?: string;
  credits: number;
  displayAmount: string;
  status: string;
  referenceId: string;
}) {
  const rows: Array<[string, React.ReactNode]> = [
    ["Date", new Date(createdAt).toLocaleString()],
    ...(packageName ? ([["Package", packageName]] as Array<[string, React.ReactNode]>) : []),
    ["Credits", formatCredits(credits)],
    ["Amount", displayAmount],
    [
      "Status",
      <StatusDotBadge key="s" variant={status === "paid" ? "success" : "neutral"}>
        {status}
      </StatusDotBadge>,
    ],
    [
      "Reference",
      <code key="r" className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
        {referenceId.slice(0, 8).toUpperCase()}
      </code>,
    ],
  ];
  return (
    <dl
      className="mt-6 w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs"
      data-testid="receipt"
    >
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 py-1">
          <dt className="text-slate-400">{label}</dt>
          <dd className="font-medium text-slate-700 tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
