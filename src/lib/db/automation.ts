// ============================================================================
// Prosventa Workflow Automation DB Layer
// Stage 3 — Phase 9: Intelligent Sales Automation Platform
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  Workflow,
  WorkflowInsert,
  WorkflowUpdate,
  WorkflowExecution,
  Reminder,
  AutomationSuggestion,
  ExecutionStatus,
} from "@/features/automation/types";

// ============================================================================
// Workflows
// ============================================================================

/**
 * Retrieves all workflows for the current user's organization.
 */
export async function getWorkflows(): Promise<Workflow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return [];

  const { data: workflows } = await supabase
    .from("workflows")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  return (workflows ?? []) as Workflow[];
}

/**
 * Retrieves a single workflow by ID.
 */
export async function getWorkflowById(id: string): Promise<Workflow | null> {
  const supabase = await createClient();
  const { data: workflow } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .single();

  return (workflow as Workflow) ?? null;
}

/**
 * Creates a new workflow.
 */
export async function createWorkflow(input: WorkflowInsert): Promise<{ error: string | null; workflow?: Workflow }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return { error: "Not a member of an organization." };

  try {
    const { data: workflow } = await supabase
      .from("workflows")
      .insert({
        ...input,
        organization_id: membership.organization_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (!workflow) return { error: "Failed to create workflow." };
    return { error: null, workflow: workflow as Workflow };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create workflow." };
  }
}

/**
 * Updates an existing workflow.
 */
export async function updateWorkflow(id: string, input: WorkflowUpdate): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workflows")
    .update(input)
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Duplicates a workflow.
 */
export async function duplicateWorkflow(id: string): Promise<{ error: string | null; workflow?: Workflow }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const existing = await getWorkflowById(id);
  if (!existing) return { error: "Workflow not found." };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return { error: "Not a member of an organization." };

  try {
    const { data: workflow } = await supabase
      .from("workflows")
      .insert({
        organization_id: membership.organization_id,
        created_by: user.id,
        name: `${existing.name} (Copy)`,
        description: existing.description,
        trigger_type: existing.trigger_type,
        trigger_config: existing.trigger_config,
        conditions: existing.conditions,
        actions: existing.actions,
        schedule_type: existing.schedule_type,
        schedule_config: existing.schedule_config,
        is_active: false,
        is_paused: false,
      })
      .select()
      .single();

    if (!workflow) return { error: "Failed to duplicate workflow." };
    return { error: null, workflow: workflow as Workflow };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to duplicate workflow." };
  }
}

/**
 * Deletes a workflow.
 */
export async function deleteWorkflow(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Retrieves workflow statistics for the dashboard.
 */
export async function getAutomationStats(): Promise<{
  totalWorkflows: number;
  activeWorkflows: number;
  inactiveWorkflows: number;
  pausedWorkflows: number;
  totalExecutions: number;
  totalSuccesses: number;
  totalFailures: number;
  lastRunAt: string | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { totalWorkflows: 0, activeWorkflows: 0, inactiveWorkflows: 0, pausedWorkflows: 0, totalExecutions: 0, totalSuccesses: 0, totalFailures: 0, lastRunAt: null };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { totalWorkflows: 0, activeWorkflows: 0, inactiveWorkflows: 0, pausedWorkflows: 0, totalExecutions: 0, totalSuccesses: 0, totalFailures: 0, lastRunAt: null };
  }

  const orgId = membership.organization_id;

  const [allResult, activeResult, inactiveResult, pausedResult, execResult, execSuccessResult, execFailResult] = await Promise.all([
    supabase.from("workflows").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("workflows").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_active", true),
    supabase.from("workflows").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_active", false),
    supabase.from("workflows").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_paused", true),
    supabase.from("workflow_executions").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("workflow_executions").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "success"),
    supabase.from("workflow_executions").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "failed"),
  ]);

  const { data: lastRun } = await supabase
    .from("workflows")
    .select("last_run_at")
    .eq("organization_id", orgId)
    .not("last_run_at", "is", null)
    .order("last_run_at", { ascending: false })
    .limit(1)
    .single();

  return {
    totalWorkflows: allResult.count ?? 0,
    activeWorkflows: activeResult.count ?? 0,
    inactiveWorkflows: inactiveResult.count ?? 0,
    pausedWorkflows: pausedResult.count ?? 0,
    totalExecutions: execResult.count ?? 0,
    totalSuccesses: execSuccessResult.count ?? 0,
    totalFailures: execFailResult.count ?? 0,
    lastRunAt: lastRun?.last_run_at ?? null,
  };
}

