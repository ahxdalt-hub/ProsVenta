// ============================================================================
// Prosventa Credits — Credit Operation Catalog
// Stage 8 — Phase 2: Credit Consumption + Usage Tracking
// ============================================================================
// THE single authoritative source for billable operations and their credit
// costs. Product code NEVER hardcodes a credit cost — it reads this catalog.
//
//   CreditOperationCatalog → CreditService/BillableOperations → operation
//
// The frontend may IMPORT this module to DISPLAY costs (it is plain TS so it
// can render "Uses 5 Credits"), but the SERVER re-resolves the cost from the
// same catalog at execution time. The frontend is never billing authority.
//
// ⚠ DEVELOPMENT/TEST COSTS — the `cost` values below are internal development
// prices for building/testing the credit pipeline. They are NOT final public
// pricing. Change them here (one place) when commercial pricing is defined in
// a later Stage 8 phase. No payment processing exists anywhere yet.
// ============================================================================

export type CreditOperationCategory =
  | "enrichment"
  | "research"
  | "signals"
  | "automation"
  | "other";

/**
 * Stable operation identifiers. UI labels may change; these keys never do.
 * Mirrored by the credit_usage_records.operation_key CHECK constraint.
 */
export type CreditOperationKey =
  | "company_enrichment"
  | "prospect_enrichment"
  | "company_research"
  | "prospect_research"
  | "signal_refresh"
  | "automation_execution";

/** Billing lifecycle mode (see BillableOperations). */
export type CreditBillingMode =
  // Short operations: run first; consume only on success. A failure never
  // charges. Simple, no reservation overhead.
  | "consume_on_success"
  // Long/streaming operations: reserve upfront, finalize on success,
  // release on failure/cancellation.
  | "reserve_consume_release";

/** Partial-success policy per operation (documented, not inferred). */
export type CreditRefundPolicy = "all_or_nothing" | "partially_billable";

export interface CreditOperation {
  key: CreditOperationKey;
  displayName: string;
  description: string;
  /** DEV/TEST cost in whole credits — see header warning. */
  cost: number;
  category: CreditOperationCategory;
  enabled: boolean;
  billingMode: CreditBillingMode;
  refundPolicy: CreditRefundPolicy;
  /** Ledger reference_type used for the consumption transaction. */
  referenceType:
    | "enrichment"
    | "research"
    | "scoring"
    | "automation"
    | "workflow"
    | "system";
}

// ---------------------------------------------------------------------------
// THE CATALOG — development/test configuration
// ---------------------------------------------------------------------------
export const CREDIT_OPERATION_CATALOG: Readonly<
  Record<CreditOperationKey, CreditOperation>
> = {
  company_enrichment: {
    key: "company_enrichment",
    displayName: "Company Enrichment",
    description: "Provider-backed enrichment of a prospect's company profile.",
    cost: 3,
    category: "enrichment",
    enabled: true,
    billingMode: "consume_on_success",
    refundPolicy: "all_or_nothing",
    referenceType: "enrichment",
  },
  prospect_enrichment: {
    key: "prospect_enrichment",
    displayName: "Contact Enrichment",
    description: "Provider-backed person/contact enrichment for a prospect.",
    cost: 2,
    category: "enrichment",
    enabled: true,
    billingMode: "consume_on_success",
    refundPolicy: "all_or_nothing",
    referenceType: "enrichment",
  },
  company_research: {
    key: "company_research",
    displayName: "Company Research",
    description: "AI-generated grounded research brief for a prospect's company.",
    cost: 5,
    category: "research",
    enabled: true,
    billingMode: "consume_on_success",
    refundPolicy: "all_or_nothing",
    referenceType: "research",
  },
  prospect_research: {
    key: "prospect_research",
    displayName: "Prospect Research",
    description: "Deep AI research brief about an individual prospect.",
    cost: 10,
    category: "research",
    enabled: true,
    billingMode: "consume_on_success",
    refundPolicy: "all_or_nothing",
    referenceType: "research",
  },
  signal_refresh: {
    key: "signal_refresh",
    displayName: "Signal Detection",
    description: "External buying-intent signal detection for a prospect.",
    cost: 2,
    category: "signals",
    enabled: true,
    billingMode: "consume_on_success",
    refundPolicy: "all_or_nothing",
    referenceType: "system",
  },
  automation_execution: {
    key: "automation_execution",
    displayName: "Automation Step",
    description: "Provider-backed step executed inside an automated workflow.",
    cost: 1,
    category: "automation",
    enabled: true,
    billingMode: "consume_on_success",
    refundPolicy: "all_or_nothing",
    referenceType: "automation",
  },
};

