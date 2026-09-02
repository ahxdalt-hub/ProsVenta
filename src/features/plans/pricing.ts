// ============================================================================
// Prosventa Public Pricing Configuration
// Phase 1: Public Pricing Page Update
// ============================================================================
// Single source of truth for public pricing display.
// This file contains the new launch pricing model for the public pricing page.
// ============================================================================

import type { SubscriptionPlan } from "@/types/database";

// ============================================================================
// Public Plan Configuration
// ============================================================================
// The plan keys map to the existing SubscriptionPlan types, but present the
// new launch pricing tier names and values on the public pricing page.

export interface PublicPlan {
  key: SubscriptionPlan;
  name: string;
  description: string;
  monthlyPrice: number | string;
  annualPrice: number | null;
  monthlyCredits: number | string;
  label: string | null;
  isPopular: boolean;
  isCustom: boolean;
  features: string[];
  ctaText: string;
  ctaHref: string;
}

export const PUBLIC_PLANS: Record<SubscriptionPlan, PublicPlan> = {
  free: {
    key: "free",
    name: "Free",
    description: "Get started with basic prospect discovery and organization",
    monthlyPrice: 0,
    annualPrice: null,
    monthlyCredits: 100,
    label: null,
    isPopular: false,
    isCustom: false,
    features: [
      "Prospect search and discovery",
      "Saved lists",
      "CSV import and export",
      "Basic workspace organization",
    ],
    ctaText: "Get Started Free",
    ctaHref: "/signup",
  },
  pro: {
    key: "pro",
    name: "Starter",
    description: "For solo users and light prospecting",
    monthlyPrice: 19,
    annualPrice: 190,
    monthlyCredits: 1500,
    label: null,
    isPopular: false,
    isCustom: false,
    features: [
      "Everything in Free",
      "Company enrichment",
      "Prospect enrichment",
      "Company research",
      "Prospect research",
      "ICP scoring",
      "Intent signals",
      "AI recommendations",
      "Basic automation",
    ],
    ctaText: "Get Started",
    ctaHref: "/signup",
  },
  business: {
    key: "business",
    name: "Growth",
    description: "For growing teams that need serious pipeline",
    monthlyPrice: 49,
    annualPrice: 490,
    monthlyCredits: 5000,
    label: "MOST POPULAR",
    isPopular: true,
    isCustom: false,
    features: [
      "Everything in Starter",
      "Team collaboration",
      "Advanced automation",
      "Advanced analytics",
      "Workflow builder",
      "Priority support",
    ],
    ctaText: "Get Started",
    ctaHref: "/signup",
  },
  enterprise: {
    key: "enterprise",
    name: "Pro",
    description: "For organizations scaling outbound motion",
    monthlyPrice: 99,
    annualPrice: 990,
    monthlyCredits: 15000,
    label: "BEST FOR HIGH VOLUME",
    isPopular: false,
    isCustom: false,
    features: [
      "Everything in Growth",
      "Advanced team features",
      "Custom integrations",
      "Dedicated onboarding",
      "Enhanced security",
    ],
    ctaText: "Get Started",
    ctaHref: "/signup",
  },
};
// ============================================================================
// Business Plan (Custom / Contact Sales)
// ============================================================================

export interface CustomPlan {
  name: string;
  description: string;
  monthlyPrice: string;
  monthlyCredits: string;
  label: string | null;
  features: string[];
  ctaText: string;
  ctaHref: string;
}

export const BUSINESS_PLAN: CustomPlan = {
  name: "Business",
  description: "For large organizations with custom needs",
  monthlyPrice: "$249+",
  monthlyCredits: "40,000+",
  label: null,
  features: [
    "Everything in Pro",
    "Custom credit packages",
    "Dedicated account manager",
    "Custom SLA and support",
    "API access",
    "Custom integrations",
    "Advanced security features",
  ],
  ctaText: "Contact Sales",
  ctaHref: "/contact",
};

// ============================================================================
// Plan Display Order for Pricing Page
// ============================================================================

export const PLAN_DISPLAY_ORDER: SubscriptionPlan[] = ["free", "pro", "business", "enterprise"];

// ============================================================================
// Billing Configuration
// ============================================================================

export interface BillingConfig {
  monthly: {
    starter: number;
    growth: number;
    pro: number;
  };
  annual: {
    starter: number;
    growth: number;
    pro: number;
  };
  annualSavings: string;
}

export const BILLING_CONFIG: BillingConfig = {
  monthly: {
    starter: 19,
    growth: 49,
    pro: 99,
  },
  annual: {
    starter: 190,
    growth: 490,
    pro: 990,
  },
  annualSavings: "~17% savings (2 months free)",
};

// ============================================================================
// Credit Messaging
// ============================================================================

export const CREDIT_DESCRIPTION =
  "Credits are used for variable-cost enrichment, research, verification, signals, and intelligence operations.";

// ============================================================================
// Helper Functions
// ============================================================================

export function getPlanByKey(key: SubscriptionPlan): PublicPlan {
  return PUBLIC_PLANS[key];
}

export function getAllPublicPlans(): PublicPlan[] {
  return PLAN_DISPLAY_ORDER.map(getPlanByKey);
}

export function formatPrice(price: number | string): string {
  if (typeof price === "string") return price;
  if (price === 0) return "$0";
  return `$${price}`;
}

export function formatCredits(credits: number | string): string {
  if (typeof credits === "string") return credits;
  return new Intl.NumberFormat().format(credits);
}

export function getAnnualSavings(monthlyPrice: number, annualPrice: number): string {
  const monthlyEquivalent = annualPrice / 12;
  const savings = monthlyPrice - monthlyEquivalent;
  const savingsPercentage = ((savings / monthlyPrice) * 100).toFixed(0);
  return `${savingsPercentage}% savings (${Math.round((savings / monthlyPrice) * 12)} months free)`;
}