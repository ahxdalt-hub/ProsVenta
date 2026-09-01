// ============================================================================
// Prosventa Automation Orchestrator — Server Actions
// Stage 7 — Phase 4
// ============================================================================
// The ONLY UI-facing boundary for execution control. Delegates to the
// orchestrator's control actions, which validate org membership + state.
// ============================================================================
"use server";

import { revalidatePath } from "next/cache";
import {
  cancelExecution,
  pauseExecution,
  resumeExecution,
  retryExecution,
} from "./orchestrator/control";

export async function retryExecutionAction(
  executionId: string
): Promise<{ error: string | null }> {
  const result = await retryExecution(executionId);
  if (!result.error) revalidateAutomation();
  return result;
}

export async function pauseExecutionAction(
  executionId: string
): Promise<{ error: string | null }> {
  const result = await pauseExecution(executionId);
  if (!result.error) revalidateAutomation();
  return result;
}

export async function resumeExecutionAction(
  executionId: string
): Promise<{ error: string | null }> {
  const result = await resumeExecution(executionId);
  if (!result.error) revalidateAutomation();
  return result;
}

export async function cancelExecutionAction(
  executionId: string,
  reason?: string
): Promise<{ error: string | null }> {
  const result = await cancelExecution(executionId, reason);
  if (!result.error) revalidateAutomation();
  return result;
}

function revalidateAutomation() {
  revalidatePath("/dashboard/automation", "layout");
  revalidatePath("/dashboard/automation/playbooks", "layout");
}