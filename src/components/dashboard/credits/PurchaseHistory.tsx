"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { StatusDotBadge, Badge } from "@/components/ui/Badge";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type { PurchasesPageDto } from "@/features/credits/api-types";
import { formatCredits } from "@/features/credits/ui-config";

// ============================================================================
// PurchaseHistory — paginated purchase table
// Server-side pagination via GET /api/payments/purchases. Refunded purchases
// stay visible with an explicit status (history is never silently rewritten).
// ============================================================================

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  paid: "success",
  refunded: "neutral",
  partially_refunded: "warning",
  failed: "danger",
  pending: "warning",
  processing: "warning",
  cancelled: "neutral",
  expired: "neutral",
};

export function PurchaseHistory() {
  const [page, setPage] = useState(1);
  const { data, error, loading, refresh } =
    useApiResource<PurchasesPageDto>(`/api/payments/purchases?page=${page}&pageSize=10`);

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-medium text-slate-700">
          Unable to load your purchase history.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  const purchases = data?.purchases ?? [];
  if (purchases.length === 0) {
    return (
      <div className="py-8 text-center" data-testid="purchase-history-empty">
        <h4 className="text-sm font-semibold text-slate-900">No purchases yet.</h4>
        <p className="mt-1 text-sm text-slate-500">
          When you purchase Prosventa Credits, your transactions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="purchase-history">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Your credit purchases</caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Purchase</th>
              <th scope="col" className="px-4 py-2.5 font-medium text-right">Credits</th>
              <th scope="col" className="px-4 py-2.5 font-medium text-right">Amount</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchases.map((p) => (
              <tr key={p.id} className="text-slate-600">
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">{p.packageName}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900 tabular-nums">
                  {formatCredits(p.credits)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {p.displayAmount}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusDotBadge variant={STATUS_VARIANT[p.status] ?? "neutral"}>
                    {p.status.replace(/_/g, " ")}
                  </StatusDotBadge>
                  {p.refundedAmountMinor > 0 && (
                    <Badge variant="neutral" className="ml-1.5">
                      refunded
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(data?.hasMore || page > 1) && (
        <nav className="mt-3 flex items-center justify-between" aria-label="Purchase history pagination">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-400">Page {page}</span>
          <Button
            variant="secondary"
            size="sm"
            disabled={!data?.hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
