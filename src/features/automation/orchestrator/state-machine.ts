// ============================================================================
// Prosventa Automation Orchestrator — Execution State Machine (Pure Logic)
// Stage 7 — Phase 4
// ============================================================================
// Controlled state machine for automation executions. Arbitrary status strings
// are impossible: every transition must be listed in TRANSITIONS.
//
//   queued → running → completed | failed | cancelled
//   running → waiting → running          (async continuation, prepared only)
//   running ↔ paused                     (user-initiated pause/resume)
//   queued|running|paused → cancelled    (user-initiated, results preserved)
//   failed → queued                      (USER-INITIATED retry ONLY — Phase 5
//                                         Control Center; resumes from the safe
//                                         checkpoint, never re-runs completed
//                                         steps thanks to step idempotency)
//
// Terminal states: completed, failed, cancelled.
// ============================================================================

// ----------------------------------------------------------------------------
// Execution states
// ----------------------------------------------------------------------------
export type ExecutionState =
  | "queued"
  | "running"
  | "waiting"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export const EXECUTION_STATE_LABELS: Record<ExecutionState, string> = {
  queued: "Queued",
  running: "Running",
  waiting: "Waiting",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** States that will never change again. */
export const TERMINAL_STATES: readonly ExecutionState[] = [
  "completed",
  "failed",
  "cancelled",
];

export function isTerminalState(state: ExecutionState): boolean {
  return TERMINAL_STATES.includes(state);
}

// ----------------------------------------------------------------------------
// Valid transitions — anything not listed here is rejected.
// ----------------------------------------------------------------------------
export const TRANSITIONS: Record<ExecutionState, readonly ExecutionState[]> = {
  queued: ["running", "paused", "cancelled"],
  running: ["paused", "waiting", "completed", "failed", "cancelled"],
  waiting: ["running", "paused", "cancelled", "failed"],
  paused: ["running", "cancelled"],
  completed: [],
  failed: ["queued"],
  cancelled: [],
};

export function canTransition(from: ExecutionState, to: ExecutionState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Validates a transition. Returns the target state when legal, null when not.
 * Callers persist nothing when this returns null — invalid transitions are
 * structurally prevented, not merely discouraged.
 */
export function resolveTransition(
  from: ExecutionState,
  to: ExecutionState
): ExecutionState | null {
  return canTransition(from, to) ? to : null;
}

/** States from which a run may (re)start executing steps. */
export function isResumable(state: ExecutionState): boolean {
  return state === "queued" || state === "running";
}

// ----------------------------------------------------------------------------
// Step results — every step has exactly one explicit outcome
// ----------------------------------------------------------------------------

/** Maximum automatic attempts per step (1 initial + retries). */
export const MAX_STEP_ATTEMPTS = 3;

/**
 * Classifies a raw error into a controlled category, decides whether it may
 * be retried, and produces an honest user-facing message.
 *
 * Permanent (never retried): invalid configuration, missing target,
 * unavailable capability, authorization failure, limits, loop protection.
 * Transient (may be retried): provider/network/database hiccups, worker
 * interruption.
 */
export function classifyFailure(rawError: unknown): FailureClassification {
  const raw = String(rawError ?? "").toLowerCase();

  const has = (...needles: string[]) => needles.some((n) => raw.includes(n));

  // Permission / auth — permanent
  if (has("permission", "unauthorized", "forbidden", "not authenticated")) {
    return {
      retryable: false,
      category: "permission_denied",
      userMessage: "This step could not run because access was denied.",
    };
  }
  // Provider/capability — permanent until configured (checked BEFORE generic
  // "configured/required" wording so provider messages classify correctly)
  if (has("provider", "capability", "enrichment", "not configured")) {
    return {
      retryable: false,
      category: "provider_unavailable",
      userMessage:
        "This step needs an external provider that is not configured yet. Connect the provider and try again.",
    };
  }
  // Configuration problems — permanent until fixed
  if (has("invalid", "validation", "missing", "not selected", "required", "unsupported action", "config")) {
    return {
      retryable: false,
      category: "validation_error",
      userMessage:
        "This step cannot run until its configuration is corrected.",
    };
  }
  // Missing target — permanent
  if (has("not found", "no prospect", "does not exist")) {
    return {
      retryable: false,
      category: "not_found",
      userMessage: "This step could not run because its target no longer exists.",
    };
  }
  // Limits & loops — permanent
  if (has("limit", "too many", "depth", "loop")) {
    return {
      retryable: false,
      category: has("depth", "loop") ? "loop_protection" : "limit_exceeded",
      userMessage: has("depth", "loop")
        ? "This automation chain was stopped to prevent an endless loop."
        : "A safety limit was reached. Reduce the scope of this Playbook.",
    };
  }
  // Explicit cancellation — permanent, honest
  if (has("cancel")) {
    return {
      retryable: false,
      category: "cancelled",
      userMessage: "This step was cancelled before it could finish.",
    };
  }
  // Everything else is treated as potentially transient (network, DB, worker)
  return {
    retryable: true,
    category: "transient_error",
    userMessage:
      "Something went wrong while running this step. Retrying may fix it.",
  };
}

/**
 * Decides what happens after a failed step given the step's policy.
 * Defaults to the SAFEST behavior ("stop") — a failed critical step can never
 * silently appear successful.
 */
export type FailurePolicy = "stop" | "skip" | "retry";

export function resolveFailureOutcome(
  classification: FailureClassification,
  attemptCount: number,
  policy: FailurePolicy = "stop"
): { nextExecutionState: ExecutionState; shouldRetry: boolean } {
  if (!classification.retryable || policy === "stop") {
    return { nextExecutionState: "failed", shouldRetry: false };
  }
  if (policy === "skip") {
    // Skipped failures do not fail the whole automation…
    return { nextExecutionState: "running", shouldRetry: false };
  }
  // retry — bounded by MAX_STEP_ATTEMPTS
  if (attemptCount >= MAX_STEP_ATTEMPTS) {
    return { nextExecutionState: "failed", shouldRetry: false };
  }
  return { nextExecutionState: "running", shouldRetry: true };
}

export type StepResult = "success" | "skipped" | "failed" | "waiting";

export const STEP_RESULT_LABELS: Record<StepResult, string> = {
  success: "Success",
  skipped: "Skipped",
  failed: "Failed",
  waiting: "Waiting",
};

// ----------------------------------------------------------------------------
// Failure classification
// ----------------------------------------------------------------------------
export type FailureCategory =
  | "validation_error"
  | "not_found"
  | "permission_denied"
  | "provider_unavailable"
  | "capability_unsupported"
  | "limit_exceeded"
  | "loop_protection"
  | "transient_error"
  | "internal_error"
  | "cancelled";

export interface FailureClassification {
  /** Permanent failures must never be retried automatically. */
  retryable: boolean;
  category: FailureCategory;
  /** User-facing explanation. Technical details stay in logs. */
  userMessage: string;
}
