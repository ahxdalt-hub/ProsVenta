// ============================================================================
// Prosventa Credits — Client-Safe UI Configuration & Pure Helpers
// Stage 8 — Phase 5: Billing + Credits UX
// ============================================================================
// Single source for UI-side credit THRESHOLDS and formatting so components
// never hardcode arbitrary percentages or copy variants. The BALANCE itself is
// always backend truth — this module only classifies a confirmed value.
// ============================================================================

import { computePreflight } from "./operations";

/** The one customer-facing currency name. Never "tokens", "coins", "points". */
export const CREDIT_LABEL = "Prosventa Credits";

function envNum(key: string, fallback: number): number {
  const raw = (process.env as Record<string, string | undefined>)[key];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Balance below this fraction of the monthly allowance → "low". */
export const LOW_BALANCE_RATIO = envNum("NEXT_PUBLIC_CREDITS_LOW_RATIO", 0.2);
/** Balance below this fraction of the monthly allowance → "critical". */
export const CRITICAL_BALANCE_RATIO = envNum("NEXT_PUBLIC_CREDITS_CRITICAL_RATIO", 0.05);
/** Operations costing at/above this many credits require explicit confirmation. */
export const HIGH_COST_CONFIRMATION_THRESHOLD = envNum(
  "NEXT_PUBLIC_CREDITS_CONFIRM_THRESHOLD",
  20
);
/** Usage at/above this fraction of the allowance shows an approaching warning. */
export const USAGE_WARNING_RATIO = envNum("NEXT_PUBLIC_CREDITS_USAGE_WARN_RATIO", 0.8);

export type CreditHealth = "healthy" | "low" | "critical" | "empty";

/**
 * Classifies a CONFIRMED backend balance against the org's monthly allowance.
 * When no allowance is known, absolute fallbacks keep sensible behavior.
 */
export function getCreditHealth(params: {
  balance: number;
  monthlyAllowance?: number | null;
}): CreditHealth {
  const { balance, monthlyAllowance } = params;
  if (!Number.isFinite(balance) || balance <= 0) return "empty";
  if (typeof monthlyAllowance === "number" && monthlyAllowance > 0) {
    if (balance < monthlyAllowance * CRITICAL_BALANCE_RATIO) return "critical";
    if (balance < monthlyAllowance * LOW_BALANCE_RATIO) return "low";
    return "healthy";
  }
  // Absolute fallbacks when the plan has no finite monthly allowance.
  if (balance <= 10) return "critical";
  if (balance <= 50) return "low";
  return "healthy";
}

/** Whole-credit display with thousands separators ("5,240"). */
export function formatCredits(amount: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(amount));
}

/** Signed ledger-style amount ("+10,000" / "-50"). */
export function formatSignedCredits(amount: number): string {
  return `${amount > 0 ? "+" : amount < 0 ? "-" : ""}${formatCredits(Math.abs(amount))}`;
}

/**
 * Whether an operation cost is high enough to require explicit confirmation.
 * Configurable in ONE place — never hardcoded per component.
 */
export function requiresConfirmation(cost: number): boolean {
  return Number.isFinite(cost) && cost >= HIGH_COST_CONFIRMATION_THRESHOLD;
}

export interface BatchEstimate {
  quantity: number;
  estimatedCost: number;
  affordable: boolean;
  /** How many units can be afforded (when not all fit in balance). */
  affordableQuantity: number;
  shortfall: number;
}

/**
 * Batch estimation helper. Pure arithmetic on AUTHORITATIVE inputs (the caller
 * supplies the confirmed balance). Always presented to users as an ESTIMATE.
 */
export function estimateBatch(params: {
  unitCost: number;
  quantity: number;
  balance: number;
}): BatchEstimate {
  const preflight = computePreflight({
    unitCost: params.unitCost,
    quantity: params.quantity,
    available: params.balance,
  });
  const affordableQuantity =
    params.unitCost > 0
      ? Math.min(Math.floor(params.balance / params.unitCost), params.quantity)
      : params.quantity;
  return {
    quantity: params.quantity,
    estimatedCost: preflight.estimatedCost,
    affordable: preflight.status === "READY",
    affordableQuantity: Math.max(affordableQuantity, 0),
    shortfall: preflight.shortfall,
  };
}

/** Human label for a ledger transaction type (customer-readable, calm copy). */
export function ledgerTypeLabel(type: string): string {
  switch (type) {
    case "purchase":
    case "topup":
      return "Credit purchase";
    case "grant":
      return type === "grant" ? "Credit grant" : type;
    case "consumption":
    case "deduction":
      return "Usage";
    case "refund":
      return "Refund";
    case "adjustment":
      return "Adjustment";
    case "expiration":
      return "Credits expired";
    case "reservation":
      return "Reserved";
    case "release":
      return "Reservation released";
    default:
      return "Credit activity";
  }
}

export type PaymentStateCategory =
  | "pending"
  | "processing"
  | "confirmed"
  | "failed"
  | "cancelled";

/** Maps an authoritative purchase status onto exactly ONE presentation state. */
export function purchaseStatusCategory(status: string): PaymentStateCategory {
  switch (status) {
    case "paid":
    case "refunded":
      return "confirmed";
    case "processing":
      return "processing";
    case "failed":
      return "failed";
    case "cancelled":
    case "expired":
      return "cancelled";
    case "pending":
    default:
      return "pending";
  }
}
