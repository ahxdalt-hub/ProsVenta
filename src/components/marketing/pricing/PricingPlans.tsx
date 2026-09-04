"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import PlanCard from "@/components/marketing/pricing/PlanCard";
import {
  PUBLIC_PLANS,
  PLAN_DISPLAY_ORDER,
  BILLING_CONFIG,
  formatPrice,
  formatCredits,
} from "@/features/plans";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const slideFromRight = {
  hidden: { opacity: 0, x: 90 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};

export default function PricingPlans() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  const reduce = useReducedMotion();

  const toggleBilling = () => {
    setBillingInterval(billingInterval === "monthly" ? "annual" : "monthly");
  };

  return (
    <motion.div
      variants={container}
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "show"}
      viewport={{ once: true, amount: 0.1 }}
    >
      {/* Billing Toggle */}
      <motion.div variants={slideFromRight} className="mt-10 flex items-center justify-center gap-2">
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
      </motion.div>

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
            <motion.div key={plan.key} variants={slideFromRight} className="h-full">
              <PlanCard
                className="h-full"
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
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
