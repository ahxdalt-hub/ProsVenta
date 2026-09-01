// ============================================================================
// Prosventa Automation Orchestrator — Resumable Execution Runner
// Stage 7 — Phase 4
// ============================================================================
// Coordinates the EXISTING systems into one pipeline:
//
//   Event → Trigger matching (Phase 2) → Playbook (Phase 3) → Workflow
//     → Condition checkpoints (Phase 1 engine) → Sequential steps
//     → Step results persisted → Completed / Failed / Paused / Cancelled
//
// Reliability properties:
//   - Execution idempotency: UNIQUE (org, idempotency_key)
//   - Step idempotency: UNIQUE (execution_id, idempotency_key) — a crash after
//     an action's side effect but before bookkeeping can never double-execute
//   - Pause/resume from current_step_index checkpoint — never restarts
//   - Bounded retries with permanent-failure classification
//   - Provider capability checks before provider-backed steps
//   - Cost metadata recorded per provider-backed step (NO billing/credits)
// ============================================================================
"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createOrReuseAutomationExecution,
  getAutomationExecution,
  getStepsForPlaybook,
  hasActiveExecutionForTarget,
  transitionExecutionState,
  updateExecutionProgress,
} from "@/lib/db/automation-executions";
import { evaluateIntelligenceCondition } from "@/features/intelligence/workflows/engine";
import {
  isResumable,
  type ExecutionState,
} from "./state-machine";
import type { StepOutcome } from "./step-executor";
import { buildAutomationContext, recordStepInContext, summarizeStepOutput } from "./context";
import type { AutomationContext } from "./context-types";
import { buildExecutionIdempotencyKey } from "./idempotency";
import { executeStep, type RunnerStep } from "./step-executor";
import type { IntelligenceCondition } from "@/features/intelligence/workflows/types";

// ============================================================================
// Dispatch — Event → matching active Playbooks → queued executions
// ============================================================================

export interface PlaybookDispatchInput {
  organizationId: string;
  playbookId: string;
  playbookVersion: number;
  workflowId: string;
  workflowName: string;
  playbookName?: string;
  triggerType: string;
  eventType: string;
  eventId: string;
  originChainDepth: number;
  targetType: string;
  targetId: string | null;
  prospectId: string | null;
  prospectName: string | null;
  reason: string | null;
  payload: Record<string, unknown>;
  conditions: IntelligenceCondition[];
}

export type DispatchOutcome =
  | "queued"
  | "duplicate"
  | "concurrency_blocked"
  | "conditions_not_met"
  | "error";

/** Maximum automation chain depth (mirrors Phase 2's loop protection). */
const MAX_ORIGIN_CHAIN_DEPTH = 3;

