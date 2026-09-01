// ============================================================================
// Prosventa Workflow Trigger & Event Engine — Processing Pipeline
// Stage 7 — Phase 2
// ============================================================================
// Event → Find org-scoped active workflows → Loop/rate-limit protection
//       → Condition evaluation (flat AND + explicit AND/OR groups)
//       → Dispatch to the EXISTING execution service (idempotent per
//         workflow_id + trigger_event_id) → Record outcome.
//
// States: received → processing → matched | skipped | executed | failed
//   skipped = valid event, nothing needed to run (incl. paused/archived/no match)
//   failed  = actual processing problem (retryable, identity preserved)
// ============================================================================

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { recordActivityEntry } from "@/lib/db/collaboration";
import {
  getWorkflowEventById,
  updateWorkflowEventStatus,
} from "@/lib/db/workflow-events";
import { getActiveWorkflowsForTrigger } from "@/lib/db/intelligence-workflows";
import { getPlaybooksByWorkflowIds } from "@/lib/db/playbooks";
import { triggerIntelligenceWorkflows } from "../service";
import { dispatchPlaybookExecution } from "@/features/automation/orchestrator/runner";
import type {
  IntelligenceCondition,
  IntelligenceTriggerEvent,
  IntelligenceTriggerType,
  IntelligenceWorkflow,
  ExecutionResult,
} from "../types";
import { getEventDefinition } from "./registry";
import {
  evaluateConditionSet,
  getMatchingTriggerTypes,
  MAX_ORIGIN_CHAIN_DEPTH,
  type WorkflowConditionGroup,
} from "./engine";
import type { WorkflowEventRecord, WorkflowEventType } from "./types";

/** In-memory sliding-window rate limiter per org+event type. */
const recentEventTimestamps = new Map<string, number[]>();

function checkRateLimit(orgId: string, eventType: string, limitPerMinute: number): boolean {
  const key = `${orgId}:${eventType}`;
  const now = Date.now();
  const timestamps = (recentEventTimestamps.get(key) ?? []).filter((t) => now - t < 60_000);
  if (timestamps.length >= limitPerMinute) {
    recentEventTimestamps.set(key, timestamps); // prune
    return true;
  }
  timestamps.push(now);
  recentEventTimestamps.set(key, timestamps);
  return false;
}

async function loadMatchingWorkflows(
  eventType: WorkflowEventType,
  orgId: string
): Promise<IntelligenceWorkflow[]> {
  const candidateTypes = getMatchingTriggerTypes(eventType);
  const byId = new Map<string, IntelligenceWorkflow>();
  // Bounded queries (max 3 registry mappings) — never N+1 per event volume.
  await Promise.all(
    candidateTypes.map(async (type) => {
      const workflows = await getActiveWorkflowsForTrigger(type, orgId);
      for (const wf of workflows) byId.set(wf.id, wf);
    })
  );
  return [...byId.values()];
}

/**
 * Processes a persisted event. Safe to call again after a failure — completed
 * executions are protected by execution-level idempotency downstream.
 */
