// ============================================================================
// Plan display — derived view of the CENTRAL pricing configuration
// ============================================================================
// NOT a second pricing system: every value here is derived from
// src/features/plans/pricing.ts (PUBLIC_PLANS + BUSINESS_PLAN), the exact
// source the public Pricing page renders. This module only shapes that data
// for the authenticated Settings comparison UI.
// ============================================================================

import type { PlanKey } from "@/features/plans/types";
import {
  PUBLIC_PLANS,
  BUSINESS_PLAN,
  formatPrice,
  formatCredits,
} from "@/features/plans/pricing";

export interface PlanDisplay {
  key: PlanKey | "business-custom";
  name: string;
  description: string;
  /** Monthly display price, e.g. "$49" or "$249+". */
  monthlyPriceDisplay: string;
  /** Annual display price (null when annual billing isn't offered). */
  annualPriceDisplay: string | null;
  /** Raw annual number for savings computation (null when not offered). */
  annualPrice: number | null;
  monthlyPrice: number | null;
  monthlyCreditsDisplay: string;
  label: string | null;
  isCurrentStyleHighlight: boolean;
  isCustom: boolean;
  features: string[];
}

function fromPublicPlan(key: PlanKey): PlanDisplay {
  const p = PUBLIC_PLANS[key];
  return {
    key,
    name: p.name,
    description: p.description,
    monthlyPriceDisplay: formatPrice(p.monthlyPrice),
    annualPriceDisplay: p.annualPrice !== null ? formatPrice(p.annualPrice) : null,
    annualPrice: p.annualPrice,
    monthlyPrice: typeof p.monthlyPrice === "number" ? p.monthlyPrice : null,
    monthlyCreditsDisplay: `${formatCredits(p.monthlyCredits)} credits / month`,
    label: p.label,
    isCurrentStyleHighlight: p.isPopular,
    isCustom: false,
    features: p.features,
  };
}

const FREE = fromPublicPlan("free");
const STARTER = fromPublicPlan("pro");
const GROWTH = fromPublicPlan("business");
const PRO = fromPublicPlan("enterprise");

const BUSINESS: PlanDisplay = {
  key: "business-custom",
  name: BUSINESS_PLAN.name,
  description: BUSINESS_PLAN.description,
  monthlyPriceDisplay: BUSINESS_PLAN.monthlyPrice,
  annualPriceDisplay: null, // custom plan — annual pricing is not offered
  annualPrice: null,
  monthlyPrice: null,
  monthlyCreditsDisplay: `${BUSINESS_PLAN.monthlyCredits} credits / month`,
  label: BUSINESS_PLAN.label,
  isCurrentStyleHighlight: false,
  isCustom: true,
  features: BUSINESS_PLAN.features,
};

/** Display order for the Settings comparison grid. */
export const ALL_PLANS_FOR_DISPLAY: PlanDisplay[] = [
  FREE,
  STARTER,
  GROWTH,
  PRO,
  BUSINESS,
];

/** "~17% savings (2 months free)" for a plan with annual billing. */
export function annualSavingsLabel(plan: PlanDisplay): string | null {
  if (
    plan.annualPrice === null ||
    plan.monthlyPrice === null ||
    plan.monthlyPrice <= 0
  ) {
    return null;
  }
  const savingsPct = Math.round(
    (1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100
  );
  if (savingsPct <= 0) return null;
  return `${savingsPct}% savings (2 months free)`;
}
