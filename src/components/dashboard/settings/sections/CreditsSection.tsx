"use client";

// ============================================================================
// CreditsSection — Settings › Credits & Usage
// ============================================================================
// Monetization rebuild on REAL backend state only:
//   - Balance / sources / usage  → GET /api/credits/summary (one authoritative
//     read composing wallet + usage + plan services)
//   - Usage history              → GET /api/credits/ledger (server-paginated)
//   - Credit packages            → GET /api/payments/packages (same central
//     catalog used by checkout — never a local pricing copy)
// Status thresholds come from the central ui-config (getCreditHealth), never
// per-component numbers. Checkout reuses the existing payment flow.
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CreditToken } from "@/components/dashboard/credits/CreditToken";
import { AnimatedCreditValue } from "@/components/dashboard/credits/AnimatedCreditValue";
import { SettingsCard, SettingsCardHeader } from "@/components/dashboard/settings/SettingsCard";
import { Button } from "@/components/ui/Button";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type {
  CreditPackageDto,
  CreditSummaryDto,
  LedgerPageDto,
} from "@/features/credits/api-types";
import {
  formatCredits,
  formatSignedCredits,
  getCreditHealth,
  type CreditHealth,
} from "@/features/credits/ui-config";
import { settingsHref } from "@/lib/settings/navigation";
import { EASE_OUT } from "@/lib/motion";
import { GetMoreCreditsCard } from "./monetization/GetMoreCreditsCard";
import {
  ErrorState,
  LedgerTypeBadge,
  SummarySkeleton,
  StatTile,
  TableSkeleton,
  formatDate,
  formatMonthKey,
  packageUnitValue,
  usePackageCheckout,
} from "./monetization/shared";

const LEDGER_PAGE_SIZE = 15;

const HEALTH_META: Record<
  CreditHealth,
  { label: string; className: string; dot: string }
