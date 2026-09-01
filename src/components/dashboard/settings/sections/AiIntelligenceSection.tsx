"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import type { IconName } from "@/components/dashboard/navigation/icons";
import { SettingsCard } from "@/components/dashboard/settings/SettingsCard";
import { CreditToken } from "@/components/dashboard/credits/CreditToken";
import { AnimatedCreditValue } from "@/components/dashboard/credits/AnimatedCreditValue";
import { Button } from "@/components/ui/Button";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type { CreditSummaryDto } from "@/features/credits/api-types";
import {
  CREDIT_OPERATION_CATALOG,
  type CreditOperationCategory,
} from "@/features/credits/operations";
import {
  formatCredits,
  CREDIT_LABEL,
} from "@/features/credits/ui-config";
import { settingsHref } from "@/lib/settings/navigation";
import { EASE_OUT } from "@/lib/motion";
import type { AiIntelligenceViewModel } from "@/lib/db/ai-settings";

// ============================================================================
// AiIntelligenceSection — Settings › AI & Intelligence
// ============================================================================
// A clean-slate configuration & explanation page. Every value shown is real:
// capability availability comes preloaded from the server view model (provider
// environment + usage records), balances come live from /api/credits/summary,
// and costs are rendered straight from CREDIT_OPERATION_CATALOG. No fake
// preferences exist because the backend has none — informational capabilities
// are presented as information, never as switches.
//
// All motion lives in this Client Component and respects reduced-motion.
// ============================================================================

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
};

const CAPABILITY_META: Record<
  keyof AiIntelligenceViewModel["capabilities"],
  { title: string; purpose: string; icon: IconName; category: CreditOperationCategory }
> = {
  enrichment: {
    title: "Enrichment",
    purpose:
      "Improves prospect and company records with additional information so you have more context before reaching out.",
    icon: "enrichment",
    category: "enrichment",
  },
  research: {
    title: "Research",
    purpose:
      "Builds deeper context around companies and prospects with grounded research briefs.",
    icon: "research",
    category: "research",
  },
  signals: {
    title: "Signals",
    purpose:
      "Detects relevant changes and buying or intent signals for the prospects you care about.",
    icon: "signals",
    category: "signals",
  },
  automation: {
    title: "Automation",
    purpose:
      "Runs supported intelligence actions automatically inside workflows you set up.",
    icon: "automation",
    category: "automation",
  },
};

function costsForCategory(category: CreditOperationCategory) {
  return Object.values(CREDIT_OPERATION_CATALOG).filter(
    (op) => op.enabled && op.category === category
  );
}

