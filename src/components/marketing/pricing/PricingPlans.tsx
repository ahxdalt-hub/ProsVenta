"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import TransitionButton from "@/components/transitions/TransitionButton";
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
            <div
              key={plan.key}
              className={`flex flex-col rounded-2xl border bg-white p-6 shadow-xs ${
                plan.isPopular
                  ? "border-blue-200 ring-1 ring-blue-100"
                  : "border-slate-200"
              }`}
            >
              {/* Plan Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  {plan.name}
                </h2>
                {plan.label && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                    {plan.label}
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {plan.description}
              </p>

              {/* Price */}
              <div className="mt-5">
                <span className="text-4xl font-semibold tracking-tight text-slate-900">
                  {displayPrice}
                </span>
                <span className="ml-1.5 text-sm text-slate-500">
                  {displayInterval}
                </span>
              </div>

              {/* Credits */}
              <div className="mt-2">
                <span className="text-2xl font-semibold tracking-tight text-slate-700">
                  {formatCredits(plan.monthlyCredits)}
                </span>
                <span className="ml-1.5 text-sm text-slate-500">
                  credits / month
                </span>
              </div>

              {/* Features */}
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.slice(0, 6).map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    <span className="text-sm leading-relaxed text-slate-600">
                      {feature}
                    </span>
                  </li>
                ))}
                {plan.features.length > 6 && (
                  <li className="text-sm text-slate-500">
                    +{plan.features.length - 6} more features
                  </li>
                )}
              </ul>

              {/* CTA */}
              <TransitionButton
                href={plan.ctaHref}
                className={`btn-press mt-8 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  plan.isPopular
                    ? "bg-navy-900 text-white shadow-md hover:bg-navy-800"
                    : "border border-slate-300 bg-white text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {plan.ctaText}
              </TransitionButton>
            </div>
          );
        })}
      </div>
    </>
  );
}