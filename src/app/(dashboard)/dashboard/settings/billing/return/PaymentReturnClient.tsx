"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  usePurchaseStatus,
} from "@/components/dashboard/credits/usePurchaseStatus";
import { formatCredits } from "@/features/credits/ui-config";
import {
  PaymentProcessingView,
  PaymentSuccessView,
  PaymentFailureView,
  ReceiptSummary,
} from "@/components/dashboard/credits/PaymentResult";
import { formatMinorAmountClient } from "@/components/dashboard/credits/format";
// ============================================================================
// Payment Return Page — /dashboard/settings/billing/return
// ============================================================================
// Landing point after the hosted checkout. A redirect here proves NOTHING:
// the authoritative purchase status is polled until the backend resolves it.
// Statuses handled: pending → processing view; paid → success (+balance);
// failed/cancelled/expired → failure (credits unchanged); refunded → success
// copy is never shown. Uncertain fetches keep "still confirming".
// ============================================================================

const PENDING_PURCHASE_KEY = "prosventa.pending-purchase";

function statusCategory(status: string): "pending" | "confirmed" | "failed" | "cancelled" {
  switch (status) {
    case "paid":
      return "confirmed";
    case "failed":
      return "failed";
    case "cancelled":
    case "expired":
      return "cancelled";
    default:
      return "pending"; // pending + processing stay in the confirming state
  }
}

export function PaymentReturnClient() {
  const params = useSearchParams();
  const urlPurchaseId = params.get("purchase");
  const [purchaseId, setPurchaseId] = useState<string | null>(urlPurchaseId);
  const [ready, setReady] = useState(false);

  // The checkout flow stashes the purchase id before redirecting to the
  // provider; fall back to ?status=cancelled style URLs gracefully.
  useEffect(() => {
    if (!purchaseId) {
      try {
        setPurchaseId(sessionStorage.getItem(PENDING_PURCHASE_KEY));
      } catch {
        /* ignore */
      }
    }
    try {
      sessionStorage.removeItem(PENDING_PURCHASE_KEY);
    } catch {
      /* ignore */
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, error } = usePurchaseStatus(purchaseId);

  if (!ready) return <PaymentProcessingView />;

  const queryStatus = params.get("status");
  // No purchase reference at all AND an explicit cancel from the provider.
  if (!purchaseId && queryStatus === "cancelled") {
    return <PaymentFailureView />;
  }
  if (!purchaseId) {
    return (
      <>
        <PaymentProcessingView stillConfirming={Boolean(error)} />
        <p className="mt-6 text-center text-xs text-slate-400">
          You can safely leave this page. If your payment completes, your Credits
          will be added automatically.
        </p>
      </>
    );
  }

  if (!data) {
    return <PaymentProcessingView stillConfirming={error} />;
  }

  const { purchase, balance } = data;
  switch (statusCategory(purchase.status)) {
    case "confirmed": {
      if (purchase.status === "refunded") {
        // Refunded: show clearly, no celebratory success copy.
        return (
          <div className="py-10 text-center" role="status">
            <h3 className="text-base font-semibold text-slate-900">Refunded</h3>
            <p className="mt-1 text-sm text-slate-500 tabular-nums">
              {formatCredits(purchase.credits)} Credits · {purchase.packageKey}
            </p>
            <ReceiptSummary
              createdAt={purchase.createdAt}
              credits={purchase.credits}
              displayAmount={formatMinorAmountClient(purchase.amount, purchase.currency)}
              status={purchase.status}
              referenceId={purchase.id}
            />
          </div>
        );
      }
      return (
        <PaymentSuccessView
          credits={purchase.credits}
          newBalance={balance}
          receipt={
            <ReceiptSummary
              createdAt={purchase.createdAt}
              credits={purchase.credits}
              displayAmount={formatMinorAmountClient(purchase.amount, purchase.currency)}
              status={purchase.status}
              referenceId={purchase.id}
            />
          }
        />
      );
    }
    case "failed":
      return <PaymentFailureView />;
    case "cancelled":
      return (
        <PaymentFailureView />
      );
    case "pending":
    default:
      return <PaymentProcessingView stillConfirming={error} />;
  }
}

export { PENDING_PURCHASE_KEY };
