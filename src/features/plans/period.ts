// ============================================================================
// Prosventa Plans & Entitlements — Billing Period Utilities
// Stage 8 — Phase 3: Plans, Limits + Organization Billing
// ============================================================================
// Pure functions (no DB access) so they can be unit-tested and reused by both
// the server service and the idempotency-key construction.
//
// Current model: calendar-month periods ("2026-08"). The subscription row may
// override the window with explicit period_start/period_end dates once real
// payment-provider anchor dates exist (Phase 4).
// ============================================================================

import type { OrganizationSubscriptionRow } from "./types";

/** Returns 'YYYY-MM' for a date. */
export function periodKeyOf(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Inclusive [start, end] window of the calendar month containing `date`. */
export function calendarPeriodWindow(
  date: Date
): { start: string; end: string } {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
  );
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  );
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/**
 * Resolves the CURRENT billing period for a subscription.
 * Uses the stored window when present; otherwise falls back to the calendar
 * month. Never returns an inverted or missing window.
 */
export function resolveCurrentPeriod(subscription: {
  period_start: string | null;
  period_end: string | null;
}): { start: string; end: string; key: string } {
  const now = new Date();
  let start = subscription.period_start;
  let end = subscription.period_end;

  // Missing/stale/inverted stored windows fall back to the calendar month.
  if (
    !start ||
    !end ||
    new Date(end) < now ||
    new Date(start) > new Date(end)
  ) {
    const fallback = calendarPeriodWindow(now);
    start = fallback.start;
    end = fallback.end;
  }

  return { start, end, key: periodKeyOf(new Date(`${start}T00:00:00Z`)) };
}

/**
 * Deterministic allocation idempotency key for one org + one billing period.
 * The ledger's unique index turns retries into no-op duplicates.
 */
export function buildAllocationIdempotencyKey(
  organizationId: string,
  periodKey: string
): string {
  return `plan_allocation:${organizationId}:${periodKey}`;
}

/** True when `date` lies within the inclusive [start, end] window. */
export function isDateInPeriod(
  date: string,
  period: { start: string; end: string }
): boolean {
  return date >= period.start && date <= period.end;
}

/** Convenience helper mirroring the DB function's fallback behavior. */
export function currentPeriodForSubscription(
  subscription: Pick<
    OrganizationSubscriptionRow,
    "period_start" | "period_end"
  >
): { start: string; end: string; key: string } {
  return resolveCurrentPeriod(subscription);
}
