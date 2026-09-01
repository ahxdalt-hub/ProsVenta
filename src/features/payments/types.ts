// ============================================================================
// Prosventa Payments — Types
// Stage 8 — Phase 4: Payment + Credit Purchase System
// ============================================================================
// Money movement (payments) is intentionally separate from credit movement
// (the Phase 1 wallet/ledger). These types never merge those responsibilities.
// Amounts are INTEGER minor units (paise/cents). Currencies are ISO-4217.
// ============================================================================

/** Controlled package lifecycle. Packages are NEVER deleted. */
export type CreditPackageStatus = "active" | "inactive" | "deprecated";

export interface CreditPackageRow {
  id: string;
  key: string;
  name: string;
  description: string;
  credit_amount: number;
  currency: string;
  price: number; // minor units
  status: CreditPackageStatus;
  display_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Documented purchase lifecycle:
 *   pending            → checkout created, awaiting provider confirmation
 *   processing         → provider reports an in-flight action (transitional)
 *   paid               → payment confirmed AND credits granted (atomic RPC)
 *   failed             → provider reported failure — zero credits granted
 *   cancelled          → customer abandoned checkout — zero credits granted
 *   expired            → checkout session expired — zero credits granted
 *   refunded           → fully refunded via compensating ledger entries
 *   partially_refunded → partially refunded
 */
export type PurchaseStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded"
  | "partially_refunded";

/** Statuses from which a retryable checkout may resume safely. */
export const RETRYABLE_PURCHASE_STATUSES: ReadonlySet<PurchaseStatus> = new Set([
  "pending",
  "failed",
  "cancelled",
  "expired",
]);

export interface PurchaseRow {
  id: string;
  organization_id: string;
  package_id: string;
  created_by: string | null;
  purchase_status: PurchaseStatus;
  currency: string;
  amount: number; // minor units snapshot
  credits: number; // credits snapshot
  snapshot: PurchaseSnapshot;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  idempotency_key: string | null;
  refunded_amount: number;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Immutable commercial snapshot taken at purchase time. Historical purchases
 * remain accurate even after the package's price/credits/status change.
 */
export interface PurchaseSnapshot {
  package_key: string;
  package_name: string;
  package_status_at_purchase: CreditPackageStatus;
  credit_amount: number;
  currency: string;
  price: number; // minor units
  [key: string]: unknown;
}

export type PaymentRecordStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface PaymentRow {
  id: string;
  purchase_id: string;
  provider: string;
  provider_payment_id: string | null;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
  payment_method_type: string | null;
  provider_metadata: Record<string, unknown>;
  created_at: string;
}

// ----------------------------------------------------------------------------
// Provider abstraction contracts (application code never sees provider SDKs)
// ----------------------------------------------------------------------------
export interface CheckoutRequest {
  /** Stable internal reference the provider echoes back (purchase ID). */
  internalReference: string;
  amount: number; // minor units
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
  metadata: Record<string, string>;
}

export interface CheckoutSession {
  provider: string;
  /** Provider checkout/order identifier (e.g. Stripe Checkout Session id). */
  providerOrderId: string;
  /** URL the browser is redirected to (hosted, PCI-compliant checkout). */
  checkoutUrl: string;
  expiresAt?: string | null;
}

export interface RetrievedPayment {
  providerPaymentId: string | null;
  status: "pending" | "succeeded" | "failed" | "cancelled";
  amount: number | null; // minor units
  currency: string | null;
  paymentMethodType: string | null;
  rawStatus: string;
}

export interface RefundRequest {
  providerPaymentId: string;
  /** Minor units. Omit/null for a full refund when supported. */
  amount?: number | null;
  reason?: string | null;
}

export interface ProviderRefundResult {
  providerRefundId: string | null;
  amount: number;
  status: "pending" | "succeeded" | "failed";
}

export interface ParsedProviderEvent {
  /** Unique provider event ID — the webhook idempotency key. */
  eventId: string;
  eventType: string;
  /** The provider payment intent / charge identifier when present. */
  providerPaymentId: string | null;
  /** Internal reference we attached at checkout (our purchase ID). */
  internalReference: string | null;
  amount: number | null;
  currency: string | null;
  kind:
    | "payment_succeeded"
    | "payment_failed"
    | "payment_cancelled"
    | "refund_processed"
    | "unknown";
  metadata: Record<string, unknown>;
}
