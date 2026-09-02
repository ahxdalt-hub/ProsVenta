import Link from "next/link";
import { Check } from "lucide-react";
import TransitionButton from "@/components/transitions/TransitionButton";
import TransitionLink from "@/components/transitions/TransitionLink";
import PricingPlans from "@/components/marketing/pricing/PricingPlans";
import { MARKETING_ROUTES } from "@/components/marketing/routes";
import {
  BUSINESS_PLAN,
  CREDIT_DESCRIPTION,
} from "@/features/plans";

// ============================================================================
// Pricing — Phase 1: Public Pricing Page Update
// Updated to reflect the new launch pricing model:
// FREE: $0/month, 100 credits/month
// STARTER: $19/month, 1,500 credits/month
// GROWTH: $49/month, 5,000 credits/month (MOST POPULAR)
// PRO: $99/month, 15,000 credits/month (BEST FOR HIGH VOLUME)
// BUSINESS: $249+/month, 40,000+ credits/month (Contact Sales)
// ============================================================================

// Credit costs for the "What credits are used for" section
type CreditCostItem = {
  action: string;
  cost: number;
};

const CREDIT_COSTS: CreditCostItem[] = [
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
    a: "Prosventa offers a tiered pricing model with monthly credit allowances. Each plan includes a specific number of credits per month that can be used for enrichment, research, verification, signals, and intelligence operations. Unused credits do not roll over to the next month.",
  },
  {
    q: "What is included in the Free plan?",
    a: "The Free plan includes basic prospect search and discovery, saved lists, CSV import and export, and workspace organization. Intelligence features require upgrading to a paid plan.",
  },
  {
    q: "How do I get more credits?",
    a: "Each paid plan includes a generous monthly credit allowance. Additional credit packages will be available for purchase in a future phase. Credits are granted only after payment is confirmed.",
  },
  {
    q: "What happens when a credit action fails?",
    a: "If an enrichment or research action fails, nothing is consumed — the credit reservation is released. You are only charged for work that actually completes.",
  },
  {
    q: "Can I use Prosventa with my team?",
    a: "Team collaboration features are available on the Growth plan and above. Prosventa uses role-based access control so members only see what they should.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. Data is encrypted in transit and at rest, each organization's data is isolated with strict row-level security, and access is governed by role-based permissions. Read more on our Security page.",
  },
];

export const metadata = {
  title: "Pricing — Prosventa",
  description:
    "Simple, transparent pricing for Prosventa. Start free with 100 credits, upgrade for more capacity and intelligence features.",
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
            Simple, <span className="text-gradient">transparent pricing.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            Start free with 100 credits. Upgrade for more capacity and intelligence features.
          </p>
        </div>

        {/* Billing Toggle + Plans Grid (client component) */}
        <PricingPlans />

        {/* Business Plan (Custom) */}
        <div className="mt-8 flex justify-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {BUSINESS_PLAN.name}
              </h2>
            </div>
            
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {BUSINESS_PLAN.description}
            </p>

            {/* Price */}
            <div className="mt-5">
              <span className="text-4xl font-semibold tracking-tight text-slate-900">
                {BUSINESS_PLAN.monthlyPrice}
              </span>
              <span className="ml-1.5 text-sm text-slate-500">/month</span>
            </div>

            {/* Credits */}
            <div className="mt-2">
              <span className="text-2xl font-semibold tracking-tight text-slate-700">
                {BUSINESS_PLAN.monthlyCredits}
              </span>
              <span className="ml-1.5 text-sm text-slate-500">
                credits / month
              </span>
            </div>

            {/* Features */}
            <ul className="mt-6 flex-1 space-y-2.5">
              {BUSINESS_PLAN.features.slice(0, 4).map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-slate-600">
                    {feature}
                  </span>
                </li>
              ))}
              {BUSINESS_PLAN.features.length > 4 && (
                <li className="text-sm text-slate-500">
                  +{BUSINESS_PLAN.features.length - 4} more features
                </li>
              )}
            </ul>

            {/* CTA */}
            <TransitionButton
              href={BUSINESS_PLAN.ctaHref}
              className="btn-press mt-8 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {BUSINESS_PLAN.ctaText}
            </TransitionButton>
          </div>
        </div>

        {/* Credit Information */}
        <div className="mt-20 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            What are credits?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {CREDIT_DESCRIPTION}
          </p>
          
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                What credits are used for
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Per-action credit costs:
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
