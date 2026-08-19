// ============================================================================
// Prosventa Intelligence-Powered Workflows — Server Actions
// Stage 4 — Phase 9: Intelligence-Powered Workflows
// ============================================================================
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getIntelligenceWorkflows,
  getIntelligenceWorkflowById,
  createIntelligenceWorkflow,
  updateIntelligenceWorkflow,
  deleteIntelligenceWorkflow,
  setWorkflowStatus,
  getExecutionHistory,
  getExecutionById,
  getActionExecutionsForExecution,
  getTasks,
  updateTaskStatus,
  getPendingApprovals,
  decideApproval,
} from "@/lib/db/intelligence-workflows";
import type {
  IntelligenceWorkflow,
  IntelligenceCondition,
  IntelligenceAction,
  WorkflowOperationResult,
} from "./types";

// ============================================================================
// Workflow CRUD Actions
// ============================================================================

export async function createWorkflowAction(input: {
  name: string;
  description: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  conditions: IntelligenceCondition[];
  actions: IntelligenceAction[];
  requires_approval: boolean;
  max_executions_per_event: number;
}): Promise<WorkflowOperationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "failed", message: "Not authenticated." };

  const result = await createIntelligenceWorkflow({
    ...input,
    conditions: input.conditions as unknown[],
    actions: input.actions as unknown[],
  });

  if (result.error) return { status: "failed", message: result.error };
  revalidatePath("/dashboard/automation");
  return {
    status: "completed",
    message: "Workflow created as draft. Activate it when ready.",
    workflowId: result.workflow?.id,
  };
}

export async function updateWorkflowAction(
  id: string,
  input: {
    name?: string;
    description?: string;
    trigger_type?: string;
    trigger_config?: Record<string, unknown>;
    conditions?: IntelligenceCondition[];
    actions?: IntelligenceAction[];
    requires_approval?: boolean;
    max_executions_per_event?: number;
  }
): Promise<WorkflowOperationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "failed", message: "Not authenticated." };

  const result = await updateIntelligenceWorkflow(id, {
    ...input,
    conditions: input.conditions as unknown[] | undefined,
    actions: input.actions as unknown[] | undefined,
  });

  if (result.error) return { status: "failed", message: result.error };
  revalidatePath("/dashboard/automation");
  return { status: "completed", message: "Workflow updated." };
}

export async function deleteWorkflowAction(id: string): Promise<WorkflowOperationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "failed", message: "Not authenticated." };

  const result = await deleteIntelligenceWorkflow(id);
  if (result.error) return { status: "failed", message: result.error };
  revalidatePath("/dashboard/automation");
  return { status: "completed", message: "Workflow deleted." };
}

export async function setWorkflowStatusAction(
  id: string,
  status: "draft" | "active" | "paused" | "archived"
): Promise<WorkflowOperationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "failed", message: "Not authenticated." };

  const result = await setWorkflowStatus(id, status);
  if (result.error) return { status: "failed", message: result.error };
  revalidatePath("/dashboard/automation");
  return { status: "completed", message: `Workflow ${status}.` };
}

// ============================================================================
// Read Actions
// ============================================================================

export async function getWorkflowsAction(): Promise<IntelligenceWorkflow[]> {
  return getIntelligenceWorkflows();
}

export async function getWorkflowByIdAction(id: string): Promise<IntelligenceWorkflow | null> {
  return getIntelligenceWorkflowById(id);
}

export async function getExecutionHistoryAction(limit = 50) {
  return getExecutionHistory(limit);
}

export async function getExecutionDetailsAction(executionId: string) {
  const execution = await getExecutionById(executionId);
  if (!execution) return null;
  const actions = await getActionExecutionsForExecution(executionId);
  return { execution, actions };
}

// ============================================================================
// Task Actions
// ============================================================================

export async function getTasksAction(limit = 50) {
  return getTasks(limit);
}

export async function updateTaskStatusAction(
  taskId: string,
  status: "open" | "in_progress" | "completed" | "cancelled"
): Promise<WorkflowOperationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "failed", message: "Not authenticated." };

  const result = await updateTaskStatus(taskId, status);
  if (result.error) return { status: "failed", message: result.error };
  revalidatePath("/dashboard/automation");
  return { status: "completed", message: "Task updated." };
}

// ============================================================================
// Approval Actions
// ============================================================================

export async function getPendingApprovalsAction() {
  return getPendingApprovals();
}

export async function decideApprovalAction(
  approvalId: string,
  decision: "approved" | "rejected"
): Promise<WorkflowOperationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "failed", message: "Not authenticated." };

  const result = await decideApproval(approvalId, decision, user.id);
  if (result.error) return { status: "failed", message: result.error };
  revalidatePath("/dashboard/automation");
  return { status: "completed", message: `Approval ${decision}.` };
}