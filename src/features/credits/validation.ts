// ============================================================================
// Prosventa Credits — Centralized Validation
// Stage 8 — Phase 1: Prosventa Credits Architecture
// ============================================================================
// All amount/reference validation lives here so no product feature invents
// its own rules. The database re-enforces these with CHECK constraints and
// function guards — TypeScript validation is defense-in-depth, not the only
// line of defense.
// ============================================================================

import { CreditError } from "./errors";
import type { CreditReferenceType, CreditSource, CreditTransactionType } from "./types";

/** Absurdly large single mutation cap (whole credits). */
export const MAX_CREDIT_AMOUNT = 1_000_000;

const TRANSACTION_TYPES: ReadonlySet<string> = new Set([
  "grant",
  "purchase",
  "consumption",
  "refund",
  "adjustment",
  "expiration",
  "reservation",
  "release",
]);

const SOURCES: ReadonlySet<string> = new Set([
  "initial_grant",
  "promotional",
  "purchase",
  "admin_adjustment",
  "refund",
  "operation",
]);

const REFERENCE_TYPES: ReadonlySet<string> = new Set([
  "research",
  "enrichment",
  "scoring",
  "automation",
  "workflow",
  "payment",
  "admin",
  "system",
]);

/**
 * Validates a positive-only credit amount (grant / consume / refund /
 * reserve). Whole credits only — zero, negative, fractional and oversized
 * amounts are rejected.
 */
export function validatePositiveAmount(amount: unknown): number {
  if (typeof amount !== "number" || !Number.isInteger(amount)) {
    throw new CreditError("INVALID_CREDIT_AMOUNT");
  }
  if (amount <= 0) {
    throw new CreditError("INVALID_CREDIT_AMOUNT");
  }
  if (amount > MAX_CREDIT_AMOUNT) {
    throw new CreditError("INVALID_CREDIT_AMOUNT");
  }
  return amount;
}

/** Validates a signed adjustment amount (non-zero whole credits). */
export function validateSignedAmount(amount: unknown): number {
  if (typeof amount !== "number" || !Number.isInteger(amount)) {
    throw new CreditError("INVALID_CREDIT_AMOUNT");
  }
  if (amount === 0 || Math.abs(amount) > MAX_CREDIT_AMOUNT) {
    throw new CreditError("INVALID_CREDIT_AMOUNT");
  }
  return amount;
}

export function isValidTransactionType(type: string): type is CreditTransactionType {
  return TRANSACTION_TYPES.has(type);
}

export function isValidSource(source: string): source is CreditSource {
  return SOURCES.has(source);
}

export function isValidReferenceType(type: string): type is CreditReferenceType {
  return REFERENCE_TYPES.has(type);
}

/**
 * Validates an operation reference. References must be traceable:
 * a known type plus a non-empty identifier.
 */
export function validateReference(
  type: string | null | undefined,
  id: string | null | undefined
): void {
  if (!type || !id || typeof id !== "string" || id.trim().length === 0) {
    throw new CreditError("INVALID_TRANSACTION_REFERENCE");
  }
  if (!isValidReferenceType(type)) {
    throw new CreditError("INVALID_TRANSACTION_REFERENCE");
  }
}

/** Validates an optional idempotency key shape (non-empty, bounded). */
export function validateIdempotencyKey(key: string | null | undefined): string | null {
  if (key === undefined || key === null) return null;
  const trimmed = key.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 200) {
    throw new CreditError("INVALID_TRANSACTION_REFERENCE");
  }
  return trimmed;
}

/** Keeps ledger metadata compact — structured fields only, size-bounded. */
export function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!metadata) return {};
  const entries = Object.entries(metadata)
    .filter(([, v]) => v !== undefined)
    .slice(0, 20)
    .map(([k, v]) => [k.slice(0, 100), typeof v === "string" ? v.slice(0, 500) : v] as const);
  return Object.fromEntries(entries);
}
