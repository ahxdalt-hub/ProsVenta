"use client";

// ============================================================================
// PlanBillingSection — Settings › Plan & Billing
// ============================================================================
// Monetization rebuild:
//   - Current plan / subscription status → GET /api/credits/summary (real
//     EntitlementService billing state; example values are NEVER shown)
//   - Available plans & pricing          → the SAME central pricing config the
//     public Pricing page uses (src/features/plans/pricing.ts), derived in
//     monetization/plan-display.ts — no duplicate pricing constants
// Actions the backend does not support yet (plan checkout, subscription
// management) are honest disabled placeholders — never faked functionality.
// ============================================================================

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SettingsCard, SettingsCardHeader, SettingsRow } from "@/components/dashboard/settings/SettingsCard";
import { StatusDotBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type { CreditSummaryDto } from "@/features/credits/api-types";
import type { BillingStatus, PlanKey } from "@/features/plans/types";
import { ALL_PLANS_FOR_DISPLAY } from "./monetization/plan-display";
import {
  CurrentPlanPrice,
  IntervalToggle,
  PlanCompareCard,
  type BillingIntervalChoice,
} from "./monetization/PlanCompare";
import { formatCredits } from "@/features/credits/ui-config";
import { ErrorState, SummarySkeleton, formatDate } from "./monetization/shared";
import { EASE_OUT } from "@/lib/motion";

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
};

const BILLING_STATUS_META: Record<
  BillingStatus,
  { label: string; variant: "success" | "default" | "warning" | "danger" | "neutral" }
> = {
  active: { label: "Active", variant: "success" },
  trialing: { label: "Trial", variant: "default" },
  past_due: { label: "Past due", variant: "danger" },
  cancelled: { label: "Canceled", variant: "neutral" },
  suspended: { label: "Suspended", variant: "warning" },
};

export function PlanBillingSection() {
  const reduce = useReducedMotion();
  const { data, loading, error, refresh } =
    useApiResource<CreditSummaryDto>("/api/credits/summary");
  const [interval, setInterval] = useState<BillingIntervalChoice>("monthly");

  const plan = data?.plan ?? null;
  const currentKey = (plan?.key ?? null) as PlanKey | null;
  const monthlyAllowance = data?.wallet?.monthlyAllowance ?? null;

  if (loading) return <SummarySkeleton />;

  const motionProps = reduce
    ? {}
    : {
        variants: SECTION_VARIANTS,
        initial: "hidden" as const,
        animate: "visible" as const,
      };

  const statusMeta = plan
    ? BILLING_STATUS_META[plan.billingStatus] ?? {
        label: plan.billingStatus,
        variant: "neutral" as const,
      }
    : null;

  return (
    <div className="space-y-6">
      {error && !data && <ErrorState message={error} onRetry={() => void refresh()} />}

      {/* ---- Current plan ---------------------------------------------------- */}
      <motion.section {...motionProps}>
        <SettingsCard>
          <SettingsCardHeader
            title="Current Plan"
            description="What you're on, what it includes, and what happens next."
          />
          {plan ? (
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="text-2xl font-bold tracking-tight text-slate-900">
                    {plan.name}
                  </h4>
                  {statusMeta && (
                    <StatusDotBadge variant={statusMeta.variant}>
                      {statusMeta.label}
                    </StatusDotBadge>
                  )}
                </div>
                <div className="mt-3 grid gap-x-10 gap-y-2 text-sm sm:grid-cols-2">
                  <p className="text-slate-600">
                    <span className="text-slate-400">Billing: </span>
                    {plan.billingInterval
                      ? plan.billingInterval === "yearly"
                        ? "Annual"
                        : "Monthly"
                      : "Not set"}
                  </p>
                  <p className="text-slate-600">
                    <span className="text-slate-400">Monthly credits: </span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {monthlyAllowance !== null
                        ? formatCredits(monthlyAllowance)
                        : "—"}
                    </span>
                  </p>
                  <p className="text-slate-600">
                    <span className="text-slate-400">Current period: </span>
                    {plan.periodStart
                      ? `${formatDate(plan.periodStart)}${plan.periodEnd ? ` – ${formatDate(plan.periodEnd)}` : ""}`
                      : "—"}
                  </p>
                  {plan.limitExceeded && (
                    <p className="font-medium text-amber-700">
                      Plan limit reached — creation is paused until compliant.
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <CurrentPlanPrice
                  plan={ALL_PLANS_FOR_DISPLAY.find((p) => p.key === currentKey)}
                  interval={plan.billingInterval}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Your organization is not on a paid plan yet. The Free tier gives
              you 100 credits a month — upgrade any time below.
            </p>
          )}

          {/* Billing actions — only honest states; checkout/management comes
              with the subscription billing phase. */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <SettingsRow
              title="Manage subscription"
              description="Plan checkout, billing-cycle changes, and cancellation become available once subscription billing is connected."
            >
              <Button
                variant="secondary"
                size="sm"
                disabled
                title="Available after subscription billing is connected"
              >
                Manage
              </Button>
            </SettingsRow>
          </div>
        </SettingsCard>
      </motion.section>

      {/* ---- Available plans -------------------------------------------------- */}
      <motion.section {...motionProps}>
        <SettingsCard>
          <SettingsCardHeader
            title="Available Plans"
            description="Same plans and pricing as the public Pricing page."
            action={<IntervalToggle value={interval} onChange={setInterval} />}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ALL_PLANS_FOR_DISPLAY.map((p) => (
              <PlanCompareCard
                key={p.key}
                plan={p}
                interval={interval}
                isCurrent={p.key === currentKey}
              />
            ))}
          </div>
        </SettingsCard>
      </motion.section>
    </div>
  );
}
