// ============================================================================
// Prosventa Payments — Typed Error Handling
// Stage 8 — Phase 4: Payment + Credit Purchase System
// ============================================================================
// Follows the existing Prosventa error convention (see
// src/features/credits/errors.ts): stable machine-readable codes + safe
// user-facing messages. Raw provider/database messages are NEVER exposed.
// ============================================================================

export type PaymentErrorCode =
  | "UNAUTHORIZED_PAYMENT_OPERATION"
  | "PAYMENT_PROVIDER_NOT_CONFIGURED"
  | "PAYMENT_PROVIDER_UNAVAILABLE"
  | "PACKAGE_NOT_FOUND"
  | "PACKAGE_NOT_AVAILABLE"
  | "INVALID_CHECKOUT_REQUEST"
  | "DUPLICATE_PURCHASE_REQUEST"
  | "PURCHASE_NOT_FOUND"
  | "WEBHOOK_SIGNATURE_INVALID"
  | "WEBHOOK_PAYLOAD_INVALID"
  | "WEBHOOK_DUPLICATE_EVENT"
  | "PAYMENT_AMOUNT_MISMATCH"
  | "PAYMENT_CURRENCY_MISMATCH"
  | "REFUND_INVALID_STATE"
  | "REFUND_AMOUNT_INVALID"
  | "CREDIT_GRANT_FAILED"
  | "PAYMENT_SERVICE_ERROR";

export const PAYMENT_ERROR_MESSAGES: Record<PaymentErrorCode, string> = {
  UNAUTHORIZED_PAYMENT_OPERATION:
    "You are not allowed to perform this payment operation.",
  PAYMENT_PROVIDER_NOT_CONFIGURED:
    "Payments are not configured yet. Please try again later.",
  PAYMENT_PROVIDER_UNAVAILABLE:
    "The payment provider is temporarily unavailable. No charge was made — please try again.",
  PACKAGE_NOT_FOUND: "That credit package does not exist.",
  PACKAGE_NOT_AVAILABLE: "That credit package is not currently available.",
  INVALID_CHECKOUT_REQUEST: "This checkout request is invalid.",
  DUPLICATE_PURCHASE_REQUEST:
    "A purchase was already started for this request.",
  PURCHASE_NOT_FOUND: "Purchase not found.",
  WEBHOOK_SIGNATURE_INVALID: "Webhook signature verification failed.",
  WEBHOOK_PAYLOAD_INVALID: "Webhook payload is malformed.",
  WEBHOOK_DUPLICATE_EVENT: "This webhook event was already processed.",
  PAYMENT_AMOUNT_MISMATCH:
    "Payment amount did not match the order. The purchase is under review and no credits were granted.",
  PAYMENT_CURRENCY_MISMATCH:
    "Payment currency did not match the order. The purchase is under review and no credits were granted.",
  REFUND_INVALID_STATE: "This purchase cannot be refunded in its current state.",
  REFUND_AMOUNT_INVALID: "The refund amount is invalid for this purchase.",
  CREDIT_GRANT_FAILED:
    "Payment recorded but credit granting failed. Our team will reconcile this automatically — you will not lose your purchase.",
  PAYMENT_SERVICE_ERROR:
    "A payment processing error occurred. Please try again.",
};

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;

  constructor(
    code: PaymentErrorCode,
    options: { cause?: unknown } = {}
  ) {
    super(PAYMENT_ERROR_MESSAGES[code]);
    this.name = "PaymentError";
    this.code = code;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Normalizes an unknown error into a typed PaymentError.
 * Never exposes raw database or provider error messages to users.
 */
export function toPaymentError(error: unknown): PaymentError {
  if (error instanceof PaymentError) return error;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("duplicate key")) {
      return new PaymentError("DUPLICATE_PURCHASE_REQUEST", { cause: error });
    }
    if (
      message.includes("row-level security") ||
      message.includes("permission denied")
    ) {
      return new PaymentError("UNAUTHORIZED_PAYMENT_OPERATION", { cause: error });
    }
  }
  return new PaymentError("PAYMENT_SERVICE_ERROR", { cause: error });
}
