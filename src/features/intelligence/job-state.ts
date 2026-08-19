// ============================================================================
// Prosventa Intelligence Job State & Duplicate Prevention
// Stage 5 - Phase 1: Intelligence Foundation
// ============================================================================
// Pure helpers for intelligence job state transitions and duplicate
// prevention. These build on the existing `intelligence_jobs` table from
// Stage 4 - no new database tables are required.
//
// Future phases can use these to:
//   - Transition jobs safely (pending -> processing -> completed/failed)
//   - Prevent duplicate simultaneous jobs for the same target
//   - Decide whether existing enrichment is fresh enough to reuse
// ============================================================================

import type { IntelligenceJobStatus } from "./types";

// ============================================================================
// State Machine
// ============================================================================

export const JOB_FLOW: Record<IntelligenceJobStatus, IntelligenceJobStatus[]> = {
  pending: ["processing", "failed"],
  processing: ["completed", "failed"],
  completed: [],
  failed: ["processing"], // allow manual retry of failed jobs
};

/**
 * Determines whether a job state transition is valid.
 * Enforces the Stage 4 job state machine (pending/processing/completed/failed).
 */
export function isValidJobTransition(
  current: IntelligenceJobStatus,
  next: IntelligenceJobStatus
): boolean {
  const allowed = JOB_FLOW[current];
  return allowed?.includes(next) ?? false;
}

/**
 * Normalizes an arbitrary string into a valid job status.
 * Unknown values map to "pending" (safe default).
 */
export function normalizeJobStatus(value: string | null | undefined): IntelligenceJobStatus {
  if (value === "processing" || value === "completed" || value === "failed") {
    return value;
  }
  return "pending";
}

// ============================================================================
// Duplicate Prevention
// ============================================================================

export interface DuplicateJobCheck {
  /** Whether an active (pending/processing) job already exists */
  hasActiveJob: boolean;
  /** Whether a completed job exists for the target */
  hasCompletedJob: boolean;
  /** Id of the existing active job, when present */
  activeJobId: string | null;
  /** Whether a new job should be created */
  shouldCreate: boolean;
}

interface DuplicateJobInput {
  /** Existing jobs for the target, ordered newest first */
  existingJobs: Array<{
    id: string;
    status: IntelligenceJobStatus;
    attempt_count: number;
    max_attempts: number;
  }>;
}

/**
 * Determines whether a new intelligence job should be created for a target.
 *
 * Rules:
 *   - NEVER create a duplicate active job (pending/processing) for the same
 *     target+operation - this prevents duplicate simultaneous provider calls.
 *   - A completed job does NOT block a new explicit refresh (callers pass
 *     refresh=true to force a new job).
 *   - A failed job may be retried.
 */
export function shouldCreateJob(
  input: DuplicateJobInput,
  options?: { refresh?: boolean; maxAttempts?: number }
): DuplicateJobCheck {
  const activeJob = input.existingJobs.find(
    (j) => j.status === "pending" || j.status === "processing"
  );

  const completedJob = input.existingJobs.find((j) => j.status === "completed");
  const hasFailedExhausted = input.existingJobs.some(
    (j) => j.status === "failed" && j.attempt_count >= j.max_attempts
  );

  if (activeJob) {
    return {
      hasActiveJob: true,
      hasCompletedJob: Boolean(completedJob),
      activeJobId: activeJob.id,
      shouldCreate: false,
    };
  }

  const forceRefresh = Boolean(options?.refresh);

  return {
    hasActiveJob: false,
    hasCompletedJob: Boolean(completedJob),
    activeJobId: null,
    shouldCreate: forceRefresh || !completedJob || hasFailedExhausted,
  };
}

// ============================================================================
// Freshness Wrapper
// ============================================================================
// Convenience bridge between the existing enrichment records (`enriched_at`)
// and the normalized freshness model. Future phases can call this instead of
// reimplementing "is this data fresh?" logic per feature.
// ============================================================================

import { checkFreshness, DEFAULT_INTELLIGENCE_MAX_AGE_MS } from "./normalized";

export interface FreshnessEnrichmentInput {
  /** ISO timestamp of the existing enrichment (null when none) */
  enrichedAt: string | null;
  /** Whether the existing record is in a usable (completed) state */
  isUsable: boolean;
  /** Maximum tolerated age in milliseconds */
  maxAgeMs?: number;
  /** Now - injectable for tests */
  now?: number;
}

/**
 * Combines record availability + freshness into a single decision.
 * "Use existing enrichment if it is fresh" or "force refresh".
 */
export function shouldUseExistingEnrichment(
  input: FreshnessEnrichmentInput
): { useExisting: boolean; reason: "fresh" | "missing" | "stale" | "unusable" } {
  if (!input.isUsable) {
    return { useExisting: false, reason: "unusable" };
  }

  const freshness = checkFreshness({
    retrievedAt: input.enrichedAt,
    maxAgeMs: input.maxAgeMs ?? DEFAULT_INTELLIGENCE_MAX_AGE_MS,
    now: input.now,
  });

  if (freshness.isFresh) {
    return { useExisting: true, reason: "fresh" };
  }

  if (input.enrichedAt === null) {
    return { useExisting: false, reason: "missing" };
  }

  return { useExisting: false, reason: "stale" };
}