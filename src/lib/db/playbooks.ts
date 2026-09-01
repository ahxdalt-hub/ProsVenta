// ============================================================================
// Prosventa Playbook Engine — DB Layer
// Stage 7 — Phase 3
// ============================================================================
// Organization-scoped data access for playbooks. Execution ALWAYS goes through
// the existing workflow engine (`workflows` / `workflow_executions`); this
// layer only manages playbook definitions, steps, and history views.
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import type { IntelligenceCondition, IntelligenceWorkflow } from "@/features/intelligence/workflows/types";
import {
  STEP_ACTION_CATALOG,
  type PlaybookRecord,
  type PlaybookStepInput,
  type PlaybookStepRecord,
  type PlaybookWithStats,
} from "@/features/playbooks/types";
import { STARTER_PLAYBOOKS } from "@/features/playbooks/starters";

// ============================================================================
// Authorization helper (same pattern as intelligence-workflows)
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
  return { orgId: membership.organization_id as string, userId: user.id };
}

// ============================================================================
// Reads
// ============================================================================

export async function getPlaybooks(): Promise<PlaybookWithStats[]> {
  const auth = await getOrgAndUser();
  if (!auth) return [];
  const supabase = await createClient();

  const { data: playbooks } = await supabase
    .from("playbooks")
    .select("*, workflow:workflows(execution_count, failure_count, last_run_at)")
    .eq("organization_id", auth.orgId)
    .order("created_at", { ascending: true });
  if (!playbooks?.length) return [];

  const { data: stepCounts } = await supabase
    .from("playbook_steps")
    .select("playbook_id")
    .in("playbook_id", playbooks.map((p) => p.id));
  const countByPlaybook = new Map<string, number>();
  for (const row of stepCounts ?? []) {
    countByPlaybook.set(row.playbook_id as string, (countByPlaybook.get(row.playbook_id as string) ?? 0) + 1);
  }

  return (
    playbooks as Array<
      PlaybookRecord & {
        workflow: { execution_count: number; failure_count: number; last_run_at: string | null } | null;
      }
    >
  ).map((p) => ({
    ...p,
    step_count: countByPlaybook.get(p.id) ?? 0,
    execution_count: p.workflow?.execution_count ?? 0,
    failure_count: p.workflow?.failure_count ?? 0,
    last_run_at: p.workflow?.last_run_at ?? null,
  }));
}

export async function getPlaybookById(id: string): Promise<PlaybookRecord | null> {
  const auth = await getOrgAndUser();
  if (!auth) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("playbooks")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.orgId)
    .maybeSingle();
  return (data as PlaybookRecord) ?? null;
}

/**
 * Returns playbooks whose workflow_id is in the given set. Used by the trigger
 * pipeline to route automatically-matched playbook workflows into the
 * orchestrator instead of the raw intelligence execution path.
 */
