// ============================================================================
// Prosventa Intelligence Orchestrator — Pipeline State (pure)
// Stage 6 — Phase 6: Intelligence Orchestration (Final Phase)
// ============================================================================
// Pure derivation of pipeline state from an intelligence_jobs row. Both the
// backend and the UI understand these states. No percentages are ever faked —
// progress is derived from real per-operation outcomes only.
//
// Physical job status stays within the existing schema
// (pending | processing | completed | failed). The richer logical state lives
// in `metadata.finalState` so the existing CHECK constraints hold.
// ============================================================================

import type { OperationId } from "./operations";

// ============================================================================
// Logical pipeline states
// ============================================================================

export type PipelineState =
  | "queued"
  | "processing"
  | "completed"
  | "partially_completed"
  | "failed";

export const PIPELINE_STATE_LABELS: Record<PipelineState, string> = {
  queued: "Queued",
  processing: "Processing intelligence",
  completed: "Intelligence ready",
  partially_completed: "Partially processed",
  failed: "Processing needs attention",
};

/** Compact UI indicator used by the prospects table and workspace. */
export type UiProcessingState = "processing" | "ready" | "partial" | "attention";

export function toUiProcessingState(state: PipelineState): UiProcessingState {
  switch (state) {
    case "queued":
    case "processing":
      return "processing";
    case "completed":
      return "ready";
    case "partially_completed":
      return "partial";
    case "failed":
      return "attention";
  }
}

// ============================================================================
// Run metadata (stored in intelligence_jobs.metadata)
// ============================================================================

export type PipelineTrigger =
  | "prospect_created"
  | "prospect_imported"
  | "manual_refresh"
  | "retry"
  | "stale_recovery";

/**
 * Execution priority order (lower runs first):
 *   1 manual refresh → 2 newly created → 3 imported → 4 retry/recovery
 */
export const TRIGGER_PRIORITY: Record<PipelineTrigger, number> = {
  manual_refresh: 0,
  prospect_created: 1,
  prospect_imported: 2,
  retry: 3,
  stale_recovery: 4,
};

export interface PipelineRunMetadata {
  trigger?: PipelineTrigger;
  priority?: number;
  finalState?: PipelineState;
  operations?: Partial<Record<OperationId, { outcome: string; reason?: string | null }>>;
  recoveredFromStale?: boolean;
}

export function parseRunMetadata(value: unknown): PipelineRunMetadata {
  if (typeof value !== "object" || value === null) return {};
  return value as PipelineRunMetadata;
}

// ============================================================================
// State derivation
// ============================================================================

/**
 * Derives the logical pipeline state from a run row:
 *   - pending            → queued
 *   - processing         → processing
 *   - completed/failed   → metadata.finalState when recorded, otherwise
 *                          derived honestly from per-operation outcomes
 */
export function derivePipelineState(
  status: string,
  metadata: unknown,
  startedAt?: string | null
): PipelineState {
  if (status === "pending") return "queued";
  if (status === "processing") return "processing";

  const meta = parseRunMetadata(metadata);
  if (meta.finalState) return meta.finalState;

  // Rows without finalState — derive honestly from operation outcomes.
  const ops = meta.operations ?? {};
  const outcomes = Object.values(ops).map((o) => o?.outcome);
  const hasSuccess = outcomes.includes("success");
  const hasFailure = outcomes.includes("failed");
  const hasSkip = outcomes.includes("skipped");

  if (!hasSuccess && hasFailure) return "failed";
  if (hasSuccess && !hasFailure && !hasSkip) return "completed";
  if (outcomes.length > 0) return "partially_completed"; // any skip/failure mix

  return startedAt ? "failed" : "queued";
}

// ============================================================================
// Progress steps (honest — derived from real outcomes only)
// ============================================================================

import { PIPELINE_OPERATIONS, OPERATION_LABELS } from "./operations";

export interface ProgressStep {
  id: OperationId;
  label: string;
  marker: "done" | "active" | "skipped" | "failed" | "pending";
}

/**
 * Builds the workspace progress list.
 *  - recorded success  → done
 *  - recorded skip     → skipped (distinct from failure — honest)
 *  - recorded failure  → failed
 *  - first unfinished  → active ONLY while the run is actually processing
 *  - everything else   → pending
 */
export function derivePipelineProgress(
  metadata: unknown,
  isRunning: boolean
): ProgressStep[] {
  const ops = parseRunMetadata(metadata).operations ?? {};
  let activeAssigned = false;

  return PIPELINE_OPERATIONS.map((id) => {
    const result = ops[id];
    let marker: ProgressStep["marker"];
    if (result?.outcome === "success") marker = "done";
    else if (result?.outcome === "skipped") marker = "skipped";
    else if (result?.outcome === "failed") marker = "failed";
    else if (isRunning && !activeAssigned) {
      marker = "active";
      activeAssigned = true;
    } else marker = "pending";

    return { id, label: OPERATION_LABELS[id], marker };
  });
}

// ============================================================================
// Idempotency & stale recovery
// ============================================================================

/** A stuck processing run older than this is treated as abandoned. */
export const STALE_PROCESSING_MS = 15 * 60 * 1000; // 15 minutes

export interface ExistingRunRow {
  id: string;
  status: string;
  started_at: string | null;
  updated_at: string | null;
}

export interface QueueDecision {
  queue: boolean;
  /** Abandoned 'processing' runs that must be marked failed before requeueing */
  staleRunIds: string[];
}

/**
 * Decides whether a new pipeline run may be queued for one prospect.
 *
 * Rules:
 *  - An ACTIVE (pending/processing) run blocks a new one → no duplicates.
 *  - A processing run older than STALE_PROCESSING_MS is abandoned: reported
 *    for stale-recovery and does NOT block. Prospects can never be locked in
 *    "Processing…" forever.
 *  - Completed/failed runs never block (refresh / retry is legitimate).
 */
export function decideQueueRun(existingRuns: ExistingRunRow[], now = Date.now()): QueueDecision {
  const staleRunIds: string[] = [];

  for (const run of existingRuns) {
    if (run.status !== "pending" && run.status !== "processing") continue;

    if (run.status === "processing") {
      const reference = run.started_at ?? run.updated_at;
      const startedMs = reference ? new Date(reference).getTime() : NaN;
      const isStale = Number.isFinite(startedMs) && now - startedMs > STALE_PROCESSING_MS;
      if (!isStale) return { queue: false, staleRunIds: [] };
      staleRunIds.push(run.id);
      continue;
    }

    // Fresh pending run exists → blocked.
    return { queue: false, staleRunIds: [] };
  }

  return { queue: true, staleRunIds };
}

