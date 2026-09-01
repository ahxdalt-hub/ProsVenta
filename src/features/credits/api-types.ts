// ============================================================================
// Prosventa Billing/Credits — Client↔Server API Contracts
// Stage 8 — Phase 5
// ============================================================================
// Shapes returned by /api/credits/* and /api/payments/*. These types are the
// data contracts the future Settings rebuild will also consume. All financial
// values here are SERVER-AUTHORITATIVE — clients only display them.
// ============================================================================

import type {
  BillingStatus,
  BillingInterval,
  EntitlementKey,
  LimitType,
} from "@/features/plans/types";
import type { PurchaseStatus } from "@/features/payments/types";

// ----------------------------------------------------------------------------
// GET /api/credits/summary
// ----------------------------------------------------------------------------

export interface UsageBreakdownEntry {
  category: string;
  credits: number;
}

export interface CreditSummaryDto {
  wallet: {
    balance: number;
    reserved: number;
    monthlyAllowance: number;
    lifetimePurchased: number;
  } | null;
  usage: {
    /** Current billing month key, e.g. "2026-08". */
    monthKey: string;
    periodStart: string;
    periodEnd: string;
    usedCredits: number;
    operationCount: number;
    byCategory: UsageBreakdownEntry[];
  } | null;
  plan: {
    name: string;
    key: string;
    billingStatus: BillingStatus;
    billingInterval: BillingInterval | null;
    periodStart: string | null;
    periodEnd: string | null;
    limitExceeded: boolean;
    limits: Array<{
      key: EntitlementKey;
      label: string;
      limitType: LimitType;
      value: number | null;
      used: number;
      remaining: number | null;
    }>;
  } | null;
}

// ----------------------------------------------------------------------------
// GET /api/credits/ledger
// ----------------------------------------------------------------------------

export interface LedgerEntryDto {
  id: string;
  amount: number;
  type: string;
  description: string;
  source: string | null;
  referenceType: string | null;
  createdAt: string;
}

export interface LedgerPageDto {
  entries: LedgerEntryDto[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ----------------------------------------------------------------------------
// GET /api/payments/packages
// ----------------------------------------------------------------------------

export interface CreditPackageDto {
  key: string;
  name: string;
  description: string;
  creditAmount: number;
  currency: string;
  /** Minor units (paise/cents). Formatting happens via displayPrice. */
  priceMinor: number;
  displayPrice: string;
  /** Only true when objectively configured on the package (metadata.recommended). */
  recommended: boolean;
}

// ----------------------------------------------------------------------------
// GET /api/payments/purchases
// ----------------------------------------------------------------------------

export interface PurchaseDto {
  id: string;
  status: PurchaseStatus;
  packageName: string;
  credits: number;
  amountMinor: number;
  displayAmount: string;
  currency: string;
  refundedAmountMinor: number;
  createdAt: string;
}

export interface PurchasesPageDto {
  purchases: PurchaseDto[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ----------------------------------------------------------------------------
// POST /api/payments/checkout (Phase 4 route)
// ----------------------------------------------------------------------------

export interface CheckoutResultDto {
  purchaseId: string;
  checkoutUrl: string;
  providerOrderId: string;
}

// ----------------------------------------------------------------------------
// GET /api/payments/purchases/[id] (Phase 4 route)
// ----------------------------------------------------------------------------

export interface PurchaseStatusDto {
  purchase: {
    id: string;
    status: PurchaseStatus;
    credits: number;
    amount: number;
    currency: string;
    packageKey: string;
    createdAt: string;
  };
  balance: number | null;
}
