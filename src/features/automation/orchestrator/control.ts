// ============================================================================
// Prosventa Automation Orchestrator — Control Actions (Pause/Resume/Cancel)
// Stage 7 — Phase 4
// ============================================================================
// User-initiated lifecycle controls. Honors the controlled state machine:
//
//   pause   : running|queued → paused   (preserves results; no new steps run)
//   resume  : paused → running          (continues from current_step_index)
//   cancel  : queued|running|paused → cancelled (stops future steps, keeps
//             already-completed results, records who + why)
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { recordActivityEntry, createNotificationEntry } from "@/lib/db/collaboration";
import {
  getAutomationExecution,
  transitionExecutionState,
} from "@/lib/db/automation-executions";
import type { OrchestratedExecutionRecord } from "@/lib/db/automation-executions";

async function requireActor(): Promise<{ orgId: string; userId: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();
  if (!membership) return null;
  return { orgId: membership.organization_id as string, userId: user.id };
}

/**
 * Pauses a running/queued automation. No new steps start; the checkpoint,
 * context, and completed results are all preserved.
 */
export async function pauseExecution(executionId: string): Promise<{ error: string | null }> {
  const actor = await requireActor();
  if (!actor) return { error: "Not authenticated." };

  const execution = await getAutomationExecution(executionId);
  if (!execution || execution.organization_id !== actor.orgId) {
    return { error: "Execution not found in your organization." };
  }
  if (!["queued", "running", "waiting"].includes(execution.status)) {
    return { error: "This execution cannot be paused in its current state." };
  }

  const moved = await transitionExecutionState(executionId, execution.status as never, "paused");
  if (!moved) return { error: "This execution could not be paused." };

  await recordActivityEntry({
    organization_id: actor.orgId,
    actor_id: actor.userId,
    action: "prospect_updated",
    entity_type: "workflow",
    entity_id: execution.workflow_id,
    entity_name: "Automation paused",
    metadata: { execution_id: executionId },
  }).catch(() => undefined);

  return { error: null };
}

/** Resumes a paused automation from its safe checkpoint — never restarts. */
export async function resumeExecution(executionId: string): Promise<{ error: string | null }> {
  const actor = await requireActor();
  if (!actor) return { error: "Not authenticated." };

  const execution = await getAutomationExecution(executionId);
  if (!execution || execution.organization_id !== actor.orgId) {
    return { error: "Execution not found in your organization." };
  }
  if (execution.status !== "paused") {
    return { error: "Only a paused execution can be resumed." };
  }

const moved = await transitionExecutionState(executionId, "paused", "running");
  if (!moved) return { error: "This execution could not be resumed." };

  await recordActivityEntry({
    organization_id: actor.orgId,
    actor_id: actor.userId,
    action: "prospect_updated",
    entity_type: "workflow",
    entity_id: execution.workflow_id,
    entity_name: "Automation resumed",
    metadata: { execution_id: executionId },
  }).catch(() => undefined);

  const { after } = await import("next/server");
  after(async () => {
    try {
      const { runPlaybookExecution } = await import(
        "@/features/automation/orchestrator/runner"
      );
      await runPlaybookExecution(executionId);
    } catch (err) {
      console.error(`[orchestrator] Resume run failed for ${executionId}:`, err);
    }
  });

  return { error: null };
}
/**
 * Cancels a queued/running/paused automation. Completed operations are honest —
 * already-run steps stay recorded, future steps stop, and the execution is
 * marked Cancelled (never Completed).
 */
export async function cancelExecution(
  executionId: string,
  reason?: string
): Promise<{ error: string | null }> {
  const actor = await requireActor();
  if (!actor) return { error: "Not authenticated." };

  const execution = await getAutomationExecution(executionId);
  if (!execution || execution.organization_id !== actor.orgId) {
    return { error: "Execution not found in your organization." };
  }
  if (!["queued", "running", "paused", "waiting"].includes(execution.status)) {
    return { error: "This execution has already finished and cannot be cancelled." };
  }

  const moved = await transitionExecutionState(
    executionId,
    execution.status as never,
    "cancelled",
    { cancelReason: reason ?? "Cancelled by user", cancelledBy: actor.userId }
  );
  if (!moved) return { error: "This execution could not be cancelled." };

  await recordActivityEntry({
    organization_id: actor.orgId,
    actor_id: actor.userId,
    action: "prospect_updated",
    entity_type: "workflow",
    entity_id: execution.workflow_id,
    entity_name: "Automation cancelled",
    metadata: { execution_id: executionId, reason: reason ?? null },
  }).catch(() => undefined);

  return { error: null };
}

