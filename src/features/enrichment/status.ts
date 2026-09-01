// ============================================================================
// Prosventa Enrichment — Canonical Status Model
// Feature 2: Enrichment - Phase 1 of 4
// ============================================================================
// THE single controlled state model for every enrichment operation. The UI
// later renders exactly these states; no feature may invent its own.
//
//   not_enriched -> queued -> processing -> completed | partial
//                                        \-> failed (retry returns to queued)
//
// Mapping from the database layer is centralized here so the DB's legacy
// values ('none' = not enriched yet, 'pending' = queued) never leak into UI
// code. Pure module — importable by client components and tests.
// ============================================================================

export type EnrichmentOperationStatus =
  | "not_enriched"
  | "queued"
  | "processing"
  | "completed"
  | "partial"
  | "failed";

export const ENRICHMENT_OPERATION_STATUSES: readonly EnrichmentOperationStatus[] = [
  "not_enriched",
  "queued",
  "processing",
  "completed",
  "partial",
  "failed",
];

export const ENRICHMENT_STATUS_LABELS: Readonly<
  Record<EnrichmentOperationStatus, string>
> = {
  not_enriched: "Not enriched",
  queued: "Queued",
  processing: "Enriching",
  completed: "Enriched",
  partial: "Partially enriched",
  failed: "Failed",
};

/** Valid transitions. Anything else must be rejected by callers. */
export const ENRICHMENT_STATUS_TRANSITIONS: Readonly<
  Record<EnrichmentOperationStatus, readonly EnrichmentOperationStatus[]>
> = {
  not_enriched: ["queued"],
  queued: ["processing", "failed"],
  processing: ["completed", "partial", "failed"],
  completed: ["queued"], // explicit refresh only
  partial: ["queued"], // explicit refresh / re-enrich missing fields only
  failed: ["queued"], // explicit user-controlled retry only
};

export function isValidEnrichmentTransition(
  current: EnrichmentOperationStatus,
  next: EnrichmentOperationStatus
): boolean {
  return ENRICHMENT_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

/**
 * Maps a stored enrichment-record status (`prospect_enrichments.status` /
 * `company_enrichments.status`) onto the canonical model. Unknown or null
 * values safely mean "never enriched". 'partial' is preferred over
 * 'completed' when a record reports both contexts; callers pass the job
 * status separately when they need that nuance.
 */
export function mapDbEnrichmentStatus(
  dbStatus: string | null | undefined,
  options?: { hasPartialData?: boolean }
): EnrichmentOperationStatus {
  switch (dbStatus) {
    case "queued":
    case "pending":
      return "queued";
    case "processing":
      return "processing";
    case "completed":
      return options?.hasPartialData ? "partial" : "completed";
    case "partial":
      return "partial";
    case "failed":
      return "failed";
    // 'none', null, undefined, anything unknown → never enriched.
    default:
      return "not_enriched";
  }
}

/**
 * Maps an `intelligence_jobs` status onto the canonical model. Jobs use
 * 'pending' for the queued concept — same lifecycle, different legacy name.
 */
export function mapDbJobStatus(
  dbStatus: string | null | undefined
): EnrichmentOperationStatus {
  switch (dbStatus) {
    case "pending":
      return "queued";
    case "processing":
      return "processing";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return "not_enriched";
  }
}

/** Whether the status represents data the UI can actually display. */
export function isDisplayableEnrichmentStatus(
  status: EnrichmentOperationStatus
): status is "completed" | "partial" {
  return status === "completed" || status === "partial";
}
