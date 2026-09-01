// ============================================================================
// Prosventa Playbook Engine — Server Actions
// Stage 7 — Phase 3
// ============================================================================
// The ONLY UI-facing boundary for playbooks. Execution always flows through
// triggerIntelligenceWorkflows (Phase 1 engine) — never around it.
//
// Safety properties implemented here:
//   - Activation requires validation (invalid playbooks stay Draft)
//   - Manual runs require Active status + org-scoped prospect target
//   - Dry runs evaluate conditions and build previews WITHOUT side effects
//   - Duplicate execution protection via unique trigger event ids
//   - Loop protection inherited from Phase 2 (origin chain depth)
//   - Activity entries for meaningful events only; notifications on completion
//     and failure
// ============================================================================
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordActivityEntry } from "@/lib/db/collaboration";
import {
  createPlaybookWithWorkflow,
  deletePlaybook,
  duplicatePlaybook,
  getPlaybookById,
  getPlaybookSteps,
  getWorkflowForPlaybook,
  savePlaybookDefinition,
  setPlaybookStatus,
} from "@/lib/db/playbooks";
import { dispatchManualPlaybookExecution } from "@/features/automation/orchestrator/runner";
import { evaluateIntelligenceCondition } from "@/features/intelligence/workflows/engine";
import type {
  IntelligenceCondition,
} from "@/features/intelligence/workflows/types";
import { validatePlaybook } from "./engine";
import { STEP_ACTION_CATALOG } from "./types";
import type { PlaybookDefinitionInput, PlaybookStepInput } from "./types";

export interface PlaybookActionResult {
  error: string | null;
  problems?: string[];
  playbookId?: string;
  message?: string;
}

export interface DryRunStepResult {
  title: string;
  outcome: "would_run" | "skipped_condition" | "needs_approval";
  conditionText: string | null;
}