/** Only operations that actually exist AND are ready to consume credits. */
export const BILLABLE_OPERATION_KEYS = Object.values(CREDIT_OPERATION_CATALOG)
  .filter((op) => op.enabled)
  .map((op) => op.key);

export function getCreditOperation(key: CreditOperationKey): CreditOperation {
  return CREDIT_OPERATION_CATALOG[key];
}

export function getOperationCost(key: CreditOperationKey): number {
  return CREDIT_OPERATION_CATALOG[key].cost;
}

export function listCreditOperations(): CreditOperation[] {
  return Object.values(CREDIT_OPERATION_CATALOG);
}

// ---------------------------------------------------------------------------
// Configurable thresholds — never hardcode "10 credits = low" elsewhere.
// ---------------------------------------------------------------------------
/** Below this available balance, wallets are considered LOW (UI + events). */
export const LOW_BALANCE_THRESHOLD = Number(
  process.env.CREDITS_LOW_BALANCE_THRESHOLD ?? 50
);

/** Per-execution cap for automated workflows (runaway-spend protection). */
export const AUTOMATION_MAX_CREDITS_PER_EXECUTION = Number(
  process.env.CREDITS_AUTOMATION_MAX_PER_EXECUTION ?? 25
);

/**
 * Duplicate-request window. Two identical requests for the same logical
 * operation within this window share ONE idempotency key → at most one
 * charge (double-click / refresh / browser-retry protection). Intentional
 * repeats after the window are new logical operations.
 */
export const IDEMPOTENCY_WINDOW_MS = 10_000;

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested; no server dependencies)
// ---------------------------------------------------------------------------

/**
 * Builds the stable idempotency key for one logical operation instance.
 * Same op + org + prospect (+ scope) within the same window → same key,
 * so concurrent duplicate requests hit the ledger's unique idempotency_key
 * and only ONE consumption transaction is ever created.
 */
export function buildOperationIdempotencyKey(params: {
  operationKey: CreditOperationKey;
  organizationId: string;
  prospectId?: string | null;
  scope?: string | null;
  windowMs?: number;
  now?: number;
}): string {
  const windowMs = params.windowMs ?? IDEMPOTENCY_WINDOW_MS;
  const bucket = Math.floor((params.now ?? Date.now()) / windowMs);
  const parts = [
    params.operationKey,
    params.organizationId,
    params.prospectId ?? "org",
    params.scope ?? "default",
    String(bucket),
  ];
  return parts.join(":");
}

export type PreflightStatus = "READY" | "INSUFFICIENT_CREDITS";

export interface PreflightResult {
  status: PreflightStatus;
  estimatedCost: number;
  available: number;
  shortfall: number;
}

/**
 * Preflight check for N units of an operation (batch-safe).
 * Pure arithmetic — the caller supplies the authoritative balance read from
 * the wallet inside the same request.
 */
export function computePreflight(params: {
  unitCost: number;
  quantity?: number;
  available: number;
}): PreflightResult {
  const { unitCost, available } = params;
  if (!Number.isInteger(unitCost) || unitCost < 0) {
    throw new Error("invalid_unit_cost");
  }
  const quantity = params.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("invalid_quantity");
  }
  const estimatedCost = unitCost * quantity;
  const ok = available >= estimatedCost;
  return {
    status: ok ? "READY" : "INSUFFICIENT_CREDITS",
    estimatedCost,
    available,
    shortfall: ok ? 0 : estimatedCost - available,
  };
}

// ---------------------------------------------------------------------------
// Usage record statuses — controlled transitions only
// ---------------------------------------------------------------------------
export type CreditUsageStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded"
  | "cancelled";

/** Valid transitions. Anything else is rejected by UsageService. */
export const USAGE_STATUS_TRANSITIONS: Readonly<
  Record<CreditUsageStatus, readonly CreditUsageStatus[]>
> = {
  pending: ["completed", "failed", "cancelled"],
  completed: ["refunded"],
  failed: [],
  refunded: [],
  cancelled: [],
};

export function isValidUsageTransition(
  from: CreditUsageStatus,
  to: CreditUsageStatus
): boolean {
  return USAGE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

