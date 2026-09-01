// ============================================================================
// Prosventa Automation Orchestrator — DB Layer
// Stage 7 — Phase 4
// ============================================================================
// Organization-scoped persistence for orchestrated automation executions.
// Reuses the EXISTING `workflow_executions` / `workflow_action_executions`
// tables (extended by migration 20260824000009) — no second execution store.
//
// Guarantees:
//   - Execution-level idempotency via UNIQUE (organization_id, idempotency_key)
//   - Step-level idempotency via UNIQUE (execution_id, idempotency_key)
//   - State transitions validated against the controlled state machine
//   - All access is org-scoped (RLS enforced underneath)
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import {
  canTransition,
  type ExecutionState,
} from "@/features/automation/orchestrator/state-machine";
import type { AutomationContext } from "@/features/automation/orchestrator/context-types";

export interface OrchestratedExecutionRecord {
  id: string;
  workflow_id: string;
  organization_id: string;
  prospect_id: string | null;
  prospect_name: string | null;
  status: string;
  error_message: string | null;
  failure_category: string | null;
  current_step_index: number;
  execution_context: AutomationContext | Record<string, unknown>;
  origin_event_id: string | null;
  origin_chain_depth: number;
  idempotency_key: string | null;
  cancel_reason: string | null;
  cancelled_by: string | null;
  created_by: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * Creates an execution OR returns the already-existing execution with the same
 * idempotency key. Duplicate events / worker retries / double submissions all
 * collapse into ONE logical execution.
 */
export async function createOrReuseAutomationExecution(input: {
  orgId: string;
  workflowId: string;
  playbookId: string;
  playbookVersion: number;
  createdBy: string | null;
  prospectId: string | null;
  prospectName: string | null;
  idempotencyKey: string;
  originEventId: string | null;
  originChainDepth: number;
  context: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<{ executionId: string | null; created: boolean; error: string | null }> {
  const supabase = await createClient();

  const row = {
    workflow_id: input.workflowId,
    organization_id: input.orgId,
    prospect_id: input.prospectId,
    prospect_name: input.prospectName,
    trigger_event_id: input.idempotencyKey, // keeps the legacy unique index happy too
    status: "queued",
    current_step_index: 0,
    execution_context: input.context,
    origin_event_id: input.originEventId,
    origin_chain_depth: input.originChainDepth,
    idempotency_key: input.idempotencyKey,
    created_by: input.createdBy,
    started_at: new Date().toISOString(),
    metadata: {
      ...(input.metadata ?? {}),
      playbook_id: input.playbookId,
      playbook_version: input.playbookVersion,
    },
  };

  const { data, error } = await supabase
    .from("workflow_executions")
    .insert(row)
    .select("id")
    .single();

  if (!error && data) {
    return { executionId: data.id as string, created: true, error: null };
  }

  // Unique violation (or race) → the identical execution already exists.
  const { data: existing } = await supabase
    .from("workflow_executions")
    .select("id")
    .eq("organization_id", input.orgId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existing) {
    return { executionId: existing.id as string, created: false, error: null };
  }
  return { executionId: null, created: false, error: error?.message ?? "insert_failed" };
}

/** Loads one execution (org-scoped via RLS). */
export async function getAutomationExecution(
  executionId: string
): Promise<OrchestratedExecutionRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workflow_executions")
    .select("*")
    .eq("id", executionId)
    .maybeSingle();
  return (data as unknown as OrchestratedExecutionRecord) ?? null;
}

/**
 * Guarded state transition: the UPDATE only applies when the row is still in
 * the expected source state AND the state machine allows the move. Invalid
 * transitions are structurally impossible.
 */
export async function transitionExecutionState(
  executionId: string,
  from: ExecutionState | string,
  to: ExecutionState,
  extra?: {
    errorMessage?: string | null;
    failureCategory?: string | null;
    cancelReason?: string | null;
    cancelledBy?: string | null;
  }
): Promise<boolean> {
  if (!canTransition(from as ExecutionState, to)) return false;

  const supabase = await createClient();
  const update: Record<string, unknown> = { status: to };
  if (to === "completed" || to === "failed" || to === "cancelled") {
    update.completed_at = new Date().toISOString();
  }
  if (extra?.errorMessage) update.error_message = extra.errorMessage.slice(0, 500);
  if (extra?.failureCategory) update.failure_category = extra.failureCategory;
  if (extra?.cancelReason) update.cancel_reason = extra.cancelReason.slice(0, 500);
  if (extra?.cancelledBy) update.cancelled_by = extra.cancelledBy;

  const { error } = await supabase
    .from("workflow_executions")
    .update(update)
    .eq("id", executionId)
    .eq("status", from);

  return !error;
}

/** Persists runner progress (checkpoint for resume + shared context). */
export async function updateExecutionProgress(
  executionId: string,
  progress: { currentStepIndex: number; context: Record<string, unknown> }
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("workflow_executions")
    .update({
      current_step_index: progress.currentStepIndex,
      execution_context: progress.context,
    })
    .eq("id", executionId);
}

export interface StepActionRecord {
  id: string;
  execution_id: string;
  action_type: string;
  status: string;
  output: Record<string, unknown>;
  error: string | null;
  error_category: string | null;
  attempt_count: number;
  step_index: number | null;
  idempotency_key: string | null;
  executed_at: string | null;
  created_at: string;
}

/** Finds an existing step record by its idempotency identity. */
export async function getStepRecordByKey(
  executionId: string,
  idempotencyKey: string
): Promise<StepActionRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workflow_action_executions")
    .select("*")
    .eq("execution_id", executionId)
    .eq("idempotency_key", idempotencyKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as StepActionRecord) ?? null;
}

/**
 * Records the START of a step attempt. If the exact step already COMPLETED
 * (worker crashed between side effect and bookkeeping), the existing record is
 * returned instead — the caller must NOT re-execute the action.
 */
export async function beginStepAttempt(input: {
  executionId: string;
  orgId: string;
  stepIndex: number;
  actionType: string;
  idempotencyKey: string;
  actionInput: Record<string, unknown>;
}): Promise<{
  record: StepActionRecord | null;
  alreadyCompleted: StepActionRecord | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workflow_action_executions")
    .insert({
      execution_id: input.executionId,
      organization_id: input.orgId,
      step_index: input.stepIndex,
      idempotency_key: input.idempotencyKey,
      action_type: input.actionType,
      status: "running",
      input: input.actionInput,
    })
    .select("*")
    .single();

  if (!error && data) {
    return { record: data as unknown as StepActionRecord, alreadyCompleted: null };
  }

  // Duplicate → fetch what already happened for this exact step.
  const existing = await getStepRecordByKey(input.executionId, input.idempotencyKey);
  if (existing?.status === "completed") {
    return { record: null, alreadyCompleted: existing };
  }
  // A previous attempt failed/was interrupted → reuse the row for the retry.
  if (existing) {
    const { data: bumped } = await supabase
      .from("workflow_action_executions")
      .update({ status: "running", attempt_count: (existing.attempt_count ?? 1) + 1 })
      .eq("id", existing.id)
      .select("*")
      .single();
    return { record: (bumped as unknown as StepActionRecord) ?? existing, alreadyCompleted: null };
  }
  return { record: null, alreadyCompleted: null };
}

/** Persists the explicit outcome of a step. */
export async function finishStepAttempt(input: {
  actionExecutionId: string;
  status: "completed" | "failed" | "skipped" | "cancelled";
  output?: Record<string, unknown>;
  error?: string | null;
  errorCategory?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const update: Record<string, unknown> = {
    status: input.status,
    executed_at: new Date().toISOString(),
  };
  if (input.output) update.output = input.output;
  if (input.error) update.error = input.error.slice(0, 500);
  if (input.errorCategory) update.error_category = input.errorCategory;
  await supabase
    .from("workflow_action_executions")
    .update(update)
    .eq("id", input.actionExecutionId);
}

/**
 * Concurrency guard: at most ONE active (non-terminal) execution per playbook
 * workflow per target prospect. Prevents two identical automations racing over
 * the same prospect without locking the whole organization.
 */
export async function hasActiveExecutionForTarget(
  workflowId: string,
  orgId: string,
  prospectId: string | null
): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase
    .from("workflow_executions")
    .select("id")
    .eq("workflow_id", workflowId)
    .eq("organization_id", orgId)
    .in("status", ["queued", "running", "waiting"])
    .limit(1);
  if (prospectId) {
    query = query.eq("prospect_id", prospectId);
  }
  const { data } = await query;
  return (data?.length ?? 0) > 0;
}

// ============================================================================
// Stuck execution reconciliation — Phase 6 hardening
// ============================================================================
// An execution whose worker vanished (crash / deploy / lost `after()` callback)
// must never remain "running" forever. Executions active with NO step activity
// beyond the staleness threshold are honestly failed with a RETRYABLE category
// so the user can safely retry from the last checkpoint. Legitimately slow
// steps (recent activity) are never touched.
//
// Runs under the requesting user's session → RLS scopes reconciliation to that
// organization automatically.
// ============================================================================

import {
  STUCK_EXECUTION_MESSAGE,
  isExecutionStuck,
} from "@/features/automation/orchestrator/stale";

export async function reconcileStuckExecutions(): Promise<number> {
  const supabase = await createClient();

  const { data: active } = await supabase
    .from("workflow_executions")
    .select("id,status,started_at")
    .in("status", ["queued", "running", "waiting"])
    .order("started_at", { ascending: true })
    .limit(50);
  if (!active || active.length === 0) return 0;

  let reconciled = 0;
  for (const exec of active as unknown as Array<{
    id: string;
    status: string;
    started_at: string | null;
  }>) {
    // Most recent sign of life across all recorded step attempts.
    const { data: lastSteps } = await supabase
      .from("workflow_action_executions")
      .select("created_at,executed_at")
      .eq("execution_id", exec.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const last = (lastSteps?.[0] ?? null) as { created_at: string; executed_at: string | null } | null;

    if (
      !isExecutionStuck({
        status: exec.status,
        startedAt: exec.started_at,
        lastStepActivityAt: last ? (last.executed_at ?? last.created_at) : null,
      })
    ) {
      continue;
    }

    const failArgs = {
      errorMessage: STUCK_EXECUTION_MESSAGE,
      failureCategory: "transient_error", // retryable — safe checkpoint resume
    };
    // `queued → failed` is not a legal direct transition; route through running
    // so the state machine's audit trail stays intact.
    if (exec.status === "queued") {
      await transitionExecutionState(exec.id, "queued", "running");
      await transitionExecutionState(exec.id, "running", "failed", failArgs);
    } else {
      await transitionExecutionState(exec.id, exec.status as never, "failed", failArgs);
    }
    reconciled += 1;

    // One meaningful attention notification per reconciled execution.
    try {
      const [{ notifyAndRecordLifecycle }, execution] = await Promise.all([
        import("@/features/automation/orchestrator/control"),
        getAutomationExecution(exec.id),
      ]);
      if (execution) await notifyAndRecordLifecycle(execution, "failed");
    } catch {
      // Notification is secondary — reconciliation already persisted.
    }
  }
  return reconciled;
}

export async function getStepsForPlaybook(playbookId: string): Promise<
  Array<{
    position: number;
    action_type: string;
    title: string;
    config: Record<string, unknown>;
    condition: unknown;
    enabled: boolean;
    provider_backed: boolean;
  }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("playbook_steps")
    .select("position, action_type, title, config, condition, enabled, provider_backed")
    .eq("playbook_id", playbookId)
    .order("position", { ascending: true });
  return (data ?? []) as unknown as Array<{
    position: number;
    action_type: string;
    title: string;
    config: Record<string, unknown>;
    condition: unknown;
    enabled: boolean;
    provider_backed: boolean;
  }>;
}


