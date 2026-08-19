// ============================================================================
// Prosventa Intelligence-Powered Workflows — DB Layer
// Stage 4 — Phase 9: Intelligence-Powered Workflows
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  IntelligenceWorkflow,
  IntelligenceExecution,
  ActionExecutionRecord,
  TaskRecord,
  TaskInsert,
  ApprovalRecord,
  IntelligenceTriggerEvent,
  IntelligenceExecutionStatus,
} from "@/features/intelligence/workflows/types";

// ============================================================================
// Authorization Helper
// ============================================================================

async function getOrgAndUser(): Promise<{ orgId: string; userId: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return null;
  return { orgId: membership.organization_id, userId: user.id };
}

// ============================================================================
// Workflow CRUD
// ============================================================================

export async function getIntelligenceWorkflows(): Promise<IntelligenceWorkflow[]> {
  const auth = await getOrgAndUser();
  if (!auth) return [];

  const supabase = await createClient();
  const { data: workflows } = await supabase
    .from("workflows")
    .select("*")
    .eq("organization_id", auth.orgId)
    .order("created_at", { ascending: false });

  return (workflows ?? []) as IntelligenceWorkflow[];
}

export async function getIntelligenceWorkflowById(id: string): Promise<IntelligenceWorkflow | null> {
  const auth = await getOrgAndUser();
  if (!auth) return null;

  const supabase = await createClient();
  const { data: workflow } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.orgId)
    .single();

  return (workflow as IntelligenceWorkflow) ?? null;
}

export async function createIntelligenceWorkflow(input: {
  name: string;
  description: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  conditions: unknown[];
  actions: unknown[];
  requires_approval: boolean;
  max_executions_per_event: number;
}): Promise<{ error: string | null; workflow?: IntelligenceWorkflow }> {
  const auth = await getOrgAndUser();
  if (!auth) return { error: "Not authenticated." };

  const supabase = await createClient();
  try {
    const { data: workflow } = await supabase
      .from("workflows")
      .insert({
        organization_id: auth.orgId,
        created_by: auth.userId,
        name: input.name,
        description: input.description,
        trigger_type: input.trigger_type,
        trigger_config: input.trigger_config,
        conditions: input.conditions,
        actions: input.actions,
        schedule_type: "event",
        schedule_config: {},
        is_active: false,
        is_paused: false,
        status: "draft",
        requires_approval: input.requires_approval,
        max_executions_per_event: input.max_executions_per_event,
      })
      .select()
      .single();

    if (!workflow) return { error: "Failed to create workflow." };
    return { error: null, workflow: workflow as IntelligenceWorkflow };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create workflow." };
  }
}

