// ============================================================================
// Prosventa Automation Orchestrator — Stuck Execution Detection (Pure Logic)
// Stage 7 — Phase 6: End-to-End Integration & Hardening
// ============================================================================
// A long-running operation is NOT a failure. An execution is only considered
// STUCK when it has been active (queued/running/waiting) with NO step activity
// for longer than the configured threshold — i.e. its worker disappeared
// (crash, deploy, lost `after()` callback) and no step has progressed since.
//
// The threshold intentionally mirrors the existing intelligence orchestrator's
// staleness concept (STALE_PROCESSING_MS) rather than inventing a new timing
// architecture. 30 minutes gives legitimate provider-backed steps generous
// room while still surfacing genuinely dead executions the same day.
//
// Stuck ≠ failed permanently: reconciled executions are marked failed with a
// RETRYABLE category so the user can safely retry from the last checkpoint.
// ============================================================================

/** How long an execution may sit without any step activity before reconciliation. */
export const STUCK_EXECUTION_MS = 30 * 60 * 1000; // 30 minutes

export type StuckCapableStatus = "queued" | "running" | "waiting";

const STUCK_CAPABLE: readonly string[] = ["queued", "running", "waiting"];

/**
 * The most recent moment this execution showed signs of life:
 * the later of its start time and its last recorded step activity.
 */
export function computeLastActivityAt(input: {
  startedAt: string | null;
  lastStepActivityAt: string | null;
}): number | null {
  const candidates = [input.startedAt, input.lastStepActivityAt]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map((v) => Date.parse(v))
    .filter((n) => Number.isFinite(n));
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

/**
 * Decides whether an ACTIVE execution is stuck.
 * Only queued/running/waiting can ever be stuck — terminal states are final
 * and paused executions are deliberately idle by user choice.
 */
export function isExecutionStuck(
  input: {
    status: string;
    startedAt: string | null;
    lastStepActivityAt: string | null;
    now?: number;
  },
  thresholdMs: number = STUCK_EXECUTION_MS
): boolean {
  if (!STUCK_CAPABLE.includes(input.status)) return false;
  const lastActivity = computeLastActivityAt(input);
  if (lastActivity === null) return false; // No timestamps → never guess.
  const now = input.now ?? Date.now();
  return now - lastActivity > thresholdMs;
}

/** User-facing explanation used when an execution is reconciled as stuck. */
export const STUCK_EXECUTION_MESSAGE =
  "This automation stopped responding before it could finish. You can retry it — it will continue from its last completed step.";
