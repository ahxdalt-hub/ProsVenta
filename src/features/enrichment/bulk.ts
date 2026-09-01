// ============================================================================
// Prosventa Enrichment — Bulk Model (Pure)
// Feature 2: Enrichment - Phase 3 of 4
// ============================================================================
// Client-safe pure model for BULK enrichment: statuses, limits, estimate math
// and summary computation. NO server imports, NO provider calls, NO credit
// arithmetic beyond reading the central catalog — the SERVER re-resolves all
// costs and balances at execution time; this module only computes what the
// confirmation UI displays.
//
// Reuses:
//   - Phase-1 enrichment status vocabulary where applicable
//   - The central CreditOperationCatalog for ALL cost values (never hardcoded)
// ============================================================================

import { CREDIT_OPERATION_CATALOG } from "@/features/credits/operations";

// ----------------------------------------------------------------------------
// Statuses — compose the Phase-1/2 status architecture
// ----------------------------------------------------------------------------

export type BulkOperationStatus =
  | "queued"
  | "processing"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled";

export type BulkJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "partial"
  | "skipped"
  | "failed"
  | "cancelled";

export const TERMINAL_OPERATION_STATUSES: readonly BulkOperationStatus[] = [
  "completed",
  "partial",
  "failed",
  "cancelled",
];

export function isTerminalOperationStatus(status: string): boolean {
  return (TERMINAL_OPERATION_STATUSES as readonly string[]).includes(status);
}

// ----------------------------------------------------------------------------
// Limits + concurrency — infrastructure-derived, env-tunable, never guessed in
// component code. Defaults are conservative against provider rate limits.
// ----------------------------------------------------------------------------

/** Prospects processed concurrently by ONE operation's worker pool. */
export const BULK_ENRICHMENT_CONCURRENCY = Math.max(
  1,
  Number(process.env.ENRICHMENT_BULK_CONCURRENCY ?? 3)
);

/** Hard server-side cap on prospects per bulk operation. */
export interface BulkEstimate {
  prospectCount: number;
  unitCost: number;
  estimatedCost: number;
}

/** Pure estimate arithmetic used by both the UI preview and server preflight. */
export function computeBulkEstimate(prospectCount: number): BulkEstimate {
  const unitCost = getProspectEnrichmentUnitCost();
  const count = Math.max(0, Math.floor(prospectCount));
  return {
    prospectCount: count,
    unitCost,
    estimatedCost: unitCost * count,
  };
}

// ----------------------------------------------------------------------------
// Operation idempotency key (pure hashing; server passes real ids)
// ----------------------------------------------------------------------------

/**
 * Deterministic operation key from (organization, user, sorted prospect ids).
 * The same selection submitted twice produces the same key, so a double-click
 * or retried request resolves to the SAME logical operation. FNV-1a keeps
 * this dependency-free and stable.
 */
export function buildBulkOperationKey(params: {
  organizationId: string;
  userId: string;
  prospectIds: string[];
}): string {
  // Deduplicate first: a double-click payload containing repeated ids must
  // produce the SAME key as a clean selection.
  const ids = Array.from(new Set(params.prospectIds)).sort().join(",");
  return `bulk:${fnv1a(params.organizationId)}:${fnv1a(params.userId)}:${fnv1a(ids)}`;
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

// ----------------------------------------------------------------------------
// Summary computation — one place decides an operation's final state
// ----------------------------------------------------------------------------
/**
 * Final operation status from per-job outcomes. A batch with ANY success and
 * ANY failure/partial is `partial` (bulk ≠ all-or-nothing); everything failed
 * is `failed`; everything cancelled before work is `cancelled`.
 */
export function computeFinalOperationStatus(
  counters: BulkCounters
): Exclude<BulkOperationStatus, "queued" | "processing"> {
  const succeeded = counters.enriched + counters.partial;
  if (succeeded === 0) {
    if (counters.cancelled > 0 && counters.failed === 0) return "cancelled";
    return "failed";
  }
  if (counters.failed > 0 || counters.partial > 0 || counters.skipped > 0) {
    return "partial";
  }
  return "completed";
}

/**
 * Whether a failed job may be retried: bounded by attempt budget AND failure
 * category. Timeouts are deliberately NOT retryable here — a timed-out
 * provider request may still have succeeded downstream (double-charge risk),
 * so retries stay explicit and bounded.
 */
const RETRYABLE_ERROR_CATEGORIES: ReadonlySet<string> = new Set([
  "rate_limited",
  "provider_unavailable",
  "upstream_error",
  "unknown",
]);

export function isRetryableBulkJob(job: {
  status: string;
  attemptCount: number;
  maxAttempts: number;
  errorCategory: string | null;
}): boolean {
  if (job.status !== "failed") return false;
  if (job.attemptCount >= job.maxAttempts) return false;
  return RETRYABLE_ERROR_CATEGORIES.has(job.errorCategory ?? "");
}

/**
 * Stuck-operation detection (pure). An active operation is stale ONLY when
 * NEITHER the operation itself NOR any of its jobs has been touched since the
 * cutoff — a legitimately slow live run keeps updating job rows and is never
 * recovered prematurely. Missing timestamps never mark an operation stale.
 */
export function isStaleBulkOperation(params: {
  opUpdatedAt: string | null;
  lastJobUpdatedAt: string | null;
  /** ISO timestamp — operations last touched AFTER this are alive. */
  cutoffIso: string;
}): boolean {
  const stamps = [params.opUpdatedAt, params.lastJobUpdatedAt].filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );
  if (stamps.length === 0) return false;
  const cutoff = new Date(params.cutoffIso).getTime();
  if (Number.isNaN(cutoff)) return false;
  return stamps.every((s) => {
    const t = new Date(s).getTime();
    return Number.isNaN(t) || t < cutoff;
  });
}

// ----------------------------------------------------------------------------
// Progress display helpers (pure)
// ----------------------------------------------------------------------------

export interface BulkProgressView {
  total: number;
  processed: number;
  remaining: number;
  counters: BulkCounters;
  processing: number;
  queued: number;
  done: boolean;
}

export function computeProgressView(input: {
  total: number;
  counters: BulkCounters;
  processing: number;
  queued: number;
}): BulkProgressView {
  const processed =
    input.counters.enriched +
    input.counters.partial +
    input.counters.skipped +
    input.counters.failed +
    input.counters.cancelled;
  return {
    total: input.total,
    processed,
    remaining: Math.max(input.total - processed, 0),
    counters: input.counters,
    processing: input.processing,
    queued: input.queued,
    done: input.queued === 0 && input.processing === 0,
  };
}


export interface BulkCounters {
  enriched: number;
  partial: number;
  skipped: number;
  failed: number;
  cancelled: number;
}

export const BULK_ENRICHMENT_MAX_PROSPECTS = Math.max(
  1,
  Number(process.env.ENRICHMENT_BULK_MAX_PROSPECTS ?? 100)
);

/**
 * Credits estimated for ONE prospect: a bulk run performs BOTH legs of the
 * Phase-2 single flow (contact + company), so the estimate reads both
 * operations from THE central catalog. Change pricing there — never here.
 */
export function getProspectEnrichmentUnitCost(): number {
  return (
    CREDIT_OPERATION_CATALOG.prospect_enrichment.cost +
    CREDIT_OPERATION_CATALOG.company_enrichment.cost
  );
}