/** Manual-run event identity: each explicit run is a NEW occurrence. */
function newManualEventKey(playbookId: string): string {
  return `playbook-manual:${playbookId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Manual entry point used by the Playbook "Run" UI. Creates and queues an
 * orchestrated execution for one prospect — same reliability guarantees as
 * event-driven runs (idempotency, checkpointing, pause/resume/cancel).
 */
export async function dispatchManualPlaybookExecution(input: {
  organizationId: string;
  playbookId: string;
  playbookVersion: number;
  workflowId: string;
  workflowName: string;
  playbookName: string;
  userId: string;
  prospectId: string;
  prospectName: string | null;
  context: Record<string, unknown>;
}): Promise<{ executionId: string | null; outcome: DispatchOutcome; error?: string }> {
  const eventId = newManualEventKey(input.playbookId);
  return dispatchPlaybookExecution({
    organizationId: input.organizationId,
    playbookId: input.playbookId,
    playbookVersion: input.playbookVersion,
    workflowId: input.workflowId,
    workflowName: input.workflowName,
    playbookName: input.playbookName,
    triggerType: "workflow.manual_triggered",
    eventType: "workflow.manual_triggered",
    eventId,
    originChainDepth: 0,
    targetType: "prospect",
    targetId: input.prospectId,
    prospectId: input.prospectId,
    prospectName: input.prospectName,
    reason: "Started manually by you.",
    payload: { ...input.context },
    conditions: [],
  });
}

/**
 * Creates (idempotently) and queues one automation execution, then runs it
 * asynchronously AFTER the HTTP response.
 */
export async function dispatchPlaybookExecution(
  input: PlaybookDispatchInput
): Promise<{ executionId: string | null; outcome: DispatchOutcome; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Trigger-level condition checkpoint — reuses the Phase 1 evaluator against
  // the normalized trigger payload. No second condition engine.
  const contextForConditions: Record<string, unknown> = {
    ...input.payload,
    ...(input.payload.new_score !== undefined ? { icp_score: input.payload.new_score } : {}),
    event_type: input.eventType,
  };
  const passed = (input.conditions ?? []).every((c) =>
    evaluateIntelligenceCondition(c, { context: contextForConditions } as never)
  );
  if (!passed) {
    return { executionId: null, outcome: "conditions_not_met" };
  }

  // Concurrency guard: one active execution per playbook per target.
  if (await hasActiveExecutionForTarget(input.workflowId, input.organizationId, input.prospectId)) {
    return { executionId: null, outcome: "concurrency_blocked" };
  }

  // Loop protection inherited from Phase 2: refuse to queue beyond depth cap.
  if (input.originChainDepth > MAX_ORIGIN_CHAIN_DEPTH) {
    return { executionId: null, outcome: "error", error: "loop_protection_max_chain_depth" };
  }

  const idempotencyKey = buildExecutionIdempotencyKey({
    organizationId: input.organizationId,
    playbookId: input.playbookId,
    playbookVersion: input.playbookVersion,
    triggerEventId: input.eventId,
    targetType: input.targetType,
    targetId: input.targetId,
  });

  const provisionalContext = buildAutomationContext({
    organizationId: input.organizationId,
    playbookId: input.playbookId,
    executionId: "",
    eventId: input.eventId,
    eventType: input.eventType,
    reason: input.reason,
    targetType: input.targetType,
    targetId: input.targetId,
    targetName: input.prospectName,
    payload: input.payload,
  });

  const { executionId, created, error } = await createOrReuseAutomationExecution({
    orgId: input.organizationId,
    workflowId: input.workflowId,
    playbookId: input.playbookId,
    playbookVersion: input.playbookVersion,
    createdBy: user?.id ?? null,
    prospectId: input.prospectId,
    prospectName: input.prospectName,
    idempotencyKey,
    originEventId: nullSafeUuid(input.eventId),
    originChainDepth: input.originChainDepth,
    context: provisionalContext as unknown as Record<string, unknown>,
    metadata: {
      reason: input.reason,
      workflow_name: input.workflowName,
      playbook_name: input.playbookName ?? input.workflowName,
      origin_type: input.originChainDepth > 0 ? "workflow_chain" : "event",
    },
  });

  if (!executionId) {
    return { executionId: null, outcome: "error", error: error ?? "execution_create_failed" };
  }
  if (!created) {
    return { executionId, outcome: "duplicate" };
  }

  // Asynchronous execution — producers stay responsive; bulk imports fan out
  // through Next.js `after()` instead of blocking the request.
  after(async () => {
    try {
      await runPlaybookExecution(executionId);
    } catch (err) {
      console.error(`[orchestrator] Run failed for execution ${executionId}:`, err);
    }
  });

  return { executionId, outcome: "queued" };
}

function nullSafeUuid(value: string | null): string | null {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

// ============================================================================
// Run loop — sequential step execution from a safe checkpoint
// ============================================================================

/**
 * Executes an automation execution from its checkpoint:
 *
 *   Load → validate → queued→running → for each remaining step:
 *   execute through the shared step executor → update context → next index
 *   → finalize (completed | failed | paused | cancelled)
 *
 * Pause and cancel are observed BETWEEN steps so the run always stops safely
 * at a step boundary without corrupting already-completed results.
 */
export async function runPlaybookExecution(executionId: string): Promise<void> {
  const execution = await getAutomationExecution(executionId);
  if (!execution) return; // Not visible (wrong org / deleted).

  const state = execution.status as ExecutionState;
  if (!isResumable(state)) return; // Terminal or paused → never start new steps.
  if (!(await transitionExecutionState(executionId, state, "running"))) return;

    const metadata = execution.metadata ?? {};
  const playbookId = (metadata.playbook_id as string) ?? "";
  const workflowName = (metadata.workflow_name as string) ?? "Automation";
  const context = execution.execution_context as AutomationContext;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const rawSteps = await getStepsForPlaybook(playbookId);
  const steps = (rawSteps as unknown as RunnerStep[]).filter((s) => s.enabled);
  if (steps.length === 0) {
    await transitionExecutionState(executionId, "running", "completed");
    return;
  }

  let currentContext: AutomationContext = { ...context, execution_id: executionId };
  let currentIndex = execution.current_step_index ?? 0;
  let failedStep: StepOutcome | null = null;

  const runStep = async (index: number, attempt: number): Promise<StepOutcome> =>
    executeStep({
      executionId,
      orgId: execution.organization_id,
      userId: user?.id ?? execution.created_by ?? "",
      workflowId: execution.workflow_id,
      workflowName,
      playbookId,
      prospectId: execution.prospect_id,
      prospectName: execution.prospect_name,
      eventType: context.trigger_event?.event_type ?? "unknown",
      eventId: context.trigger_event?.event_id ?? "",
      triggerPayload: context.trigger_payload,
      step: steps[index],
      stepIndex: index,
      context: currentContext,
      attemptCount: attempt,
    });

  while (currentIndex < steps.length) {
    // Observe pause/cancel at each step boundary.
    const live = await getAutomationExecution(executionId);
    const liveStatus = (live?.status ?? "running") as ExecutionState;
    if (liveStatus === "paused") return;
    if (liveStatus === "cancelled") return;

    const outcome = await runStepWithRetries((tries) => runStep(currentIndex, tries));
    currentContext = recordStepInContext(
      currentContext,
      currentIndex,
      summarizeStepOutput(outcome.result, outcome.output)
    );

    if (outcome.result === "waiting") {
      await updateExecutionProgress(executionId, { currentStepIndex: currentIndex, context: currentContext as unknown as Record<string, unknown> });
      await transitionExecutionState(executionId, "running", "waiting");
      return;
    }
    if (outcome.result === "failed") {
      failedStep = outcome;
      break;
    }
    currentIndex += 1;
    await updateExecutionProgress(executionId, { currentStepIndex: currentIndex, context: currentContext as unknown as Record<string, unknown> });
  }

  if (failedStep) {
    await transitionExecutionState(executionId, "running", "failed", {
      errorMessage: await failedStepMessage(executionId),
      failureCategory: "transient_error",
    });
    await notifyLifecycle(executionId, "failed");
    return;
  }

  await transitionExecutionState(executionId, "running", "completed");
  await notifyLifecycle(executionId, "completed");
}

/** Runs one step, applying bounded automatic retries for retryable failures. */
async function runStepWithRetries(
  attempt: (tries: number) => Promise<StepOutcome>,
  maxAttempts = 3
): Promise<StepOutcome> {
  let tries = 1;
  let outcome = await attempt(tries);
  while (outcome.result === "failed" && outcome.retryable && tries < maxAttempts) {
    tries += 1;
    outcome = await attempt(tries);
  }
  return outcome;
}

/** Loads the most recent meaningful failure message for the user. */
async function failedStepMessage(executionId: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("workflow_action_executions")
      .select("error")
      .eq("execution_id", executionId)
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return ((data as { error?: string | null } | null)?.error) ?? "A step of this automation failed.";
  } catch {
    return "A step of this automation failed.";
  }
}

/** Records ONE lifecycle activity + notification for the final state. */
async function notifyLifecycle(executionId: string, event: "completed" | "failed"): Promise<void> {
  try {
    const { notifyAndRecordLifecycle } = await import(
      "@/features/automation/orchestrator/control"
    );
    const execution = await getAutomationExecution(executionId);
    if (execution) await notifyAndRecordLifecycle(execution, event);
  } catch (err) {
    console.error(`[orchestrator] Lifecycle notification failed for ${executionId}:`, err);
  }
}