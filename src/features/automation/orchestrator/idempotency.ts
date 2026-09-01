// ============================================================================
// Prosventa Automation Orchestrator — Idempotency Keys (Pure Logic)
// Stage 7 — Phase 4
// ============================================================================
// Deterministic identity for executions and steps so retries can NEVER cause
// duplicate side effects:
//
//   execution: org + playbook + version + trigger_event + target
//   step:      execution + step index (+ action identity)
//
// Keys are enforced by UNIQUE partial indexes in the database — duplicates are
// structurally impossible, not just discouraged.
// ============================================================================

import { createHash } from "crypto";

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

/**
 * Execution-level idempotency identity.
 * The same automation for the same event and target always maps to the SAME
 * key → one logical execution, regardless of worker/event/network retries.
 * `attemptSalt` is only used when the workflow EXPLICITLY permits re-runs
 * (e.g. manual runs), never by automatic retries.
 */
export function buildExecutionIdempotencyKey(input: {
  organizationId: string;
  playbookId: string;
  playbookVersion: number;
  triggerEventId: string;
  targetType: string;
  targetId: string | null;
  attemptSalt?: string | null;
}): string {
  const base = [
    input.organizationId,
    input.playbookId,
    input.playbookVersion,
    input.triggerEventId,
    input.targetType,
    input.targetId ?? "-",
  ].join("|");
  return input.attemptSalt ? `${shortHash(base)}:${shortHash(input.attemptSalt)}` : shortHash(base);
}

/** Step-level idempotency identity within an execution. */
export function buildStepIdempotencyKey(input: {
  executionId: string;
  stepIndex: number;
  actionType: string;
}): string {
  return shortHash(`${input.executionId}|${input.stepIndex}|${input.actionType}`);
}
