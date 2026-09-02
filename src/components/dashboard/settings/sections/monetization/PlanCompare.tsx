"use client";

// ============================================================================
// PlanCompare — Settings › Plan & Billing comparison UI
// ============================================================================
// Actionable plan comparison derived from the central pricing config. Plan
// checkout does not exist yet, so "Upgrade" is an honest DISABLED placeholder;
// the custom Business plan links to Contact Sales. Nothing fakes a purchase.
// ============================================================================

import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { PlanDisplay } from "./plan-display";
import { annualSavingsLabel } from "./plan-display";
import { cn } from "@/lib/utils";

export type BillingIntervalChoice = "monthly" | "annual";

/** Monthly | Annual segmented toggle. */
export function IntervalToggle({
  value,
  onChange,
}: {
  value: BillingIntervalChoice;
  onChange: (v: BillingIntervalChoice) => void;
}) {
  const options: Array<{ id: BillingIntervalChoice; label: string }> = [
    { id: "monthly", label: "Monthly" },
    { id: "annual", label: "Annual" },
  ];
  return (
    <div
      role="group"
      aria-label="Billing interval"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            value === opt.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}


/** Compact, actionable plan card (not a duplicate of the pricing page). */
export function PlanCompareCard({
  plan,
  interval,
  isCurrent,
}: {
  plan: PlanDisplay;
  interval: BillingIntervalChoice;
  isCurrent: boolean;
}) {
  const showAnnual = interval === "annual" && plan.annualPriceDisplay !== null;
  const savings = showAnnual ? annualSavingsLabel(plan) : null;
  const isFree = plan.monthlyPrice === 0;

  return (
    <motion.article
      className={cn(
        "flex flex-col rounded-xl border p-5 transition-colors duration-150",
        isCurrent
          ? "border-blue-300 bg-blue-50/40"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
      data-testid="plan-card"
      data-current={isCurrent || undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">{plan.name}</h4>
        <div className="flex flex-col items-end gap-1">
          {plan.label && (
            <Badge variant={plan.isCurrentStyleHighlight ? "default" : "neutral"}>
              {plan.label}
            </Badge>
          )}
          {isCurrent && <Badge variant="success">Your plan</Badge>}
        </div>
      </div>

      <p className="mt-3 text-xl font-bold tracking-tight text-slate-900">
        {showAnnual ? plan.annualPriceDisplay : plan.monthlyPriceDisplay}
        <span className="ml-1 text-xs font-medium text-slate-500">
          {showAnnual ? "/ year" : "/ month"}
        </span>
      </p>
      {savings && (
        <p className="mt-0.5 text-[11px] font-medium text-emerald-700">{savings}</p>
      )}
      <p className="mt-1 text-[13px] text-slate-500 tabular-nums">
        {plan.monthlyCreditsDisplay}
      </p>

      <ul className="mt-4 flex-1 space-y-1.5">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-[13px] text-slate-600"
          >
            <svg
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-5">
        {isCurrent ? (
          <Button variant="secondary" size="sm" disabled className="w-full">
            Current Plan
          </Button>
        ) : plan.isCustom ? (
          <Link
            href="/contact"
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Contact Sales
          </Link>
        ) : isFree ? (
          // The Free tier is the sign-up entry point — never a plan switch.
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="w-full"
            title="The Free tier is your starting plan"
          >
            Included at sign-up
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            disabled
            className="w-full"
            title="Plan upgrades become available once subscription billing is connected"
          >
            Upgrade
          </Button>
        )}
      </div>
    </motion.article>
  );
}

/** Price of the CURRENT plan from the central pricing config (real billing). */
export function CurrentPlanPrice({
  plan,
  interval,
}: {
  plan: PlanDisplay | undefined;
  interval: "monthly" | "yearly" | null;
}) {
  if (!plan) return null;
  const useAnnual = interval === "yearly" && plan.annualPriceDisplay !== null;
  return (
    <div>
      <p className="text-2xl font-bold tracking-tight text-slate-900">
        {useAnnual ? plan.annualPriceDisplay : plan.monthlyPriceDisplay}
      </p>
      <p className="text-xs text-slate-500">{useAnnual ? "per year" : "per month"}</p>
    </div>
  );
}