export async function getPlaybooksByWorkflowIds(
  workflowIds: string[]
): Promise<PlaybookRecord[]> {
  if (workflowIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("playbooks")
    .select("*")
    .in("workflow_id", workflowIds)
    .eq("status", "active");
  return (data as PlaybookRecord[]) ?? [];
}

/** Loads the underlying workflow row (the execution mechanism). */
export async function getWorkflowForPlaybook(
  playbook: PlaybookRecord
): Promise<IntelligenceWorkflow | null> {
  const auth = await getOrgAndUser();
  if (!auth) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", playbook.workflow_id)
    .eq("organization_id", auth.orgId)
    .maybeSingle();
  return (data as IntelligenceWorkflow) ?? null;
}

export async function getPlaybookSteps(playbookId: string): Promise<PlaybookStepRecord[]> {
  const auth = await getOrgAndUser();
  if (!auth) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("playbook_steps")
    .select("*")
    .eq("playbook_id", playbookId)
    .eq("organization_id", auth.orgId)
    .order("position", { ascending: true });
  return (data ?? []) as unknown as PlaybookStepRecord[];
}

// ============================================================================
// Writes — definition + steps + underlying workflow stay in sync
// ============================================================================

interface CreateDefinitionArgs {
  name: string;
  description: string;
  category: string;
  icon?: string | null;
  isStarter?: boolean;
}

/**
 * Creates the underlying workflow (Phase 1 infrastructure) + playbook + steps.
 * Everything starts as draft.
 */
export async function createPlaybookWithWorkflow(
  input: CreateDefinitionArgs
): Promise<{ error: string | null; playbook?: PlaybookRecord }> {
  const auth = await getOrgAndUser();
  if (!auth) return { error: "Not authenticated." };
  const supabase = await createClient();

  // 1. Underlying workflow — the ONLY execution mechanism.
  const { data: workflow, error: wfError } = await supabase
    .from("workflows")
    .insert({
      organization_id: auth.orgId,
      created_by: auth.userId,
      name: `Playbook: ${input.name}`,
      description: input.description,
      trigger_type: "workflow.manual_triggered",
      trigger_config: {},
      conditions: [],
      actions: [],
      schedule_type: "event",
      schedule_config: {},
      is_active: false,
      is_paused: false,
      status: "draft",
      requires_approval: false,
      max_executions_per_event: 1,
    })
    .select()
    .single();
  if (wfError || !workflow) return { error: wfError?.message ?? "Failed to create the Playbook." };

  // 2. Playbook record.
  const { data: playbook, error: pbError } = await supabase
    .from("playbooks")
    .insert({
      organization_id: auth.orgId,
      workflow_id: workflow.id,
      name: input.name,
      description: input.description,
      category: input.category,
      status: "draft",
      version: 1,
      icon: input.icon ?? null,
      is_starter: input.isStarter ?? false,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .single();
  if (pbError || !playbook) {
    await supabase.from("workflows").delete().eq("id", workflow.id);
    return { error: pbError?.message ?? "Failed to create the Playbook." };
  }

  return { error: null, playbook: playbook as PlaybookRecord };
}

/**
 * Replaces all steps and syncs the definition to the underlying workflow.
 * Behaviour-changing edits bump the playbook version so executions started
 * earlier keep their original version association.
 */
export async function savePlaybookDefinition(input: {
  playbookId: string;
  name: string;
  description: string;
  category: string;
  icon?: string | null;
  triggerType: string;
  conditions: IntelligenceCondition[];
  steps: PlaybookStepInput[];
}): Promise<{ error: string | null; version?: number }> {
  const auth = await getOrgAndUser();
  if (!auth) return { error: "Not authenticated." };
  const supabase = await createClient();

  const playbook = await getPlaybookById(input.playbookId);
  if (!playbook) return { error: "Playbook not found." };

  const version = playbook.version + 1;

  // Sync underlying workflow (trigger/conditions/actions derived from steps).
  const actions = input.steps
    .filter((s) => s.enabled !== false && STEP_ACTION_CATALOG[s.action_type])
    .map((s) => ({ type: s.action_type, config: s.config ?? {} }));

  const { error: wfError } = await supabase
    .from("workflows")
    .update({
      name: `Playbook: ${input.name}`,
      description: input.description,
      trigger_type: input.triggerType,
      conditions: input.conditions,
      actions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playbook.workflow_id)
    .eq("organization_id", auth.orgId);
  if (wfError) return { error: wfError.message };

  // Replace steps.
  const rows = input.steps.map((s, index) => ({
    playbook_id: playbook.id,
    organization_id: auth.orgId,
    position: index,
    action_type: s.action_type,
    title: s.title?.trim() || STEP_ACTION_CATALOG[s.action_type]?.label || s.action_type,
    description: s.description?.trim() ?? "",
    config: s.config ?? {},
    condition: s.condition ?? null,
    requires_approval: s.requires_approval ?? false,
    enabled: s.enabled ?? true,
    provider_backed: STEP_ACTION_CATALOG[s.action_type]?.providerBacked ?? false,
  }));

  const { error: delError } = await supabase
    .from("playbook_steps")
    .delete()
    .eq("playbook_id", playbook.id);
  if (delError) return { error: delError.message };

  if (rows.length > 0) {
    const { error: insError } = await supabase.from("playbook_steps").insert(rows);
    if (insError) return { error: insError.message };
  }

  const { error: updError } = await supabase
    .from("playbooks")
    .update({
      name: input.name,
      description: input.description,
      category: input.category,
      icon: input.icon ?? null,
      version,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playbook.id)
    .eq("organization_id", auth.orgId);
  if (updError) return { error: updError.message };

  return { error: null, version };
}

/** Status changes are mirrored on the underlying workflow. */
export async function setPlaybookStatus(
  playbookId: string,
  status: "draft" | "active" | "paused" | "archived"
): Promise<{ error: string | null }> {
  const auth = await getOrgAndUser();
  if (!auth) return { error: "Not authenticated." };
  const supabase = await createClient();

  const playbook = await getPlaybookById(playbookId);
  if (!playbook) return { error: "Playbook not found." };

  const { error } = await supabase
    .from("playbooks")
    .update({ status, updated_by: auth.userId, updated_at: new Date().toISOString() })
    .eq("id", playbookId)
    .eq("organization_id", auth.orgId);
  if (error) return { error: error.message };

  // Mirror onto the workflow so Phase 2's automatic trigger pipeline only ever
  // picks up Active playbooks.
  const wfActive = status === "active";
  await supabase
    .from("workflows")
    .update({
      status,
      is_active: wfActive,
      is_paused: status === "paused",
    })
    .eq("id", playbook.workflow_id);

  return { error: null };
}

/**
 * Duplicates a playbook as a DRAFT with a fresh underlying workflow.
 * Execution history is never copied.
 */
export async function duplicatePlaybook(
  sourceId: string
): Promise<{ error: string | null; playbook?: PlaybookRecord }> {
  const playbook = await getPlaybookById(sourceId);
  if (!playbook) return { error: "Playbook not found." };
  const steps = await getPlaybookSteps(sourceId);

  const created = await createPlaybookWithWorkflow({
    name: `${playbook.name} (Copy)`,
    description: playbook.description,
    category: playbook.category,
    icon: playbook.icon,
  });
  if (created.error || !created.playbook) return { error: created.error ?? "Failed to duplicate." };

  // Determine the source trigger + conditions from its workflow.
  const sourceWf = await getWorkflowForPlaybook(playbook);
  const saved = await savePlaybookDefinition({
    playbookId: created.playbook.id,
    name: `${playbook.name} (Copy)`,
    description: playbook.description,
    category: playbook.category,
    icon: playbook.icon,
    triggerType: sourceWf?.trigger_type ?? "workflow.manual_triggered",
    conditions: ((sourceWf?.conditions ?? []) as unknown) as IntelligenceCondition[],
    steps: steps.map((s) => ({
      action_type: s.action_type,
      title: s.title,
      description: s.description,
      config: s.config,
      condition: s.condition,
      requires_approval: s.requires_approval,
      enabled: s.enabled,
    })),
  });

  return saved.error ? { error: saved.error } : { error: null, playbook: created.playbook };
}

/** Hard delete — UI prefers archive for playbooks with execution history. */
export async function deletePlaybook(playbookId: string): Promise<{ error: string | null }> {
  const auth = await getOrgAndUser();
  if (!auth) return { error: "Not authenticated." };
  const supabase = await createClient();
  const playbook = await getPlaybookById(playbookId);
  if (!playbook) return { error: "Playbook not found." };
  const { error } = await supabase
    .from("playbooks")
    .delete()
    .eq("id", playbookId)
    .eq("organization_id", auth.orgId);
  return { error: error?.message ?? null };
}

// ============================================================================
// Execution history (reuses workflow_executions + per-action records)
// ============================================================================

export interface PlaybookExecutionView {
  id: string;
  prospect_name: string | null;
  prospect_id: string | null;
  status: string;
  error_message: string | null;
  playbook_version: number | null;
  reason: string | null;
  created_at: string;
  actions: Array<{
    action_type: string;
    status: string;
    error_category: string | null;
    attempt_count: number | null;
    step_index: number | null;
    error: string | null;
    output: Record<string, unknown>;
  }>;
}

export async function getPlaybookExecutions(
  playbookId: string,
  limit = 20
): Promise<PlaybookExecutionView[]> {
  const auth = await getOrgAndUser();
  if (!auth) return [];
  const supabase = await createClient();

  const { data: executions } = await supabase
    .from("workflow_executions")
    .select("*")
    .eq("organization_id", auth.orgId)
    .eq("playbook_id", playbookId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!executions?.length) return [];

  const { data: actionRows } = await supabase
    .from("workflow_action_executions")
    .select("execution_id, action_type, status, error_category, attempt_count, step_index, error, output, executed_at, created_at")
    .in("execution_id", executions.map((e) => e.id))
    .order("created_at", { ascending: true });

  const byExecution = new Map<string, Array<Record<string, unknown>>>();
  for (const row of (actionRows ?? []) as unknown as Array<Record<string, unknown>>) {
    const list = byExecution.get(row.execution_id as string) ?? [];
    list.push(row);
    byExecution.set(row.execution_id as string, list);
  }

  return executions.map((e) => {
    const record = e as Record<string, unknown>;
    const meta = (record.metadata ?? {}) as Record<string, unknown>;
    return {
      id: e.id,
      prospect_name: e.prospect_name,
      prospect_id: e.prospect_id,
      status: e.status,
      error_message: e.error_message,
      playbook_version: (record.playbook_version as number | null) ?? null,
      reason: (meta.reason as string | null) ?? null,
      created_at: e.created_at,
      actions: (byExecution.get(e.id) ?? []).map((a) => ({
        action_type: a.action_type as string,
        status: a.status as string,
        error_category: (a.error_category as string | null) ?? null,
        attempt_count: (a.attempt_count as number | null) ?? null,
        step_index: (a.step_index as number | null) ?? null,
        error: (a.error as string | null) ?? null,
        output: (a.output as Record<string, unknown> | null) ?? {},
      })),
    };
  });
}

/** Snapshots which playbook + version an execution started with. */
export async function linkExecutionToPlaybook(
  executionId: string,
  playbookId: string,
  version: number
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("workflow_executions")
    .update({ playbook_id: playbookId, playbook_version: version })
    .eq("id", executionId);
}

/** Records the human-readable "why it ran" explanation on an execution. */
export async function recordExecutionReason(executionId: string, reason: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workflow_executions")
    .select("metadata")
    .eq("id", executionId)
    .maybeSingle();
  const metadata = { ...((data?.metadata as Record<string, unknown>) ?? {}), reason };
  await supabase.from("workflow_executions").update({ metadata }).eq("id", executionId);
}

// ============================================================================
// Starter seeding — once per organization, always Draft
// ============================================================================

export async function ensureStarterPlaybooks(): Promise<void> {
  const auth = await getOrgAndUser();
  if (!auth) return;
  const supabase = await createClient();

  const { count } = await supabase
    .from("playbooks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", auth.orgId);
  if ((count ?? 0) > 0) return;

  for (const starter of STARTER_PLAYBOOKS) {
    const created = await createPlaybookWithWorkflow({
      name: starter.name,
      description: starter.description,
      category: starter.category,
      icon: starter.icon,
      isStarter: true,
    });
    if (created.error || !created.playbook) continue;

    await savePlaybookDefinition({
      playbookId: created.playbook.id,
      name: starter.name,
      description: starter.description,
      category: starter.category,
      icon: starter.icon,
      triggerType: starter.trigger_type,
      conditions: starter.conditions,
      steps: starter.steps,
    });
  }
}




