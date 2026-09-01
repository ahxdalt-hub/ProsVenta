"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type { LedgerPageDto } from "@/features/credits/api-types";
import {
  formatSignedCredits,
  ledgerTypeLabel,
} from "@/features/credits/ui-config";
import { CreditToken } from "./CreditToken";

// ============================================================================
// CreditLedgerView — customer-readable credit history
// "+10,000  Credit purchase" / "-50  Deep Research". Server-side pagination;
// internal DB ids are never the primary user-facing information.
// ============================================================================

export function CreditLedgerView() {
  const [page, setPage] = useState(1);
  const { data, error, loading, refresh } =
    useApiResource<LedgerPageDto>(`/api/credits/ledger?page=${page}&pageSize=15`);

  if (loading) {
    return (
      <ul className="space-y-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-medium text-slate-700">
          Unable to load your credit activity.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  const entries = data?.entries ?? [];
  if (entries.length === 0) {
    return (
      <div className="py-8 text-center" data-testid="ledger-empty">
        <span className="mx-auto mb-3 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-sky-50 text-sky-500">
          <CreditToken size={24} />
        </span>
        <h4 className="text-sm font-semibold text-slate-900">No credit activity yet.</h4>
        <p className="mt-1 text-sm text-slate-500">
          Your purchases and Prosventa usage will appear here.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="credit-ledger">
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {ledgerTypeLabel(e.type)}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {new Date(e.createdAt).toLocaleString()}
                {e.description && e.description !== ledgerTypeLabel(e.type)
                  ? ` · ${e.description}`
                  : ""}
              </p>
            </div>
            <span
              className={`shrink-0 text-sm font-semibold tabular-nums ${
                e.amount > 0 ? "text-green-700" : "text-slate-700"
              }`}
              aria-label={`${formatSignedCredits(e.amount)} Credits`}
            >
              {formatSignedCredits(e.amount)}
            </span>
          </li>
        ))}
      </ul>
      {(data?.hasMore || page > 1) && (
        <nav className="mt-3 flex items-center justify-between" aria-label="Credit history pagination">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="text-xs text-slate-400">Page {page}</span>
          <Button variant="secondary" size="sm" disabled={!data?.hasMore} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
