// ============================================================================
// Prosventa Workflow Automation Server Actions
// Stage 3 — Phase 9: Intelligent Sales Automation Platform
// ============================================================================
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createWorkflow,
  updateWorkflow,
  duplicateWorkflow,
  deleteWorkflow,
  createReminderEntry,
  completeReminder,
  dismissReminder,
  dismissSuggestion,
  markSuggestionCreated,
} from "@/lib/db/automation";
import { EntitlementService } from "@/features/plans/service";
import type {
  WorkflowInsert,
  WorkflowUpdate,
  WorkflowAction,
  ReminderType,
} from "./types";

// ============================================================================
// Workflow CRUD
// ============================================================================

export async function createWorkflowAction(
  input: Omit<WorkflowInsert, "organization_id" | "created_by">
): Promise<{ error: string | null; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await createWorkflow({
    ...input,
    organization_id: "",
    created_by: user.id,
  });
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/automation");
  return { error: null, id: result.workflow?.id };
}

export async function updateWorkflowAction(
  id: string,
  input: WorkflowUpdate
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await updateWorkflow(id, input);
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/automation");
  return { error: null };
}

export async function duplicateWorkflowAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await duplicateWorkflow(id);
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/automation");
  return { error: null };
}

export async function deleteWorkflowAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await deleteWorkflow(id);
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/automation");
  return { error: null };
}

export async function toggleWorkflowAction(
  id: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Stage 8 Phase 6 — activating an automation is limited by the plan's
  // max_active_automations entitlement (server-side; authoritative).
  if (isActive) {
    try {
      const { data: workflow } = await supabase
        .from("workflows")
        .select("organization_id, is_active")
        .eq("id", id)
        .single();
      if (workflow && !workflow.is_active) {
        const decision = await EntitlementService.checkLimit(
          workflow.organization_id,
          "max_active_automations"
        );
        if (!decision.allowed) {
          return {
            error:
              decision.errorCode === "FEATURE_NOT_INCLUDED"
                ? "Your plan doesn't include active automations. View your plan to unlock them."
                : `You've reached your plan limit (${decision.currentUsage} of ${decision.limitValue} active automations). Pause another automation or view your plan for more capacity.`,
          };
        }
      }
    } catch {
      // Never block activation on entitlement infrastructure hiccups.
    }
  }

  const result = await updateWorkflow(id, { is_active: isActive });
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/automation");
  return { error: null };
}

export async function pauseWorkflowAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await updateWorkflow(id, { is_paused: true });
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/automation");
  return { error: null };
}

export async function resumeWorkflowAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await updateWorkflow(id, { is_paused: false });
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/automation");
  return { error: null };
}

// ============================================================================
// Test Workflow
// ============================================================================

/**
 * Tests a workflow against a matching prospect to verify it runs.
 * Does not persist the workflow itself, only simulates execution.
 */
export async function testWorkflowAction(
  workflow: WorkflowInsert,
  prospectId: string
): Promise<{ error: string | null; result?: { matched: boolean; success: boolean; error?: string; executed: number } }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch a prospect to test against
  const { data: prospect } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .single();

  if (!prospect) return { error: "Prospect not found." };

  // Build a simplified test context
  const testResult = await executeTest(workflow, prospect);
  return { error: null, result: testResult };
}

// Helper that runs a workflow against a prospect without side effects persistence
async function executeTest(
  workflow: WorkflowInsert,
  prospect: ProspectLike
): Promise<{ matched: boolean; success: boolean; error?: string; executed: number }> {
  // Simple condition check
  const conditionsMet = evaluateTestConditions(workflow.conditions ?? [], prospect);
  if (!conditionsMet) {
    return { matched: false, success: false, executed: 0 };
  }

  const actions = workflow.actions ?? [];
  let executed = 0;
  for (const action of actions) {
    try {
      await validateTestAction(action, prospect);
      executed++;
    } catch (error) {
      return {
        matched: true,
        success: false,
        error: error instanceof Error ? error.message : "Action failed",
        executed,
      };
    }
  }

  return { matched: true, success: true, executed };
}

// Simplified prospect type for test execution
interface ProspectLike {
  id: string;
  industry: string | null;
  country: string | null;
  lead_score: number | null;
  status: string;
  tags: string[];
  last_contacted_at: string | null;
  employee_count: number | null;
  priority: string;
  name: string;
  owner_id: string | null;
  organization_id: string;
}

