import { CREDIT_LABEL } from "@/features/credits/ui-config";

// ============================================================================
// Client-safe money formatting (mirrors payments/packages.ts display logic
// without importing server-only modules into the browser bundle).
// ============================================================================

export function formatMinorAmountClient(amountMinor: number, currency: string): string {
  const symbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  const symbol = symbols[currency.toUpperCase()] ?? "";
  const major = amountMinor / 100;
  return `${symbol}${major.toLocaleString("en-IN", {
    minimumFractionDigits: major % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export const CREDIT_CURRENCY_LABEL = CREDIT_LABEL;
