import PlanCard from "@/components/marketing/pricing/PlanCard";
import PricingPlans from "@/components/marketing/pricing/PricingPlans";
import CreditInfo from "@/components/marketing/pricing/CreditInfo";
import FinalCta from "@/components/marketing/pricing/FinalCta";
import Faq from "@/components/marketing/pricing/Faq";
import {
  BUSINESS_PLAN,
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
        {/* ============================================================
            [EDIT ME MANUALLY] Business card width (Contact Sales card)
            - Container max width: max-w-3xl  => 768px  (current)
              Options: max-w-md = 448px | max-w-lg = 512px |
                       max-w-xl = 576px | max-w-2xl = 672px |
                       max-w-3xl = 768px | max-w-4xl = 896px
            - Inner card min height: min-h-[480px] (optional, remove if unwanted)
            Data (price, credits, features, CTA) is edited in:
              src/features/plans/pricing.ts  ->  BUSINESS_PLAN
            ============================================================ */}
        <div className="mt-8 flex w-full max-w-3xl justify-center self-center mx-auto">
          <PlanCard
            className="w-full min-h-[480px]"
            name={BUSINESS_PLAN.name}
            description={BUSINESS_PLAN.description}
            price={BUSINESS_PLAN.monthlyPrice}
            interval="/month"
            credits={BUSINESS_PLAN.monthlyCredits}
            features={BUSINESS_PLAN.features}
            visibleCount={4}
            ctaText={BUSINESS_PLAN.ctaText}
            ctaHref={BUSINESS_PLAN.ctaHref}
          />
        </div>

        {/* Credit Information — interactive dark "How credits work" card */}
        {/* [EDIT ME MANUALLY] Credit info section:
            - Costs data: CREDIT_COSTS array at the top of this file
            - Icons + descriptions per action: ACTION_META in
              src/components/marketing/pricing/CreditInfo.tsx
            - Card is full page-container width; to narrow it, wrap it in a
              max-w-* div with mx-auto */}
        <CreditInfo costs={CREDIT_COSTS} />

        {/* FAQ */}
        <div className="mx-auto mt-24 max-w-3xl">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              FAQ
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Frequently asked <span className="text-gradient">questions</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              Everything you need to know about plans, credits, and how
              Prosventa works.
            </p>
          </div>
          <div className="mt-10">
            <Faq faqs={FAQS} />
          </div>
        </div>

        {/* Final CTA — interactive light-blue card (cursor spotlight, scroll-in
            animations, animated buttons). Edit in:
            src/components/marketing/pricing/FinalCta.tsx */}
        <FinalCta />
      </div>
    </div>
  );
}
