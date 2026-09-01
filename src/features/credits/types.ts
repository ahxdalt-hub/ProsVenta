// ============================================================================
// Prosventa Credits — Types
// Stage 8 — Phase 1: Prosventa Credits Architecture
// ============================================================================
// Credits are Prosventa's internal usage currency. They belong to an
// ORGANIZATION (via its credit wallet), never to individual users.
// ============================================================================

// ----------------------------------------------------------------------------
// Controlled transaction vocabulary — mirrors credit_transactions.type CHECK
// ----------------------------------------------------------------------------
export type CreditTransactionType =
  | "grant"
  | "purchase"
  | "consumption"
  | "refund"
  | "adjustment"
  | "expiration"
  | "reservation"
  | "release";

/** Where granted/purchased credits came from (financial reconciliation). */
export type CreditSource =
  | "initial_grant"
  | "plan_allocation"
  | "promotional"
  | "purchase"
  | "admin_adjustment"
  | "refund"
  | "operation";

/** Traceable reference to the operation that caused a ledger entry. */
export type CreditReferenceType =
  | "research"
  | "enrichment"
  | "scoring"
  | "automation"
  | "workflow"
  | "payment"
  | "admin"
  | "system";

// ----------------------------------------------------------------------------
// Wallet
// ----------------------------------------------------------------------------
/**
 * Organization-level credit wallet (DB: org_credit_balances).
 * `balance` = AVAILABLE credits; `reserved` = held for in-flight operations.
 */
export interface CreditWallet {
  id: string;
  organization_id: string;
  balance: number;
  reserved: number;
  lifetime_purchased: number;
  lifetime_granted: number;
  lifetime_consumed: number;
  monthly_allowance: number;
  month_key: string;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Ledger
// ----------------------------------------------------------------------------
/**
 * Immutable ledger entry (DB: credit_transactions).
 * Signed-amount accounting convention: positive = credits added,
 * negative = credits removed. Used consistently everywhere.
 */
export interface CreditLedgerEntry {
  id: string;
  organization_id: string;
  wallet_id: string | null;
  user_id: string;
  feature_id: string;
  /** Signed amount — never zero, never fractional. */
  amount: number;
  type: CreditTransactionType | "deduction" | "topup";
  description: string;
  source: CreditSource | null;
  reference_type: CreditReferenceType | null;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  idempotency_key: string | null;
  created_at: string;
}

// ----------------------------------------------------------------------------
// Operation results
// ----------------------------------------------------------------------------
export type CreditMutationStatus =
  | "ok"
  | "duplicate"
  | "insufficient_credits"
  | "wallet_not_found";

export interface CreditMutationResult {
  status: CreditMutationStatus;
  /** Available balance after the operation (or at read time for duplicates). */
  balance: number;
  /** Ledger entry ID (the original entry when status = duplicate). */
  entryId: string | null;
}

export interface ReconciliationReport {
  balance: number;
  reserved: number;
  ledgerTotal: number;
  expectedBalance: number;
  matches: boolean;
}

// ----------------------------------------------------------------------------
// Shared input shapes
// ----------------------------------------------------------------------------
export interface CreditActor {
  userId: string;
}

export interface CreditReference {
  type: CreditReferenceType;
  id: string;
}
