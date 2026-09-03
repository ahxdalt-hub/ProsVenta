"use client";

import { useState } from "react";
import PlanCard from "@/components/marketing/pricing/PlanCard";
import {
  PUBLIC_PLANS,
  PLAN_DISPLAY_ORDER,
  BILLING_CONFIG,
  formatPrice,
  formatCredits,
} from "@/features/plans";

export default function PricingPlans() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");

  const toggleBilling = () => {
    setBillingInterval(billingInterval === "monthly" ? "annual" : "monthly");
  };

  return (
    <>
      {/* Billing Toggle */}
      <div className="mt-10 flex items-center justify-center gap-2">
        <span className="text-sm font-medium text-slate-600">Monthly</span>
        <button
          type="button"
          role="switch"
          aria-checked={billingInterval === "annual"}
          onClick={toggleBilling}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            billingInterval === "annual"
              ? "bg-blue-600"
              : "bg-slate-200"
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              billingInterval === "annual"
                ? "translate-x-5"
                : "translate-x-0"
            }`}
          />
        </button>
        <span className="text-sm font-medium text-slate-600">Annual</span>
        {billingInterval === "annual" && (
          <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
            {BILLING_CONFIG.annualSavings}
          </span>
        )}
      </div>

      {/* Plans Grid */}
      <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_DISPLAY_ORDER.map((planId) => {
          const plan = PUBLIC_PLANS[planId];
          const isAnnual = billingInterval === "annual";
          const displayPrice = isAnnual && plan.annualPrice !== null
            ? formatPrice(plan.annualPrice)
            : formatPrice(plan.monthlyPrice);
          const displayInterval = isAnnual && plan.annualPrice !== null
            ? "/year"
            : "/month";

          return (
            <PlanCard
              key={plan.key}
              name={plan.name}
              description={plan.description}
              price={displayPrice}
              interval={displayInterval}
              credits={formatCredits(plan.monthlyCredits)}
              label={plan.label}
              isPopular={plan.isPopular}
              features={plan.features}
              visibleCount={6}
              ctaText={plan.ctaText}
              ctaHref={plan.ctaHref}
            />
          );
        })}
      </div>
    </>
  );
}
