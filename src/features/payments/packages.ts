// ============================================================================
// Prosventa Payments — Credit Package Catalog Service
// Stage 8 — Phase 4: Payment + Credit Purchase System
// ============================================================================
// Server-authoritative catalog reads. The client may DISPLAY packages, but
// the server ALWAYS re-resolves the authoritative package (credits, price,
// currency, status) from this catalog at checkout time. Client-supplied
// prices/credit amounts are never accepted (price-tampering protection).
// ============================================================================

import "server-only";

import { createClient } from "@/lib/supabase/server";
import { PaymentError } from "./errors";
import type { CreditPackageRow } from "./types";

/** Pure helper: human display of a minor-unit amount (UI only). */
export function formatMinorAmount(amountMinor: number, currency: string): string {
  const symbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  const symbol = symbols[currency.toUpperCase()] ?? "";
  const major = amountMinor / 100;
  return `${symbol}${major.toLocaleString("en-IN", {
    minimumFractionDigits: major % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Active packages for display (ordered). Inactive/deprecated packages are
 * never offered to new checkouts; historical purchases keep their snapshot.
 */
export async function listActivePackages(): Promise<CreditPackageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_packages")
    .select("*")
    .eq("status", "active")
    .order("display_order", { ascending: true });
  if (error) throw new PaymentError("PAYMENT_SERVICE_ERROR", { cause: error });
  return (data ?? []) as unknown as CreditPackageRow[];
}

/**
 * Authoritative package resolution by stable key. Only ACTIVE packages can
 * start a checkout (deactivation blocks new purchases without deleting
 * history).
 */
export async function resolveActivePackage(
  packageKey: string
): Promise<CreditPackageRow> {
  if (!packageKey || typeof packageKey !== "string") {
    throw new PaymentError("INVALID_CHECKOUT_REQUEST");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_packages")
    .select("*")
    .eq("key", packageKey)
    .single();
  if (error || !data) {
    throw new PaymentError("PACKAGE_NOT_FOUND", { cause: error });
  }
  const pkg = data as unknown as CreditPackageRow;
  if (pkg.status !== "active") {
    throw new PaymentError("PACKAGE_NOT_AVAILABLE");
  }
  return pkg;
}