// Simplified condition evaluation for testing
function evaluateTestConditions(
  conditions: Array<{ field: string; operator: string; value: string | number | null }>,
  prospect: ProspectLike
): boolean {
  return conditions.every((condition) => {
    const actualValue = getTestValue(prospect, condition.field);
    const expectedValue = condition.value;

    switch (condition.operator) {
      case "equals":
        return actualValue !== null && String(actualValue).toLowerCase() === String(expectedValue).toLowerCase();
      case "not_equals":
        return actualValue === null || String(actualValue).toLowerCase() !== String(expectedValue).toLowerCase();
      case "contains":
        return actualValue !== null && String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      case "is_set":
        return actualValue !== null && actualValue !== "" && actualValue !== undefined;
      case "is_not_set":
        return actualValue === null || actualValue === "" || actualValue === undefined;
      case "greater_than":
        return actualValue !== null && Number(actualValue) > Number(expectedValue);
      case "less_than":
        return actualValue !== null && Number(actualValue) < Number(expectedValue);
      default:
        return true;
    }
  });
}

function getTestValue(prospect: ProspectLike, field: string): string | number | null {
  switch (field) {
    case "industry":
      return prospect.industry;
    case "country":
      return prospect.country;
    case "lead_score":
      return prospect.lead_score;
    case "pipeline_stage":
    case "status":
      return prospect.status;
    case "owner":
      return prospect.owner_id;
    case "tags":
      return prospect.tags.length > 0 ? prospect.tags.join(",") : null;
    case "last_activity":
      return prospect.last_contacted_at;
    case "company_size":
      return prospect.employee_count;
    case "priority":
      return prospect.priority;
    default:
      return null;
  }
}

async function validateTestAction(action: WorkflowAction, prospect: ProspectLike): Promise<void> {
  switch (action.type) {
    case "assign_prospect":
      if (!action.config.owner_id) throw new Error("No owner selected for assignment.");
      break;
    case "create_task":
      break;
    case "add_tag":
      if (!action.config.tag) throw new Error("No tag provided.");
      break;
    case "move_pipeline_stage":
      if (!action.config.stage) throw new Error("No stage selected.");
      break;
    case "send_notification":
      break;
    case "create_reminder":
      break;
    case "archive_prospect":
      break;
    case "mark_high_priority":
      break;
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

// ============================================================================
// Reminders
// ============================================================================

export async function createReminderAction(input: {
  title: string;
  body?: string;
  prospectId?: string | null;
  reminderType?: ReminderType;
  scheduledFor: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return { error: "Not a member of an organization." };

  const result = await createReminderEntry({
    userId: user.id,
    organizationId: membership.organization_id,
    title: input.title,
    body: input.body,
    prospectId: input.prospectId,
    reminderType: input.reminderType ?? "custom",
    scheduledFor: input.scheduledFor,
  });
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/automation");
  return { error: null };
}

export async function completeReminderAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ok = await completeReminder(id);
  if (!ok) return { error: "Could not complete reminder." };

  revalidatePath("/dashboard/automation");
  return { error: null };
}

export async function dismissReminderAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ok = await dismissReminder(id);
  if (!ok) return { error: "Could not dismiss reminder." };

  revalidatePath("/dashboard/automation");
  return { error: null };
}

// ============================================================================
// Smart Suggestions
// ============================================================================

export async function dismissSuggestionAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ok = await dismissSuggestion(id);
  if (!ok) return { error: "Could not dismiss suggestion." };

  revalidatePath("/dashboard/automation");
  return { error: null };
}

export async function createFromSuggestionAction(id: string): Promise<{ error: string | null; workflowId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the suggestion
  const { data: suggestion } = await supabase
    .from("automation_suggestions")
    .select("*")
    .eq("id", id)
    .single();

  if (!suggestion) return { error: "Suggestion not found." };

  const result = await createWorkflow({
    organization_id: "",
    created_by: user.id,
    name: suggestion.title,
    description: suggestion.description,
    trigger_type: suggestion.trigger_type,
    trigger_config: {},
    conditions: suggestion.conditions ?? [],
    actions: suggestion.actions ?? [],
    schedule_type: "event",
    schedule_config: {},
    is_active: false,
    is_paused: false,
  });
  if (result.error) return { error: result.error };

  await markSuggestionCreated(id);
  revalidatePath("/dashboard/automation");
  return { error: null, workflowId: result.workflow?.id };
}