// ============================================================================
// Workflow Executions / History
// ============================================================================

/**
 * Retrieves recent workflow execution history.
 */
export async function getWorkflowExecutions(limit = 50): Promise<WorkflowExecution[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return [];

  const { data: executions } = await supabase
    .from("workflow_executions")
    .select("*, workflow:workflows(name)")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (executions ?? []) as WorkflowExecution[];
}

/**
 * Records a workflow execution entry.
 */
export async function recordWorkflowExecution(
  workflowId: string,
  orgId: string,
  prospectId: string | null,
  prospectName: string | null,
  status: ExecutionStatus,
  errorMessage?: string | null,
  durationMs?: number | null,
  metadata?: Record<string, unknown>
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflow_executions")
    .insert({
      workflow_id: workflowId,
      organization_id: orgId,
      prospect_id: prospectId,
      prospect_name: prospectName,
      status,
      error_message: errorMessage ?? null,
      duration_ms: durationMs ?? null,
      metadata: metadata ?? {},
    })
    .select("id")
    .single();

  if (error) return null;
  return data.id as string;
}

// ============================================================================
// Reminders
// ============================================================================

/**
 * Retrieves active reminders for the current user.
 */
export async function getReminders(limit = 50): Promise<Reminder[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_dismissed", false)
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  return (reminders ?? []) as Reminder[];
}

/**
 * Creates a reminder.
 */
export async function createReminderEntry(input: {
  userId: string;
  organizationId: string;
  title: string;
  body?: string;
  prospectId?: string | null;
  workflowId?: string | null;
  reminderType?: Reminder["reminder_type"];
  scheduledFor: string;
}): Promise<{ error: string | null; reminder?: Reminder }> {
  const supabase = await createClient();
  try {
    const { data: reminder } = await supabase
      .from("reminders")
      .insert({
        user_id: input.userId,
        organization_id: input.organizationId,
        title: input.title,
        body: input.body ?? null,
        prospect_id: input.prospectId ?? null,
        workflow_id: input.workflowId ?? null,
        reminder_type: input.reminderType ?? "custom",
        scheduled_for: input.scheduledFor,
      })
      .select()
      .single();

    if (!reminder) return { error: "Failed to create reminder." };
    return { error: null, reminder: reminder as Reminder };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create reminder." };
  }
}

/**
 * Marks a reminder as completed.
 */
export async function completeReminder(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ is_completed: true })
    .eq("id", id);
  return !error;
}

/**
 * Dismisses a reminder.
 */
export async function dismissReminder(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ is_dismissed: true })
    .eq("id", id);
  return !error;
}

// ============================================================================
// Smart Suggestions
// ============================================================================

/**
 * Retrieves active smart suggestions for the organization.
 */
export async function getAutomationSuggestions(): Promise<AutomationSuggestion[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return [];

  const { data: suggestions } = await supabase
    .from("automation_suggestions")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .eq("is_dismissed", false)
    .eq("is_created", false)
    .order("confidence", { ascending: false })
    .limit(10);

  return (suggestions ?? []) as AutomationSuggestion[];
}

/**
 * Marks a suggestion as dismissed.
 */
export async function dismissSuggestion(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("automation_suggestions")
    .update({ is_dismissed: true })
    .eq("id", id);
  return !error;
}

/**
 * Marks a suggestion as created (user has built a workflow from it).
 */
export async function markSuggestionCreated(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("automation_suggestions")
    .update({ is_created: true })
    .eq("id", id);
  return !error;
}