> = {
  healthy: {
    label: "Healthy",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  low: {
    label: "Running Low",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  critical: {
    label: "Almost Empty",
    className: "bg-orange-50 text-orange-700 ring-orange-200",
    dot: "bg-orange-500",
  },
  empty: {
    label: "No Credits",
    className: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
  },
};

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
};

export function CreditsSection() {
  const reduce = useReducedMotion();
  const summary = useApiResource<CreditSummaryDto>("/api/credits/summary");
  const packages = useApiResource<CreditPackageDto[]>("/api/payments/packages");
  const checkout = usePackageCheckout();

  // ---- Ledger (server-paginated usage history) -----------------------------
  const [ledger, setLedger] = useState<LedgerPageDto | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLedger = useCallback(
    async (page: number, appending: boolean) => {
      if (appending) setLoadingMore(true);
      try {
        const res = await fetch(
          `/api/credits/ledger?page=${page}&pageSize=${LEDGER_PAGE_SIZE}`,
          { credentials: "same-origin" }
        );
        const body = (await res.json()) as LedgerPageDto & { error?: string };
        if (!res.ok) {
          throw new Error(body.error ?? "Unable to load your credit activity.");
        }
        setLedger((prev) =>
          appending && prev
            ? { ...body, entries: [...prev.entries, ...body.entries] }
            : body
        );
        setLedgerError(null);
      } catch (err) {
        setLedgerError(
          err instanceof Error ? err.message : "Unable to load your credit activity."
        );
      } finally {
        setLedgerLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchLedger(1, false);
  }, [fetchLedger]);

  // ---- Derived (all from confirmed backend values) --------------------------
  const wallet = summary.data?.wallet ?? null;
  const usage = summary.data?.usage ?? null;
  const balance = wallet ? wallet.balance : null;
  const monthlyAllowance = wallet?.monthlyAllowance ?? null;
  const health = getCreditHealth({ balance: balance ?? 0, monthlyAllowance });
  const healthMeta = HEALTH_META[health];
  const lowOrEmpty = health === "low" || health === "critical" || health === "empty";

  const used = usage ? usage.usedCredits : null;
  const usagePct =
    used !== null && monthlyAllowance && monthlyAllowance > 0
      ? Math.min(100, Math.max(0, (used / monthlyAllowance) * 100))
      : null;

  const pkgList = packages.data ?? [];
  // Best effective value is derived from the live catalog, not invented copy.
  const bestUnitValue = pkgList.reduce<number | null>((best, pkg) => {
    const v = packageUnitValue(pkg);
    return v !== null && (best === null || v > best) ? v : best;
  }, null);

  if (summary.loading) {
    return (
      <div className="space-y-6">
        <SummarySkeleton />
        <SummarySkeleton />
      </div>
    );
  }

  const motionProps = reduce
    ? {}
    : {
        variants: SECTION_VARIANTS,
        initial: "hidden" as const,
        animate: "visible" as const,
      };

  const packagesCard = (
    <GetMoreCreditsCard
      packages={pkgList}
      packagesState={{
        loading: packages.loading,
        error: packages.error,
        refresh: packages.refresh,
      }}
      bestUnitValue={bestUnitValue}
      checkout={checkout}
      prioritize={lowOrEmpty}
    />
  );

  return (
    <div className="space-y-6">
      {summary.error && !summary.data && (
        <ErrorState message={summary.error} onRetry={() => void summary.refresh()} />
      )}

      {/* ---- Balance summary + progress ------------------------------------ */}
      <motion.section {...motionProps}>
        <SettingsCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Available Credits
              </p>
              <div className="mt-1 flex items-center gap-2.5">
                {balance === null ? (
                  <span className="text-[32px] font-bold leading-tight tracking-tight text-slate-400">
                    —
                  </span>
                ) : (
                  <span
                    aria-live="polite"
                    className={`text-[32px] font-bold leading-tight tracking-tight ${
                      health === "critical" || health === "empty"
                        ? "text-amber-600"
                        : "text-slate-900"
                    }`}
                  >
                    <AnimatedCreditValue value={balance} />
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 self-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${healthMeta.className}`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${healthMeta.dot}`}
                  />
                  {healthMeta.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {monthlyAllowance !== null && monthlyAllowance > 0
                  ? `of ${formatCredits(monthlyAllowance)} monthly credits`
                  : "Your monthly allocation appears here once your plan is connected."}
              </p>
            </div>
            <span
              className="hidden items-center gap-1.5 text-sky-600 sm:flex"
              aria-hidden="true"
            >
              <CreditToken size={32} />
            </span>
          </div>

          {/* Progress bar — animates subtly on load, reduced-motion aware */}
          <div className="mt-5">
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={usagePct !== null ? Math.round(usagePct) : undefined}
              aria-label="Monthly credit usage"
            >
              <motion.div
                className={`h-full rounded-full ${
                  health === "empty"
                    ? "bg-red-400"
                    : health === "critical" || health === "low"
                      ? "bg-amber-400"
                      : "bg-navy-900"
                }`}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${usagePct ?? 0}%` }}
                transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT }}
              />
            </div>
            <p className="mt-2 text-[13px] text-slate-500 tabular-nums">
              {used !== null && balance !== null
                ? `${formatCredits(used)} used · ${formatCredits(balance)} remaining`
                : balance !== null
                  ? `${formatCredits(balance)} remaining`
                  : "Usage appears here once credits are active."}
            </p>
          </div>

          {/* Zero-credit warning — clean, honest, no fake countdowns */}
          {health === "empty" && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5"
            >
              <p className="text-sm font-semibold text-amber-900">
                You&apos;re out of monthly credits
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-amber-800">
                Credit-consuming operations are unavailable until your next
                monthly allocation — or until you purchase additional credits
                below. Everything that doesn&apos;t use credits keeps working.
              </p>
            </div>
          )}
        </SettingsCard>
      </motion.section>

      {/* ---- Top-ups first when balance is low ------------------------------ */}
      {lowOrEmpty && packagesCard}

      {/* ---- Credit sources -------------------------------------------------- */}
      {wallet && (
        <motion.section {...motionProps}>
          <SettingsCard>
            <SettingsCardHeader
              title="Credit Sources"
              description="Where your available credits come from."
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile
                label="Monthly Credits"
                value={formatCredits(wallet.monthlyAllowance)}
                hint="Included with your subscription"
              />
              <StatTile
                label="Purchased Credits"
                value={formatCredits(wallet.lifetimePurchased)}
                hint="From credit top-ups"
              />
              <StatTile
                label="Total Available"
                value={formatCredits(wallet.balance)}
                hint={
                  wallet.reserved > 0
                    ? `${formatCredits(wallet.reserved)} reserved for running operations`
                    : "Usable right now"
                }
              />
            </div>
          </SettingsCard>
        </motion.section>
      )}

      {/* ---- Usage this period ---------------------------------------------- */}
      <motion.section {...motionProps}>
        <SettingsCard>
          <SettingsCardHeader
            title="Usage This Period"
            description={
              usage
                ? `Billing period: ${formatMonthKey(usage.monthKey)}`
                : undefined
            }
          />
          {usage ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Credits Used" value={formatCredits(usage.usedCredits)} />
                <StatTile
                  label="Credits Remaining"
                  value={balance !== null ? formatCredits(balance) : "—"}
                />
                <StatTile
                  label="Usage"
                  value={usagePct !== null ? `${Math.round(usagePct)}%` : "—"}
                  hint="of monthly credits"
                />
                <StatTile
                  label="Operations"
                  value={formatCredits(usage.operationCount)}
                  hint="Credit-consuming operations"
                />
              </div>
              {usage.byCategory.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {usage.byCategory.map((entry) => {
                    const pct =
                      usage.usedCredits > 0
                        ? (entry.credits / usage.usedCredits) * 100
                        : 0;
                    return (
                      <li key={entry.category} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 truncate text-[13px] capitalize text-slate-600">
                          {entry.category}
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <motion.span
                            className="block h-full rounded-full bg-slate-400"
                            initial={reduce ? false : { width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: reduce ? 0 : 0.5, ease: EASE_OUT }}
                          />
                        </span>
                        <span className="w-16 shrink-0 text-right text-[13px] font-medium text-slate-900 tabular-nums">
                          {formatCredits(entry.credits)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">
              No usage recorded yet for the current billing period.
            </p>
          )}
        </SettingsCard>
      </motion.section>

      {/* ---- Usage history --------------------------------------------------- */}
      <motion.section {...motionProps}>
        <SettingsCard>
          <SettingsCardHeader
            title="Usage History"
            description="Your credit activity, most recent first."
          />
          {ledgerLoading ? (
            <TableSkeleton rows={5} />
          ) : ledgerError && !ledger ? (
            <ErrorState
              message={ledgerError}
              onRetry={() => void fetchLedger(1, false)}
            />
          ) : !ledger || ledger.entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No credit activity yet. Once you run enrichment, research, or other
              credit-consuming operations, they will appear here.
            </p>
          ) : (
            <>
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      <th className="px-2 pb-2 font-medium">Date</th>
                      <th className="px-2 pb-2 font-medium">Operation</th>
                      <th className="px-2 pb-2 text-right font-medium">Credits</th>
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
                    {ledger.entries.map((entry) => (
                      <motion.tr
                        key={entry.id}
                        className="border-b border-slate-50 last:border-0"
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
                        <td className="whitespace-nowrap px-2 py-2.5 text-slate-500 tabular-nums">
                          {formatDate(entry.createdAt)}
                        </td>
                        <td className="max-w-[260px] px-2 py-2.5 text-slate-800">
                          <span className="line-clamp-1">
                            {entry.description || "Credit activity"}
                          </span>
                        </td>
                        <td
                          className={`whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums ${
                            entry.amount < 0 ? "text-slate-900" : "text-emerald-700"
                          }`}
                        >
                          {formatSignedCredits(entry.amount)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <LedgerTypeBadge type={entry.type} />
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
              {ledger.hasMore && (
                <div className="mt-4 text-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={loadingMore}
                    onClick={() => void fetchLedger(ledger.page + 1, true)}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </SettingsCard>
      </motion.section>

      {/* ---- Top-ups last when balance is fine ------------------------------ */}
      {!lowOrEmpty && packagesCard}

      {/* ---- Cross-link to Plan & Billing (no duplicated content) ------------ */}
      <p className="text-center text-[13px] text-slate-400">
        Looking for your plan or subscription?{" "}
        <Link
          href={settingsHref("plan-billing")}
          className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          Manage it in Plan &amp; Billing
        </Link>
      </p>
    </div>
  );
}