// ============================================================================
// User retry — Phase 5 Control Center
// ============================================================================

/** Failure categories that a user retry may legitimately overcome. */
const RETRYABLE_CATEGORIES = new Set([
  "transient_error",
  "provider_unavailable",
  "internal_error",
]);

/**
 * Retries a FAILED execution through the EXISTING Phase 4 mechanism:
 * failed → queued (explicit user transition), then the runner resumes from its
 * safe checkpoint. Completed steps are never re-run (step-level idempotency);
 * the retried step reuses its record so the attempt count stays honest.
 * Execution lineage is preserved — retrying never creates a second execution.
 */
export async function retryExecution(executionId: string): Promise<{ error: string | null }> {
  const actor = await requireActor();
  if (!actor) return { error: "Not authenticated." };

  const supabase = await createClient();
  const execution = await getAutomationExecution(executionId);
  if (!execution || execution.organization_id !== actor.orgId) {
    return { error: "Execution not found in your organization." };
  }
  if (execution.status !== "failed") {
    return { error: "Only a failed execution can be retried." };
  }
  if (!RETRYABLE_CATEGORIES.has(execution.failure_category ?? "")) {
    return {
      error:
        "This failure is permanent (for example an invalid configuration). Fix the underlying problem first — retrying will not help.",
    };
  }

  const moved = await transitionExecutionState(executionId, "failed", "queued");
  if (!moved) return { error: "This execution could not be retried right now." };

  // Clear the resolved failure details so the UI reflects the fresh attempt.
  await supabase
    .from("workflow_executions")
    .update({ error_message: null, failure_category: null })
    .eq("id", executionId)
    .eq("organization_id", actor.orgId);

  await recordActivityEntry({
    organization_id: actor.orgId,
    actor_id: actor.userId,
    action: "prospect_updated",
    entity_type: "workflow",
    entity_id: execution.workflow_id,
    entity_name: "Automation retry started",
    metadata: { execution_id: executionId },
  }).catch(() => undefined);

  // Continue asynchronously through the SAME resumable runner (Phase 4).
  const { after } = await import("next/server");
  const { runPlaybookExecution } = await import("./runner");
  after(async () => {
    try {
      await runPlaybookExecution(executionId);
    } catch (err) {
      console.error(`[orchestrator] Retry failed for execution ${executionId}:`, err);
    }
  });

  return { error: null };
}

// ============================================================================
// Lifecycle activity + notifications (ONE meaningful entry per event)
// ============================================================================

/**
 * Records a single meaningful lifecycle event for the UI feed and notifies the
 * user only when their attention genuinely helps. Never floods the feed with
 * per-step worker noise.
 */
export async function notifyAndRecordLifecycle(
  execution: OrchestratedExecutionRecord,
  event: "completed" | "failed" | "cancelled"
): Promise<void> {
  const playbookName = String(
    (execution.metadata?.playbook_name ?? "Automation") ?? "Automation"
  );
  const prospectName = execution.prospect_name ?? "this prospect";

  try {
    await recordActivityEntry({
      organization_id: execution.organization_id,
      actor_id: execution.created_by ?? "",
      action: "prospect_updated",
      entity_type: "workflow",
      entity_id: execution.workflow_id,
      entity_name:
        event === "completed"
          ? `Automation completed: ${playbookName} for ${prospectName}`
          : event === "failed"
            ? `Automation failed: ${playbookName} for ${prospectName}`
            : `Automation cancelled: ${playbookName} for ${prospectName}`,
      metadata: { execution_id: execution.id, status: event },
    });
  } catch {
    // Activity is secondary — never fails the primary operation.
  }

  const isFailed = event === "failed";
  const title =
    event === "completed" ? "Automation completed" : isFailed ? "Automation needs attention" : "Automation cancelled";
  const body =
    event === "completed"
      ? `${playbookName} completed for ${prospectName}.`
      : isFailed
        ? `${playbookName} failed for ${prospectName} — review the execution details.`
        : `${playbookName} was cancelled for ${prospectName}.`;

  try {
    await createNotificationEntry({
      user_id: execution.created_by ?? "",
      organization_id: execution.organization_id,
      type: isFailed ? "system_alert" : "signal_detected",
      title,
      body,
      entity_type: "prospect",
      entity_id: execution.prospect_id,
      actor_id: execution.created_by ?? "",
    });
  } catch {
    // Notifications must never break the orchestrator.
  }
}