export interface DryRunResult {
  error: string | null;
  conditionsPassed: boolean;
  steps: DryRunStepResult[];
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

function revalidatePlaybooks(playbookId?: string) {
  revalidatePath("/dashboard/automation");
  revalidatePath("/dashboard/automation/playbooks");
  if (playbookId) {
    revalidatePath(`/dashboard/automation/playbooks/${playbookId}`);
    revalidatePath(`/dashboard/automation/playbooks/${playbookId}/edit`);
  }
}

async function logPlaybookActivity(
  organizationId: string,
  actorId: string,
  playbookId: string,
  entityName: string
): Promise<void> {
  try {
    await recordActivityEntry({
      organization_id: organizationId,
      actor_id: actorId,
      action: "prospect_updated",
      entity_type: "workflow",
      entity_id: playbookId,
      entity_name: entityName,
      metadata: {},
    });
  } catch {
    // Activity is secondary — never affects the primary operation.
  }
}

// ============================================================================
// Create / Save
// ============================================================================

export async function createPlaybookAction(input: {
  name: string;
  category: string;
}): Promise<PlaybookActionResult> {
  const user = await requireUser();
  const name = input.name?.trim();
  if (!name) return { error: "Give this Playbook a name." };

  const result = await createPlaybookWithWorkflow({
    name,
    description: "",
    category: input.category,
  });
  if (result.error || !result.playbook) return { error: result.error ?? "Failed to create Playbook." };

  await logPlaybookActivity(
    result.playbook.organization_id,
    user.id,
    result.playbook.id,
    `Playbook created: ${result.playbook.name}`
  );
  revalidatePlaybooks(result.playbook.id);
  return { error: null, playbookId: result.playbook.id };
}

/** Saves a draft. Drafts may be incomplete — validation is enforced on activation. */
export async function savePlaybookDraftAction(
  playbookId: string,
  input: PlaybookDefinitionInput
): Promise<PlaybookActionResult> {
  const user = await requireUser();
  const playbook = await getPlaybookById(playbookId);
  if (!playbook) return { error: "Playbook not found." };
  if (playbook.status === "archived") return { error: "Archived Playbooks cannot be edited." };

  const steps: PlaybookStepInput[] = (input.steps ?? []).map((s) => ({
    position: s.position,
    action_type: s.action_type,
    title: s.title,
    description: s.description,
    config: s.config ?? {},
    condition: s.condition ?? null,
    requires_approval: s.requires_approval ?? false,
    enabled: s.enabled ?? true,
  }));

  const result = await savePlaybookDefinition({
    playbookId,
    name: input.name.trim(),
    description: input.description ?? "",
    category: input.category,
    icon: input.icon ?? null,
    triggerType: input.trigger_type,
    conditions: input.conditions ?? [],
    steps,
  });
  if (result.error) return { error: result.error };

  await logPlaybookActivity(
    playbook.organization_id,
    user.id,
    playbook.id,
    `Playbook updated: ${input.name.trim()} (now version ${result.version})`
  );
  revalidatePlaybooks(playbookId);
  return { error: null, message: "Draft saved." };
}

// ============================================================================
// Activate / Pause / Resume / Archive / Delete / Duplicate
// ============================================================================

export async function activatePlaybookAction(playbookId: string): Promise<PlaybookActionResult> {
  const user = await requireUser();
  const playbook = await getPlaybookById(playbookId);
  if (!playbook) return { error: "Playbook not found." };

  const [steps, workflow] = await Promise.all([
    getPlaybookSteps(playbookId),
    getWorkflowForPlaybook(playbook),
  ]);
  if (!workflow) return { error: "This Playbook's workflow could not be found." };

  const validation = validatePlaybook({
    name: playbook.name,
    category: playbook.category,
    trigger_type: workflow.trigger_type,
    conditions: ((workflow.conditions ?? []) as unknown) as IntelligenceCondition[],
    steps: steps.map((s) => ({
      action_type: s.action_type,
      config: s.config,
      condition: s.condition,
      enabled: s.enabled,
    })),
  });
  if (!validation.valid) {
    return { error: "This Playbook cannot be activated yet.", problems: validation.problems };
  }

  // Capability check: every enabled step must be currently supported.
  const unsupported = steps.filter((s) => s.enabled && !STEP_ACTION_CATALOG[s.action_type]);
  if (unsupported.length > 0) {
    return {
      error: "This Playbook cannot be activated yet.",
      problems: [
        `${unsupported.length} step(s) use actions that are no longer available. Remove or replace them first.`,
      ],
    };
  }

  const result = await setPlaybookStatus(playbookId, "active");
  if (result.error) return { error: result.error };

  await logPlaybookActivity(playbook.organization_id, user.id, playbook.id, `Playbook activated: ${playbook.name}`);
  revalidatePlaybooks(playbookId);
  return { error: null, message: "Playbook activated." };
}

export async function pausePlaybookAction(playbookId: string): Promise<PlaybookActionResult> {
  await requireUser();
  const result = await setPlaybookStatus(playbookId, "paused");
  if (result.error) return { error: result.error };
  revalidatePlaybooks(playbookId);
  return { error: null, message: "Playbook paused. It will not run automatically." };
}

export async function resumePlaybookAction(playbookId: string): Promise<PlaybookActionResult> {
  await requireUser();
  const result = await setPlaybookStatus(playbookId, "active");
  if (result.error) return { error: result.error };
  revalidatePlaybooks(playbookId);
  return { error: null, message: "Playbook resumed." };
}

export async function archivePlaybookAction(playbookId: string): Promise<PlaybookActionResult> {
  await requireUser();
  // Archiving keeps execution history intact and accessible.
  const result = await setPlaybookStatus(playbookId, "archived");
  if (result.error) return { error: result.error };
  revalidatePlaybooks(playbookId);
  return { error: null, message: "Playbook archived. Its history remains available." };
}

export async function deletePlaybookAction(playbookId: string): Promise<PlaybookActionResult> {
  await requireUser();
  const playbook = await getPlaybookById(playbookId);
  if (!playbook) return { error: "Playbook not found." };
  if (playbook.status !== "draft" && playbook.status !== "archived") {
    return { error: "Pause or archive this Playbook before deleting it." };
  }
  const result = await deletePlaybook(playbookId);
  if (result.error) return { error: result.error };
  revalidatePath("/dashboard/automation/playbooks");
  return { error: null, message: "Playbook deleted." };
}

export async function duplicatePlaybookAction(playbookId: string): Promise<PlaybookActionResult> {
  await requireUser();
  const result = await duplicatePlaybook(playbookId);
  if (result.error || !result.playbook) return { error: result.error ?? "Failed to duplicate." };
  revalidatePlaybooks(result.playbook.id);
  return { error: null, playbookId: result.playbook.id, message: "Duplicated as a new draft." };
}

// ============================================================================
// Validation-only action (used by the builder's "Validate" button)
// ============================================================================

export async function validatePlaybookAction(playbookId: string): Promise<PlaybookActionResult> {
  await requireUser();
  const playbook = await getPlaybookById(playbookId);
  if (!playbook) return { error: "Playbook not found." };

  const [steps, workflow] = await Promise.all([
    getPlaybookSteps(playbookId),
    getWorkflowForPlaybook(playbook),
  ]);

  const validation = validatePlaybook({
    name: playbook.name,
    category: playbook.category,
    trigger_type: workflow?.trigger_type ?? "",
    conditions: ((workflow?.conditions ?? []) as unknown) as IntelligenceCondition[],
    steps: steps.map((s) => ({
      action_type: s.action_type,
      config: s.config,
      condition: s.condition,
      enabled: s.enabled,
    })),
  });
  if (!validation.valid) {
    return {
      error: "This Playbook cannot be activated yet.",
      problems: validation.problems,
    };
  }
  return { error: null, message: "This Playbook is ready to activate." };
}

// ============================================================================
// Dry run — NO side effects, NO external calls, NOTHING is modified
// ============================================================================

/** Builds the condition-evaluation context for a prospect (org-scoped fetch). */
async function buildContextForProspect(
  orgId: string,
  prospectId: string
): Promise<{ prospectName: string | null; context: Record<string, unknown> } | null> {
  const supabase = await createClient();
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, name, company_name, industry, status")
    .eq("id", prospectId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!prospect) return null;
  const record = prospect as Record<string, unknown>;
  return {
    prospectName: (record.name as string) ?? null,
    context: {
      company_industry: record.industry ?? null,
      company_name: record.company_name ?? null,
      // The best available ICP-fit proxy on the prospect record today.
      icp_score: record.ai_fit_score ?? record.lead_score ?? null,
      recommendation_priority: null,
      recommendation_type: null,
      signal_importance: null,
      signal_confidence: null,
      prospect_seniority: null,
    },
  };
}

export async function dryRunPlaybookAction(
  playbookId: string,
  prospectId: string | null
): Promise<DryRunResult> {
  const auth = await requireOrgUser();
  if (!auth) return { error: "Not authenticated.", conditionsPassed: false, steps: [] };

  const playbook = await getPlaybookById(playbookId);
  if (!playbook) return { error: "Playbook not found.", conditionsPassed: false, steps: [] };

  const [steps, workflow] = await Promise.all([
    getPlaybookSteps(playbookId),
    getWorkflowForPlaybook(playbook),
  ]);
  if (!workflow) return { error: "This Playbook's workflow could not be found.", conditionsPassed: false, steps: [] };

  const context = prospectId ? (await buildContextForProspect(auth.orgId, prospectId))?.context ?? {} : {};

  const flat = ((workflow.conditions ?? []) as unknown) as IntelligenceCondition[];
  const conditionsPassed = flat.every((c) =>
    evaluateIntelligenceCondition(c, { context } as never)
  );

  const stepResults = steps
    .filter((s) => s.enabled)
    .map((s) => {
      const stepConditionOk = !s.condition || evaluateIntelligenceCondition(s.condition, { context } as never);
      return {
        title: s.title,
        outcome: (!conditionsPassed || !stepConditionOk
          ? "skipped_condition"
          : s.requires_approval
            ? "needs_approval"
            : "would_run") as DryRunStepResult["outcome"],
        conditionText: s.condition ? `${s.condition.field} ${s.condition.operator} ${s.condition.value ?? ""}` : null,
      };
    });

  return { error: null, conditionsPassed, steps: stepResults };
}

async function requireOrgUser(): Promise<{ orgId: string; userId: string } | null> {
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
// Manual execution — through the EXISTING workflow engine, never around it
// ============================================================================

export interface RunPlaybookResult {
  error: string | null;
  message?: string;
}

export async function runPlaybookAction(
  playbookId: string,
  prospectId: string
): Promise<RunPlaybookResult> {
  const auth = await requireOrgUser();
  if (!auth) return { error: "Not authenticated." };

  const playbook = await getPlaybookById(playbookId);
  if (!playbook) return { error: "Playbook not found." };
  if (playbook.status !== "active") {
    return { error: "Only Active Playbooks can be run. Activate it first." };
  }

  // Verify the target belongs to this organization (org-scoped lookup).
  const target = await buildContextForProspect(auth.orgId, prospectId);
  if (!target) return { error: "Prospect not found in your organization." };

  const workflow = await getWorkflowForPlaybook(playbook);
  if (!workflow) return { error: "This Playbook's workflow could not be found." };

  const steps = await getPlaybookSteps(playbookId);
  const runnableSteps = steps.filter(
    (s) => s.enabled && STEP_ACTION_CATALOG[s.action_type]
  );
  if (runnableSteps.length === 0) {
    return { error: "This Playbook has no runnable steps right now." };
  }

  // Dispatch through the Phase 4 ORCHESTRATOR — execution is queued, runs
  // asynchronously, and supports pause/resume/cancel + step idempotency.
  const dispatch = await dispatchManualPlaybookExecution({
    organizationId: auth.orgId,
    playbookId: playbook.id,
    playbookVersion: playbook.version,
    workflowId: playbook.workflow_id,
    workflowName: workflow.name ?? playbook.name,
    playbookName: playbook.name,
    userId: auth.userId,
    prospectId,
    prospectName: target.prospectName,
    context: target.context,
  });

  if (dispatch.outcome === "error") {
    return { error: `The Playbook could not be started. ${dispatch.error ?? ""}`.trim() };
  }
  if (dispatch.outcome === "concurrency_blocked") {
    return {
      error:
        "This Playbook is already running for this prospect. Wait for the current run to finish.",
    };
  }

  await logPlaybookActivity(
    auth.orgId,
    auth.userId,
    playbook.id,
    `Playbook executed: ${playbook.name} for ${target.prospectName ?? "a prospect"}`
  );

  revalidatePlaybooks(playbookId);
  return {
    error: null,
    message:
      dispatch.outcome === "duplicate"
        ? "A run was already in progress — showing the existing execution."
        : "Playbook started — it runs in the background and you can follow the progress below.",
  };
}




