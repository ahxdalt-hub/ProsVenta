import Link from "next/link";
import { Check } from "lucide-react";
import TransitionButton from "@/components/transitions/TransitionButton";
import TransitionLink from "@/components/transitions/TransitionLink";
import { PLANS } from "@/features/entitlement/features";
import type { SubscriptionPlan } from "@/types/database";
import { MARKETING_ROUTES } from "@/components/marketing/routes";

// ============================================================================
// Pricing — Phase 7.
// EVERYTHING on this page mirrors the ACTUAL configured model:
//   - Plans + credits: PLANS in src/features/entitlement/features.ts
//   - Feature credit costs: FEATURES in the same file
//   - Credit packages: active rows in public.credit_packages
//     (supabase/migrations/20260824000014_create_payments.sql)
// No monthly plan prices are displayed because none exist in the application.
// Prosventa is credit-based: plans unlock capabilities, credits power
// enrichment / research / scoring actions.
// ============================================================================

const PLAN_ORDER: SubscriptionPlan[] = ["free", "pro", "business", "enterprise"];

const PLAN_HIGHLIGHT: Record<SubscriptionPlan, string> = {
  free: "Start free",
  pro: "Most popular",
  business: "For teams",
  enterprise: "Custom",
};

/** Active credit packages — mirrors the seeded credit_packages catalog. */
const CREDIT_PACKAGES = [
  {
    key: "starter_credits",
    name: "Starter Credits",
    credits: 5000,
    price: "₹999",
    description: "A quick top-up to power enrichment and research.",
  },
  {
    key: "growth_credits",
    name: "Growth Credits",
    credits: 25000,
    price: "₹3,999",
    description: "For sustained prospecting across an active pipeline.",
  },
  {
    key: "scale_credits",
    name: "Scale Credits",
    credits: 100000,
    price: "₹12,999",
    description: "Bulk capacity for high-volume outbound motions.",
  },
];

/** Real per-action credit costs from the in-app feature catalog. */
const CREDIT_COSTS = [
  { action: "Prospect enrichment", cost: 1 },
  { action: "Company enrichment", cost: 2 },
  { action: "Intent signals", cost: 2 },
  { action: "Prospect research", cost: 3 },
  { action: "Company research", cost: 4 },
  { action: "ICP scoring / AI recommendations", cost: 1 },
];

const FAQS = [
  {
    q: "How does Prosventa's pricing work?",
    a: "Prosventa is credit-based. Plans unlock capabilities and include a monthly credit allowance, and credits are consumed by billable actions such as enrichment, research, intent signals, and ICP scoring. Free actions like prospect search, saved lists, import, and export cost no credits.",
  },
  {
    q: "What is included in the free Starter plan?",
    a: "The Starter plan includes prospect search and discovery, saved lists, CSV import, and export — everything you need to find and organize prospects. Intelligence features (enrichment, research, scoring, signals, recommendations) require the Pro plan.",
  },
  {
    q: "How do I get more credits?",
    a: "Paid plans include a monthly credit allowance (Pro 100, Business 500, Enterprise 2,000), and you can top up at any time with a one-time credit package — Starter (5,000), Growth (25,000), or Scale (100,000). Credits are granted only after payment is confirmed.",
  },
  {
    q: "What happens when a credit action fails?",
    a: "If an enrichment or research action fails, nothing is consumed — the credit reservation is released. You are only charged for work that actually completes.",
  },
  {
    q: "Can I use Prosventa with my team?",
    a: "Yes. Team collaboration, multi-step workflows, and advanced analytics are available on the Business plan and above. Prosventa uses role-based access control so members only see what they should.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. Data is encrypted in transit and at rest, each organization's data is isolated with strict row-level security, and access is governed by role-based permissions. Read more on our Security page.",
  },
];

export const metadata = {
  title: "Pricing — Prosventa",
  description:
    "Simple, credit-based pricing for Prosventa. Start free, upgrade for intelligence features, and top up credits when you need more.",
};

export default function PricingPage() {
  return (
    <div className="bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 pt-32 pb-24 sm:px-6 lg:px-8 lg:pt-36">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Pricing
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[56px] lg:leading-[1.1]">
            Pay for <span className="text-gradient">useful intelligence.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            Start free with search and organization. Upgrade when you want
            enrichment, scoring, and signals — and top up credits only when you
            need them.
          </p>
        </div>

        {/* Plans */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl border bg-white p-6 shadow-xs ${
                  planId === "pro"
                    ? "border-blue-200 ring-1 ring-blue-100"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    {plan.name}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      planId === "pro"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {PLAN_HIGHLIGHT[planId]}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {plan.description}
                </p>

                <div className="mt-5">
                  <span className="text-3xl font-semibold tracking-tight text-slate-900">
                    {plan.monthlyCredits.toLocaleString()}
                  </span>
                  <span className="ml-1.5 text-sm text-slate-500">
                    credits / month
                  </span>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((featureId) => (
                    <li key={featureId} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                      <span className="text-sm leading-relaxed text-slate-600">
                        {featureId.replace(/_/g, " ")}
                      </span>
                    </li>
                  ))}
                </ul>

                <TransitionButton
                  href={MARKETING_ROUTES.GET_STARTED}
                  className={`btn-press mt-8 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                    planId === "pro"
                      ? "bg-navy-900 text-white shadow-md hover:bg-navy-800"
                      : "border border-slate-300 bg-white text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  Get Started
                </TransitionButton>
              </div>
            );
          })}
        </div>

        {/* Credit packages + real costs */}
        <div className="mt-20 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              Credit packages
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              One-time top-ups available to any workspace. Credits are only
              consumed by completed actions.
            </p>
            <div className="mt-6 space-y-3">
              {CREDIT_PACKAGES.map((pkg) => (
                <div
                  key={pkg.key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5"
                >
                  <div>
                    <span className="text-sm font-semibold text-slate-900">
                      {pkg.name}
                    </span>
                    <span className="ml-2 text-sm text-slate-500">
                      {pkg.credits.toLocaleString()} credits
                    </span>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {pkg.description}
                    </p>
                  </div>
                  <span className="text-lg font-semibold tracking-tight text-slate-900">
                    {pkg.price}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              What credits are used for
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Per-action credit costs in the product today:
            </p>
            <ul className="mt-6 space-y-3">
              {CREDIT_COSTS.map((item) => (
                <li
                  key={item.action}
                  className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-slate-600">{item.action}</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {item.cost} credit{item.cost > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-24 max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-xs"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-24 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-xs sm:px-12">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Start finding better prospects.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
            Create a free workspace — search, organize, and export prospects
            today. Add intelligence when you are ready.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <TransitionButton
              href={MARKETING_ROUTES.GET_STARTED}
              className="btn-press inline-flex items-center justify-center rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              Get Started
            </TransitionButton>
            <TransitionLink
              href={MARKETING_ROUTES.EXPLORE}
              className="btn-press inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              Explore Prosventa
            </TransitionLink>
          </div>
          <p className="mt-6 text-xs text-slate-400">
            By using Prosventa you agree to our{" "}
            <Link href="/terms" className="text-slate-500 underline decoration-slate-300 hover:text-slate-700">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-slate-500 underline decoration-slate-300 hover:text-slate-700">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