export async function processWorkflowEvent(eventId: string): Promise<void> {
  let event: WorkflowEventRecord | null = null;
  try {
    event = await getWorkflowEventById(eventId);
  } catch (err) {
    console.error("[trigger-engine] Failed to load event:", err);
    return;
  }
  if (!event) return;

  // Already terminal → nothing to do (idempotent re-delivery).
  if (!["received", "failed"].includes(event.status)) return;

  try {
    await updateWorkflowEventStatus(event.id, "processing");

    const def = getEventDefinition(event.event_type);
    if (!def || !def.enabled) {
      await updateWorkflowEventStatus(event.id, "invalid", {
        processingError: `Unregistered event type: ${event.event_type}`,
      });
      return;
    }

    const originChainDepth = Number(event.metadata?.origin_chain_depth ?? 0);

    // ---- Rate limiting -----------------------------------------------------
    if (checkRateLimit(event.organization_id, event.event_type, 100)) {
      await updateWorkflowEventStatus(event.id, "skipped", { skipReason: "rate_limited" });
      return;
    }

    // ---- Loop protection ---------------------------------------------------
    if (originChainDepth > MAX_ORIGIN_CHAIN_DEPTH) {
      await updateWorkflowEventStatus(event.id, "skipped", {
        skipReason: "loop_protection_max_chain_depth",
      });
      return;
    }

    // ---- Matching (organization-scoped, Active only) ------------------------
    const workflows = await loadMatchingWorkflows(event.event_type, event.organization_id);

    // Paused / archived / draft safety net (belt-and-braces over the query).
    const eligible = workflows.filter((wf) => wf.status === "active" && wf.is_paused !== true);
    if (eligible.length === 0) {
      await updateWorkflowEventStatus(event.id, "skipped", {
        skipReason: "no_matching_active_workflow",
      });
      return;
    }

    // ---- Build the trigger event for condition evaluation + execution ------
    const payload = event.payload ?? {};
    // Legacy alias: existing score-threshold conditions read `icp_score`.
    const context: Record<string, unknown> = {
      ...payload,
      ...(payload.new_score !== undefined ? { icp_score: payload.new_score } : {}),
      event_type: event.event_type,
    };

    const supabase = await createClient();
    const { data: prospect } = event.target_id
      ? await supabase.from("prospects").select("id, name").eq("id", event.target_id).maybeSingle()
      : { data: null };

    // Ownership verification: target must be visible under this org's RLS.
    if (event.target_type === "prospect" && event.target_id && !prospect) {
      await updateWorkflowEventStatus(event.id, "skipped", {
        skipReason: "target_not_in_organization",
      });
      return;
    }

    const triggerEvent: IntelligenceTriggerEvent = {
      eventId: event.id,
      triggerType: (getMatchingTriggerTypes(event.event_type)[0] ??
        event.event_type) as IntelligenceTriggerType,
      organizationId: event.organization_id,
      prospectId:
        def.targetType === "prospect"
          ? event.target_id
          : ((payload.prospect_id as string) ?? null),
      prospectName: (prospect as { name?: string } | null)?.name ?? null,
      recommendationId: (payload.recommendation_id as string) ?? null,
      signalId: (payload.signal_id as string) ?? null,
      scoreId: null,
      context,
      occurredAt: event.occurred_at,
    };

    // ---- Condition evaluation (Phase 1 engine + Phase 1 AND/OR groups) -----
    const matched: IntelligenceWorkflow[] = [];
    for (const wf of eligible) {
      const flat = (wf.conditions ?? []) as IntelligenceCondition[];
      const groups = ((wf as { condition_groups?: WorkflowConditionGroup[] | null })
        .condition_groups ?? null) as WorkflowConditionGroup[] | null;
      if (evaluateConditionSet(flat, groups, context).passed) matched.push(wf);
    }

    if (matched.length === 0) {
      await updateWorkflowEventStatus(event.id, "skipped", { skipReason: "conditions_not_met" });
      return;
    }

    await updateWorkflowEventStatus(event.id, "matched");

    // ---- Route playbook-backed workflows through the Phase 4 orchestrator ---
    // Playbook workflows (Phase 3) inherit the same `workflows` row, so they
    // arrive here just like intelligence workflows. We fork them to the
    // orchestrator so pause/resume/cancel, step idempotency, bounded retries,
    // and honest step results apply. Plain intelligence workflows keep using
    // the existing execution service — exactly one path for each.
    const playbookRows = await getPlaybooksByWorkflowIds(matched.map((w) => w.id));
    const playbookByWorkflow = new Map(playbookRows.map((p) => [p.workflow_id, p]));
    const intelligenceMatched = matched.filter((w) => !playbookByWorkflow.has(w.id));

    const playbookResults: string[] = [];
    for (const wf of matched) {
      const pb = playbookByWorkflow.get(wf.id);
      if (!pb) continue;
      const dispatch = await dispatchPlaybookExecution({
        organizationId: event.organization_id,
        playbookId: pb.id,
        playbookVersion: pb.version,
        workflowId: wf.id,
        workflowName: wf.name,
        playbookName: pb.name,
        triggerType: wf.trigger_type,
        eventType: event.event_type,
        eventId: event.id,
        originChainDepth,
        targetType: event.target_type ?? "prospect",
        targetId: event.target_id,
        prospectId: triggerEvent.prospectId,
        prospectName: triggerEvent.prospectName,
        reason: describeTrigger(event),
        payload,
        conditions: ((wf.conditions ?? []) as IntelligenceCondition[]),
      });
      if (dispatch.outcome === "queued") playbookResults.push(wf.id);
    }
    const playbookSecuritySkipped =
      playbookRows.length > 0 && playbookResults.length === 0 && intelligenceMatched.length === 0;

    // ---- Execute plain intelligence workflows via the EXISTING service ------
    let results: ExecutionResult[] = [];
    if (intelligenceMatched.length > 0) {
      results = await triggerIntelligenceWorkflows(triggerEvent, intelligenceMatched);
    }

    if (playbookSecuritySkipped && results.length === 0) {
      await updateWorkflowEventStatus(event.id, "skipped", {
        skipReason: "no_executions_created",
      });
      return;
    }

    if (results.some((r) => r.status === "failed")) {
      const firstError = results.find((r) => r.error)?.error ?? "workflow_execution_failed";
      await updateWorkflowEventStatus(event.id, "failed", {
        processingError: firstError.slice(0, 500),
      });
      return;
    }

    await updateWorkflowEventStatus(event.id, "executed");

    // ---- Activity: ONE meaningful entry per event, not per internal step ---
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await recordActivityEntry({
          organization_id: event.organization_id,
          actor_id: user.id,
          action: "prospect_updated",
          entity_type: "workflow",
          entity_id: (playbookRows[0] ?? matched[0]).id,
          entity_name: `${
            (playbookRows[0] ?? matched[0]).name ?? matched[0].name
          } triggered automatically`,
          metadata: {
            trigger: event.event_type,
            prospect_id: triggerEvent.prospectId,
            executions: results.length + playbookResults.length,
            reason: describeTrigger(event),
          },
        });
      }
    } catch {
      // Activity is secondary — never affects processing state.
    }
  } catch (err) {
    console.error(`[trigger-engine] Event ${eventId} processing failed:`, err);
    try {
      await updateWorkflowEventStatus(eventId, "failed", {
        processingError: String(err).slice(0, 500),
      });
    } catch {
      console.error(`[trigger-engine] Could not persist failure state for event ${eventId}.`);
    }
  }
}

/** Human-readable explanation of why an event fired (for history/activity). */
export function describeTrigger(event: WorkflowEventRecord): string {
  const def = getEventDefinition(event.event_type);
  switch (event.event_type) {
    case "prospect.score.updated": {
      const prev = event.payload?.previous_score;
      const next = event.payload?.new_score;
      return `Score changed from ${prev ?? "none"} to ${next}`;
    }
    case "signal.detected":
      return `Signal detected: ${event.payload?.signal_type ?? "unknown"}`;
    default:
      return def?.label ?? event.event_type;
  }
}