export function AiIntelligenceSection({ vm }: { vm: AiIntelligenceViewModel }) {
  const reduce = useReducedMotion();
  const { data, loading, error, refresh } =
    useApiResource<CreditSummaryDto>("/api/credits/summary");

  const balance = data?.wallet?.balance ?? null;
  const motionProps = reduce
    ? {}
    : {
        variants: SECTION_VARIANTS,
        initial: "hidden" as const,
        animate: "visible" as const,
      };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* ---- Intelligence overview ------------------------------------- */}
      <motion.section {...motionProps} aria-labelledby="ai-overview-title">
        <SettingsCard>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-slate-50 text-blue-600 ring-1 ring-blue-100/80">
                <DashboardIcon name="intelligence" className="h-6 w-6" />
              </div>
              <div>
                <h2
                  id="ai-overview-title"
                  className="text-lg font-semibold tracking-tight text-slate-900"
                >
                  Prosventa Intelligence
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
                  Prosventa uses enrichment, research, signals, and automation to help
                  you understand prospects and decide what to do next.
                </p>
              </div>
            </div>
            <HealthBadge health={vm.health} message={vm.healthMessage} />
          </div>

          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4">
            {(Object.keys(CAPABILITY_META) as Array<keyof typeof CAPABILITY_META>).map(
              (key) => (
                <li key={key} className="flex items-center gap-2 text-sm text-slate-600">
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      vm.capabilities[key].available ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  />
                  {CAPABILITY_META[key].title}
                  <span className="sr-only">
                    {vm.capabilities[key].available ? "available" : "unavailable"}
                  </span>
                </li>
              )
            )}
          </ul>
        </SettingsCard>
      </motion.section>

      {/* ---- Capabilities ----------------------------------------------- */}
      <motion.section {...motionProps} aria-labelledby="ai-capabilities-title">
        <h2
          id="ai-capabilities-title"
          className="mb-3 text-base font-semibold text-slate-900"
        >
          Intelligence capabilities
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(
            Object.keys(CAPABILITY_META) as Array<keyof typeof CAPABILITY_META>
          ).map((key) => {
            const meta = CAPABILITY_META[key];
            const cap = vm.capabilities[key];
            const costs = costsForCategory(meta.category);
            return (
              <div
                key={key}
                className="premium-card p-5 transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(15,23,42,0.07)]"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-slate-50 text-blue-600 ring-1 ring-blue-100/80">
                    <DashboardIcon name={meta.icon} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
                        {meta.title}
                      </h3>
                      <AvailabilityBadge available={cap.available} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {meta.purpose}
                    </p>
                    <p className="mt-2.5 text-[13px] font-medium leading-relaxed text-slate-600">
                      {cap.detail}
                    </p>
                    {costs.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                        {costs.map((op) => (
                          <li
                            key={op.key}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="min-w-0 truncate text-slate-500">
                              {op.displayName}
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700 tabular-nums">
                              <CreditToken size={16} />
                              {formatCredits(op.cost)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>


      {/* ---- Credits & usage -------------------------------------------- */}
      <motion.section {...motionProps} aria-labelledby="ai-credits-title">
        <h2
          id="ai-credits-title"
          className="mb-3 text-base font-semibold text-slate-900"
        >
          Intelligence &amp; Credits
        </h2>
        <SettingsCard>
          <p className="text-sm leading-relaxed text-slate-500">
            Intelligence operations use Prosventa Credits when they successfully
            complete. Failed operations are never charged.
          </p>

          {/* Balance — real, live, never fabricated while loading */}
          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sky-600">
                <CreditToken size={32} />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Available {CREDIT_LABEL}
                </p>
                {loading ? (
                  <div
                    className="mt-1 h-6 w-20 animate-pulse rounded bg-slate-200"
                    aria-busy="true"
                    aria-label="Loading credit balance"
                  />
                ) : error || balance === null ? (
                  <div role="alert" className="mt-0.5">
                    <p className="text-sm text-slate-500">
                      Unable to load your credit balance.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-1.5"
                      onClick={() => void refresh()}
                    >
                      Try again
                    </Button>
                  </div>
                ) : (
                  <p className="text-xl font-bold tracking-tight text-slate-900 tabular-nums">
                    <AnimatedCreditValue value={balance} />
                  </p>
                )}
              </div>
            </div>
            <Link
              href={settingsHref("credits")}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              View Credits &amp; Usage
            </Link>
          </div>

          {/* Activity — real counts or a useful empty state */}
          <div className="mt-5">
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
              Your intelligence activity
            </h3>
            {!vm.activityAvailable ? (
              <div role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  Unable to load your intelligence activity. Your existing data is safe.
                </p>
              </div>
            ) : vm.activity.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Your intelligence workspace is ready.
                </p>
                <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">
                  Once you run enrichment, research, or signal operations, your activity
                  and usage will appear here.
                </p>
              </div>
            ) : (
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {vm.activity.map((entry) => {
                  const op = CREDIT_OPERATION_CATALOG[entry.operationKey];
                  return (
                    <li
                      key={entry.operationKey}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3.5 py-2.5"
                    >
                      <span className="min-w-0 truncate text-sm text-slate-600">
                        {op?.displayName ?? entry.operationKey}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-slate-900 tabular-nums">
                        {entry.count} operation{entry.count === 1 ? "" : "s"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SettingsCard>
      </motion.section>

      {/* ---- Helpful explanation ---------------------------------------- */}
      <motion.section {...motionProps}>
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-5">
          <p className="text-[13px] leading-relaxed text-slate-500">
            You don&apos;t need to configure anything here for intelligence to work. When
            you enrich a prospect, run research, or detect signals from the product,
            Prosventa uses the right capability automatically and shows the Credit cost
            before anything runs.
          </p>
        </div>
      </motion.section>
    </div>
  );
}


// ----------------------------------------------------------------------------

function HealthBadge({
  health,
  message,
}: {
  health: AiIntelligenceViewModel["health"];
  message: string;
}) {
  const styles = {
    healthy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    limited: "bg-amber-50 text-amber-700 ring-amber-200",
    error: "bg-red-50 text-red-700 ring-red-200",
  }[health];
  const dot = {
    healthy: "bg-emerald-500",
    limited: "bg-amber-500",
    error: "bg-red-500",
  }[health];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${styles}`}
      title={message}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
      {health === "healthy"
        ? "Operational"
        : health === "limited"
          ? "Limited"
          : "Needs attention"}
      <span className="sr-only">— {message}</span>
    </span>
  );
}

function AvailabilityBadge({ available }: { available: boolean }) {
  return available ? (
    <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
      Available
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
      Unavailable
    </span>
  );
}

