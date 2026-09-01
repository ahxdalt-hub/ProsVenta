// ============================================================================
// Prosventa Signals — Query Filter Normalization
// Feature 3 — Phase 1: Signal Foundation & Data Architecture
// ============================================================================
// Normalizes incoming query filters into a safe, bounded query plan BEFORE any
// database call is made. Pure and testable. The server-side query service
// consumes the normalized plan; UI components never craft raw queries.
// ============================================================================

import {
  SIGNAL_TYPES,
  SIGNAL_STATUSES,
  type SignalType,
  type SignalStatus,
  type SignalQueryFilters,
} from "./types";
import { getSignalFreshnessThresholds } from "./lifecycle";

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_SIGNAL_PAGE_SIZE = 20;
export const MAX_SIGNAL_PAGE_SIZE = 100;

export interface NormalizedSignalQueryPlan {
  organization_id: string;
  prospect_id: string | null;
  company_key: string | null;
  signal_type: SignalType[];
  status: SignalStatus[];
  occurred_from: string | null;
  occurred_to: string | null;
  limit: number;
  offset: number;
  order_by: "occurred_at" | "detected_at" | "created_at";
  order_dir: "asc" | "desc";
}

function normalizeList<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Converts a freshness band into an occurred_at date range. */
function freshnessRange(freshness: NonNullable<SignalQueryFilters["freshness"]>): {
  from: string;
  to: string;
} {
  const now = Date.now();
  const { freshDays, agingDays } = getSignalFreshnessThresholds();
  if (freshness === "fresh") {
    return { from: new Date(now - freshDays * DAY_MS).toISOString(), to: new Date(now).toISOString() };
  }
  if (freshness === "aging") {
    return { from: new Date(now - agingDays * DAY_MS).toISOString(), to: new Date(now - freshDays * DAY_MS).toISOString() };
  }
  // historical → everything older than the aging window
  return { from: new Date(0).toISOString(), to: new Date(now - agingDays * DAY_MS).toISOString() };
}

/**
 * Validates and normalizes filters into a DB-safe query plan.
 * Returns validation issues when inputs are unusable; callers must not run a
 * partial/unscoped query when organization_id is missing.
 */
export function normalizeSignalQuery(
  organizationId: string,
  filters: SignalQueryFilters = {}
): { plan: NormalizedSignalQueryPlan | null; issues: string[] } {
  const issues: string[] = [];

  if (!organizationId?.trim()) {
    issues.push("organization_id is required.");
  }

  if (!issues.length) {
    for (const t of normalizeList(filters.signal_type)) {
      if (!SIGNAL_TYPES.includes(t)) issues.push(`Unknown signal_type: ${String(t)}`);
    }
    for (const s of normalizeList(filters.status)) {
      if (!SIGNAL_STATUSES.includes(s)) issues.push(`Unknown status: ${String(s)}`);
    }
    if (filters.from && Number.isNaN(new Date(filters.from).getTime())) {
      issues.push("Invalid 'from' date.");
    }
    if (filters.to && Number.isNaN(new Date(filters.to).getTime())) {
      issues.push("Invalid 'to' date.");
    }
  }

  if (issues.length) return { plan: null, issues };

  const explicitFrom = filters.from ? new Date(filters.from).toISOString() : null;
  const explicitTo = filters.to ? new Date(filters.to).toISOString() : null;
  const range =
    !explicitFrom && !explicitTo && filters.freshness
      ? freshnessRange(filters.freshness)
      : null;

  const requestedLimit = filters.limit ?? DEFAULT_SIGNAL_PAGE_SIZE;

  return {
    plan: {
      organization_id: organizationId.trim(),
      prospect_id: filters.prospect_id ?? null,
      company_key: filters.company_key ?? null,
      signal_type: normalizeList(filters.signal_type),
      status: normalizeList(filters.status),
      occurred_from: explicitFrom ?? range?.from ?? null,
      occurred_to: explicitTo ?? range?.to ?? null,
      limit: Math.min(Math.max(requestedLimit, 1), MAX_SIGNAL_PAGE_SIZE),
      offset: Math.max(filters.offset ?? 0, 0),
      order_by: filters.order_by ?? "occurred_at",
      order_dir: filters.order_dir ?? "desc",
    },
    issues: [],
  };
}