export async function updateIntelligenceWorkflow(
  id: string,
  input: {
    name?: string;
    description?: string;
    trigger_type?: string;
    trigger_config?: Record<string, unknown>;
    conditions?: unknown[];
    actions?: unknown[];
    requires_approval?: boolean;
    max_executions_per_event?: number;
    status?: string;
  }
): Promise<{ error: string | null }> {
  const auth = await getOrgAndUser();
  if (!auth) return { error: "Not authenticated." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workflows")
    .update(input)
    .eq("id", id)
    .eq("organization_id", auth.orgId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteIntelligenceWorkflow(id: string): Promise<{ error: string | null }> {
  const auth = await getOrgAndUser();
  if (!auth) return { error: "Not authenticated." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", id)
    .eq("organization_id", auth.orgId);

  if (error) return { error: error.message };
  return { error: null };
}

// ============================================================================
// Workflow Status Operations
// ============================================================================

export async function setWorkflowStatus(
  id: string,
  status: "draft" | "active" | "paused" | "archived"
): Promise<{ error: string | null }> {
  const auth = await getOrgAndUser();
  if (!auth) return { error: "Not authenticated." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workflows")
    .update({
      status,
      is_active: status === "active",
      is_paused: status === "paused",
    })
    .eq("id", id)
    .eq("organization_id", auth.orgId);

  if (error) return { error: error.message };
  return { error: null };
}

// ============================================================================
// Execution Records
// ============================================================================

export async function createExecutionRecord(input: {
  workflowId: string;
  orgId: string;
  prospectId: string | null;
  prospectName: string | null;
  triggerEventId: string;
  executionContext: Record<string, unknown>;
  createdBy: string;
  status: IntelligenceExecutionStatus;
}): Promise<{ error: string | null; executionId?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflow_executions")
    .insert({
      workflow_id: input.workflowId,
      organization_id: input.orgId,
      prospect_id: input.prospectId,
      prospect_name: input.prospectName,
      trigger_event_id: input.triggerEventId,
      execution_context: input.executionContext,
      created_by: input.createdBy,
      status: input.status,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { error: null, executionId: data.id as string };
}

export async function updateExecutionStatus(
  executionId: string,
  status: IntelligenceExecutionStatus,
  errorMessage?: string | null
): Promise<boolean> {
  const supabase = await createClient();
  const update: Record<string, unknown> = { status };
  if (status === "completed" || status === "failed" || status === "cancelled") {
    update.completed_at = new Date().toISOString();
  }
  if (errorMessage) update.error_message = errorMessage;

  const { error } = await supabase
    .from("workflow_executions")
    .update(update)
    .eq("id", executionId);

  return !error;
}

export async function getExecutionHistory(limit = 50): Promise<IntelligenceExecution[]> {
  const auth = await getOrgAndUser();
  if (!auth) return [];

  const supabase = await createClient();
  const { data: executions } = await supabase
    .from("workflow_executions")
    .select("*, workflow:workflows(name)")
    .eq("organization_id", auth.orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (executions ?? []) as IntelligenceExecution[];
}

export async function getExecutionById(executionId: string): Promise<IntelligenceExecution | null> {
  const auth = await getOrgAndUser();
  if (!auth) return null;

  const supabase = await createClient();
  const { data: execution } = await supabase
    .from("workflow_executions")
    .select("*, workflow:workflows(name)")
    .eq("id", executionId)
    .eq("organization_id", auth.orgId)
    .single();

  return (execution as IntelligenceExecution) ?? null;
}

// ============================================================================
// Action Execution Records
// ============================================================================

export async function createActionExecutionRecord(input: {
  executionId: string;
  orgId: string;
  actionType: string;
  status: string;
  actionInput: Record<string, unknown>;
}): Promise<{ error: string | null; actionExecutionId?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflow_action_executions")
    .insert({
      execution_id: input.executionId,
      organization_id: input.orgId,
      action_type: input.actionType,
      status: input.status,
      input: input.actionInput,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { error: null, actionExecutionId: data.id as string };
}

export async function updateActionExecutionStatus(
  actionExecutionId: string,
  status: string,
  output?: Record<string, unknown>,
  error?: string | null
): Promise<boolean> {
  const supabase = await createClient();
  const update: Record<string, unknown> = { status };
  if (output) update.output = output;
  if (error) update.error = error;
  if (status === "completed" || status === "failed" || status === "cancelled") {
    update.executed_at = new Date().toISOString();
  }

  const { error: dbError } = await supabase
    .from("workflow_action_executions")
    .update(update)
    .eq("id", actionExecutionId);

  return !dbError;
}

export async function getActionExecutionsForExecution(executionId: string): Promise<ActionExecutionRecord[]> {
  const auth = await getOrgAndUser();
  if (!auth) return [];

  const supabase = await createClient();
  const { data: actions } = await supabase
    .from("workflow_action_executions")
    .select("*")
    .eq("execution_id", executionId)
    .order("created_at", { ascending: true });

  return (actions ?? []) as ActionExecutionRecord[];
}

// ============================================================================
// Tasks
// ============================================================================

export async function createTaskRecord(input: TaskInsert): Promise<{ error: string | null; task?: TaskRecord }> {
  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .insert(input)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, task: task as TaskRecord };
}

export async function getTasks(limit = 50): Promise<TaskRecord[]> {
  const auth = await getOrgAndUser();
  if (!auth) return [];

  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", auth.orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (tasks ?? []) as TaskRecord[];
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskRecord["status"]
): Promise<{ error: string | null }> {
  const auth = await getOrgAndUser();
  if (!auth) return { error: "Not authenticated." };

  const supabase = await createClient();
  const update: Record<string, unknown> = { status };
  if (status === "completed") update.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId)
    .eq("organization_id", auth.orgId);

  if (error) return { error: error.message };
  return { error: null };
}

// ============================================================================
// Approvals
// ============================================================================

export async function createApprovalRecord(input: {
  executionId: string;
  orgId: string;
  workflowId: string;
  actionIndex: number;
  actionType: string;
  requestedBy: string;
  preview: Record<string, unknown>;
}): Promise<{ error: string | null; approvalId?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflow_approvals")
    .insert({
      execution_id: input.executionId,
      organization_id: input.orgId,
      workflow_id: input.workflowId,
      action_index: input.actionIndex,
      action_type: input.actionType,
      requested_by: input.requestedBy,
      preview: input.preview,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { error: null, approvalId: data.id as string };
}

export async function getPendingApprovals(): Promise<ApprovalRecord[]> {
  const auth = await getOrgAndUser();
  if (!auth) return [];

  const supabase = await createClient();
  const { data: approvals } = await supabase
    .from("workflow_approvals")
    .select("*")
    .eq("organization_id", auth.orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);

  return (approvals ?? []) as ApprovalRecord[];
}

export async function decideApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  decidedBy: string
): Promise<{ error: string | null }> {
  const auth = await getOrgAndUser();
  if (!auth) return { error: "Not authenticated." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workflow_approvals")
    .update({
      status: decision,
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
    })
    .eq("id", approvalId)
    .eq("organization_id", auth.orgId);

  if (error) return { error: error.message };
  return { error: null };
}

// ============================================================================
// Idempotency Check
// ============================================================================

export async function executionExistsForTrigger(
  workflowId: string,
  triggerEventId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workflow_executions")
    .select("id")
    .eq("workflow_id", workflowId)
    .eq("trigger_event_id", triggerEventId)
    .maybeSingle();

  return !!data;
}

// ============================================================================
// Active Workflow Lookup for Trigger
// ============================================================================

export async function getActiveWorkflowsForTrigger(
  triggerType: string,
  orgId: string
): Promise<IntelligenceWorkflow[]> {
  const supabase = await createClient();
  const { data: workflows } = await supabase
    .from("workflows")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .eq("trigger_type", triggerType);

  return (workflows ?? []) as IntelligenceWorkflow[];
}