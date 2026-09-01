// ============================================================================
// Prosventa Credits — Typed Error Handling
// Stage 8 — Phase 1: Prosventa Credits Architecture
// ============================================================================
// Follows the existing Prosventa error convention (see
// src/features/intelligence/errors.ts): stable machine-readable codes +
// safe user-facing messages. Credit errors are distinguishable so later
// phases can turn INSUFFICIENT_CREDITS into an upgrade/purchase flow.
// ============================================================================

export type CreditErrorCode =
  | "INSUFFICIENT_CREDITS"
  | "WALLET_NOT_FOUND"
  | "UNAUTHORIZED_CREDIT_OPERATION"
  | "INVALID_CREDIT_AMOUNT"
  | "DUPLICATE_TRANSACTION"
  | "INVALID_TRANSACTION_REFERENCE"
  | "CREDIT_SERVICE_ERROR"
  // Stage 8 — Phase 2
  | "OPERATION_NOT_BILLABLE"
  | "USAGE_INVALID_TRANSITION"
  | "AUTOMATION_CREDIT_LIMIT";

export const CREDIT_ERROR_MESSAGES: Record<CreditErrorCode, string> = {
  INSUFFICIENT_CREDITS: "Not enough credits available for this operation.",
  WALLET_NOT_FOUND: "No credit wallet exists for this organization yet.",
  UNAUTHORIZED_CREDIT_OPERATION: "You are not allowed to perform this credit operation.",
  INVALID_CREDIT_AMOUNT: "The credit amount must be a positive whole number.",
  DUPLICATE_TRANSACTION: "This credit transaction was already processed.",
  INVALID_TRANSACTION_REFERENCE: "The transaction reference is missing or invalid.",
  CREDIT_SERVICE_ERROR: "A credit accounting error occurred. Please try again.",
  OPERATION_NOT_BILLABLE: "This operation is not a billable credit operation.",
  USAGE_INVALID_TRANSITION: "This usage record cannot move to that status.",
  AUTOMATION_CREDIT_LIMIT:
    "This automation reached its per-execution credit limit and was stopped.",
};


export class CreditError extends Error {
  readonly code: CreditErrorCode;
  /** Available balance, when the error relates to a balance check. */
  readonly balance: number | null;

  constructor(
    code: CreditErrorCode,
    options: { balance?: number | null; cause?: unknown } = {}
  ) {
    super(CREDIT_ERROR_MESSAGES[code]);
    this.name = "CreditError";
    this.code = code;
    this.balance = options.balance ?? null;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Normalizes an unknown error into a typed CreditError.
 * Never exposes raw database error messages to users.
 */
export function toCreditError(error: unknown): CreditError {
  if (error instanceof CreditError) return error;

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // SECURITY DEFINER functions raise short sentinel messages on invalid input.
    if (message.includes("invalid_credit_amount")) {
      return new CreditError("INVALID_CREDIT_AMOUNT", { cause: error });
    }
    if (message.includes("wallet_not_found")) {
      return new CreditError("WALLET_NOT_FOUND", { cause: error });
    }
    if (message.includes("invalid_transaction_type") || message.includes("missing_adjustment_reason")) {
      return new CreditError("INVALID_TRANSACTION_REFERENCE", { cause: error });
    }
    if (message.includes("duplicate key")) {
      return new CreditError("DUPLICATE_TRANSACTION", { cause: error });
    }
    if (message.includes("append-only") || message.includes("row-level security")) {
      return new CreditError("UNAUTHORIZED_CREDIT_OPERATION", { cause: error });
    }
  }

  return new CreditError("CREDIT_SERVICE_ERROR", { cause: error });
}
