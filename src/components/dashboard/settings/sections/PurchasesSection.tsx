"use client";

// ============================================================================
// PurchasesSection — Settings › Purchases
// ============================================================================
// "What have I bought from Prosventa?" — purchase summary, history, and a
// lightweight detail modal, all from the AUTHORITATIVE purchase history API
// (GET /api/payments/purchases). No purchase is ever shown that doesn't exist,
// no card/sensitive payment data is displayed, and the empty state links to
// Credits & Usage rather than duplicating the package catalog here.
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SettingsCard, SettingsCardHeader } from "@/components/dashboard/settings/SettingsCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { settingsHref } from "@/lib/settings/navigation";
import type { PurchaseDto, PurchasesPageDto } from "@/features/credits/api-types";
import { formatCredits } from "@/features/credits/ui-config";
import { EASE_OUT } from "@/lib/motion";
import {
  ErrorState,
  PurchaseStatusBadge,
  StatTile,
  TableSkeleton,
  formatDate,
} from "./monetization/shared";

const PAGE_SIZE = 20;

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
};

export function PurchasesSection() {
  const reduce = useReducedMotion();
  const [purchases, setPurchases] = useState<PurchaseDto[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PurchaseDto | null>(null);

  const fetchPage = useCallback(
    async (nextPage: number, appending: boolean) => {
      if (appending) setLoadingMore(true);
      try {
        const res = await fetch(
          `/api/payments/purchases?page=${nextPage}&pageSize=${PAGE_SIZE}`,
          { credentials: "same-origin" }
        );
        const body = (await res.json()) as PurchasesPageDto & { error?: string };
        if (!res.ok) {
          throw new Error(body.error ?? "Unable to load your purchase history.");
        }
        setPurchases((prev) =>
          appending && prev ? [...prev, ...body.purchases] : body.purchases
        );
        setPage(body.page);
        setHasMore(body.hasMore);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your purchase history."
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchPage(1, false);
  }, [fetchPage]);

  const list = purchases ?? [];
  // Summary computed ONLY from confirmed purchase records.
  const paid = list.filter((p) => p.status === "paid");
  const totalCredits = paid.reduce((sum, p) => sum + p.credits, 0);
  const currencies = new Set(paid.map((p) => p.currency));
  const totalSpentMinor =
    currencies.size === 1
      ? paid.reduce((sum, p) => sum + p.amountMinor, 0)
      : null;
  const spentSymbol = paid[0]?.displayAmount.replace(/[\d.,\s]/g, "") ?? "";
  const mostRecent = paid[0] ?? null;

  if (loading) return <TableSkeleton rows={4} />;

  const motionProps = reduce
    ? {}
    : {
        variants: SECTION_VARIANTS,
        initial: "hidden" as const,
        animate: "visible" as const,
      };

  return (
    <div className="space-y-6">
      {error && !purchases && (
        <ErrorState message={error} onRetry={() => void fetchPage(1, false)} />
      )}

      {/* ---- Purchase summary ------------------------------------------------ */}
      {paid.length > 0 && (
        <motion.section {...motionProps}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Credits Purchased" value={formatCredits(totalCredits)} />
            <StatTile label="Purchases" value={String(paid.length)} />
            <StatTile
              label="Most Recent"
              value={mostRecent ? formatDate(mostRecent.createdAt) : "—"}
            />
            <StatTile
              label="Total Spent"
              value={
                totalSpentMinor !== null
                  ? `${spentSymbol}${(totalSpentMinor / 100).toLocaleString("en-US")}`
                  : "—"
              }
              hint={currencies.size > 1 ? "Multiple currencies" : undefined}
            />
          </div>
        </motion.section>
      )}

      {/* ---- Purchase history ------------------------------------------------ */}
      <motion.section {...motionProps}>
        <SettingsCard>
          <SettingsCardHeader
            title="Purchase History"
            description="Your credit purchases. Select a purchase for details."
          />
          {list.length === 0 ? (
            <EmptyState
              title="No purchases yet"
              description="Your credit purchases will appear here once you purchase a credit package."
              action={{
                label: "View Credit Packages",
                href: settingsHref("credits"),
              }}
            />
          ) : (
            <>
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      <th className="px-2 pb-2 font-medium">Date</th>
                      <th className="px-2 pb-2 font-medium">Purchase</th>
                      <th className="px-2 pb-2 text-right font-medium">Credits</th>
                      <th className="px-2 pb-2 text-right font-medium">Amount</th>
                      <th className="px-2 pb-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    {...(reduce
                      ? {}
                      : {
                          variants: {
                            hidden: {},
                            visible: { transition: { staggerChildren: 0.02 } },
                          },
                          initial: "hidden" as const,
                          animate: "visible" as const,
                        })}
                  >
                    {list.map((purchase) => (
                      <motion.tr
                        key={purchase.id}
                        className="cursor-pointer border-b border-slate-50 transition-colors duration-150 last:border-0 hover:bg-slate-50"
                        onClick={() => setSelected(purchase)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelected(purchase);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`Purchase details: ${purchase.packageName}`}
                        {...(reduce
                          ? {}
                          : {
                              variants: {
                                hidden: { opacity: 0, y: 4 },
                                visible: {
                                  opacity: 1,
                                  y: 0,
                                  transition: { duration: 0.18, ease: EASE_OUT },
                                },
                              },
                            })}
                      >
                        <td className="whitespace-nowrap px-2 py-3 text-slate-500 tabular-nums">
                          {formatDate(purchase.createdAt)}
                        </td>
                        <td className="px-2 py-3 font-medium text-slate-800">
                          {purchase.packageName}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right text-slate-900 tabular-nums">
                          {formatCredits(purchase.credits)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right text-slate-900 tabular-nums">
                          {purchase.displayAmount}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <PurchaseStatusBadge status={purchase.status} />
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
              {hasMore && (
                <div className="mt-4 text-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={loadingMore}
                    onClick={() => void fetchPage(page + 1, true)}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </SettingsCard>
      </motion.section>

      {/* ---- Purchase details -------------------------------------------------- */}
      {selected && (
        <PurchaseDetailModal
          purchase={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/** Lightweight detail modal — reference data only, never payment credentials. */
function PurchaseDetailModal({
  purchase,
  onClose,
}: {
  purchase: PurchaseDto;
  onClose: () => void;
}) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Purchase", value: purchase.packageName },
    { label: "Credits", value: formatCredits(purchase.credits) },
    { label: "Amount", value: purchase.displayAmount },
    { label: "Date", value: formatDate(purchase.createdAt) },
  ];
  if (purchase.refundedAmountMinor > 0) {
    rows.push({
      label: "Refunded",
      value: `${(purchase.refundedAmountMinor / 100).toLocaleString("en-US")} ${purchase.currency}`,
    });
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Purchase details"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <dl className="space-y-2.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-slate-500">{row.label}</dt>
            <dd className="text-right font-medium text-slate-900 tabular-nums">
              {row.value}
            </dd>
          </div>
        ))}
        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-slate-500">Payment status</dt>
          <dd className="text-right">
            <PurchaseStatusBadge status={purchase.status} />
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-2.5">
          <dt className="shrink-0 text-slate-500">Reference ID</dt>
          <dd className="break-all text-right text-xs text-slate-600 tabular-nums">
            {purchase.id}
          </dd>
        </div>
      </dl>
    </Modal>
  );
}
