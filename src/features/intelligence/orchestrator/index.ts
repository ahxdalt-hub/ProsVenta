// ============================================================================
// Prosventa Intelligence Orchestrator — Queue, Triggers & Status
// Stage 6 — Phase 6: Intelligence Orchestration (Final Phase)
// ============================================================================
// Entry points for the unified intelligence pipeline. The rest of Prosventa
// (prospect creation, import, manual refresh) calls ONLY this module — the
// internal architecture stays invisible to clients.
//
//   queueIntelligenceRuns()      idempotent enqueue (stale-run recovery)
//   runQueuedIntelligenceRuns()  prioritized, controlled execution
//   getPipelineStatuses...       batched UI status reads (no provider calls)
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import {
  executePipelineRun,
  PIPELINE_JOB_TYPE,
  PIPELINE_PROVIDER,
} from "./runner";
import {
  decideQueueRun,
  derivePipelineState,
  parseRunMetadata,
  toUiProcessingState,
  TRIGGER_PRIORITY,
  type ExistingRunRow,
  type PipelineTrigger,
  type UiProcessingState,
} from "./state";
import type { IntelligenceJob } from "../types";

/** Prospects processed per controlled batch — protects providers on imports. */
const EXECUTION_BATCH_SIZE = 10;

/**
 * Resolves org + user strictly from the authenticated session.
 * Returns null when unauthenticated / not an organization member.
 */
export async function getOrgAndUserOrRedirect(): Promise<{
  orgId: string;
  userId: string;
} | null> {
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
// Queueing (idempotent)
// ============================================================================

/**
 * Queues pipeline runs for the given prospects by inserting pending rows into
 * the existing intelligence_jobs table.
 *
 * Idempotency:
 *  - An ACTIVE run (pending/processing) for a prospect blocks a new one.
 *  - Abandoned 'processing' runs older than STALE_PROCESSING_MS are marked
 *    failed (STALE_RUN) so the prospect can be safely re-processed.
 *
 * Never throws — callers treat queueing as best-effort.
 * Returns prospect ids that were actually queued.
 */
export async function queueIntelligenceRuns(
  prospectIds: string[],
  options?: { trigger?: PipelineTrigger }
): Promise<string[]> {
  if (prospectIds.length === 0) return [];
  const trigger: PipelineTrigger = options?.trigger ?? "retry";

  try {
    const auth = await getOrgAndUserOrRedirect();
    if (!auth) return [];

    const supabase = await createClient();

    // One batched lookup of active runs for all candidates.
    const { data: activeRuns } = await supabase
      .from("intelligence_jobs")
      .select("id, prospect_id, status, started_at, updated_at")
      .eq("organization_id", auth.orgId)
      .eq("provider", PIPELINE_PROVIDER)
      .in("status", ["pending", "processing"])
      .in("prospect_id", prospectIds);

    const byProspect = new Map<string, ExistingRunRow[]>();
    for (const row of activeRuns ?? []) {
      const list = byProspect.get(row.prospect_id as string) ?? [];
      list.push(row as unknown as ExistingRunRow);
      byProspect.set(row.prospect_id as string, list);
    }

    // Stale-recovery + duplicate prevention per prospect.
    const staleIds: string[] = [];
    const toQueue: string[] = [];
    for (const prospectId of prospectIds) {
      const decision = decideQueueRun(byProspect.get(prospectId) ?? []);
      staleIds.push(...decision.staleRunIds);
      if (decision.queue) toQueue.push(prospectId);
    }

    if (staleIds.length > 0) {
      await supabase
        .from("intelligence_jobs")
        .update({
          status: "failed",
          error_code: "STALE_RUN",
          error_message: "Processing was abandoned and has been recovered.",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: { recoveredFromStale: true },
        })
        .in("id", staleIds);
    }

    if (toQueue.length === 0) return [];

    // Single batch insert regardless of import size.
    const rows = toQueue.map((prospectId) => ({
      organization_id: auth.orgId,
      prospect_id: prospectId,
      created_by: auth.userId,
      job_type: PIPELINE_JOB_TYPE,
      provider: PIPELINE_PROVIDER,
      status: "pending" as const,
      metadata: {
        trigger,
        priority: TRIGGER_PRIORITY[trigger],
        operations: {},
      },
    }));
    const { error } = await supabase.from("intelligence_jobs").insert(rows);
    if (error) {
      console.error("[intelligence-orchestrator] Failed to queue runs:", error.message);
      return [];
    }
    return toQueue;
  } catch (error) {
    console.error("[intelligence-orchestrator] Queueing failed:", error);
    return [];
  }
}

// ============================================================================
// Execution (prioritized, controlled batching)
// ============================================================================

export interface PipelineRunSummary {
  attempted: number;
  completed: number;
  partiallyCompleted: number;
  failed: number;
}

/**
 * Executes queued pipeline runs for the given prospects in controlled batches,
 * ordered by priority (manual refresh → created → imported → retry).
 * Intended to be called from `after()` — never inside page rendering.
 */
export async function runQueuedIntelligenceRuns(
  prospectIds: string[]
): Promise<PipelineRunSummary> {
  const summary: PipelineRunSummary = {
    attempted: 0,
    completed: 0,
    partiallyCompleted: 0,
    failed: 0,
  };
  if (prospectIds.length === 0) return summary;

  try {
    const supabase = await createClient();

    // Fetch pending runs and order by recorded priority.
    const { data: jobs } = await supabase
      .from("intelligence_jobs")
      .select("*")
      .eq("provider", PIPELINE_PROVIDER)
      .eq("status", "pending")
      .in("prospect_id", prospectIds);

    const ordered = ((jobs ?? []) as IntelligenceJob[]).slice().sort((a, b) => {
      const pa = parseRunMetadata(a.metadata).priority ?? TRIGGER_PRIORITY.retry;
      const pb = parseRunMetadata(b.metadata).priority ?? TRIGGER_PRIORITY.retry;
      return pa - pb;
    });

    // Sequential execution within/across batches — no provider storms.
    for (let i = 0; i < ordered.length; i += EXECUTION_BATCH_SIZE) {
      const batch = ordered.slice(i, i + EXECUTION_BATCH_SIZE);
      for (const job of batch) {
        summary.attempted += 1;
        await executePipelineRun(job);
      }
    }

    // Derive final counts from terminal states (single batched read).
    const processedIds = ordered.map((j) => j.prospect_id as string);
    if (processedIds.length > 0) {
      const { data: finished } = await supabase
        .from("intelligence_jobs")
        .select("prospect_id, status, metadata")
        .eq("provider", PIPELINE_PROVIDER)
        .in("status", ["completed", "failed"])
        .in("prospect_id", processedIds);

      const latest = new Map<string, string>();
      for (const row of finished ?? []) {
        const pid = row.prospect_id as string;
        latest.set(pid, derivePipelineState(row.status as string, row.metadata));
      }
      for (const state of latest.values()) {
        if (state === "completed") summary.completed += 1;
        else if (state === "partially_completed") summary.partiallyCompleted += 1;
        else if (state === "failed") summary.failed += 1;
      }
    }
  } catch (error) {
    console.error("[intelligence-orchestrator] Batch execution failed:", error);
  }

  return summary;
}

// ============================================================================
// Status reads (batched — no provider calls, no N+1)
// ============================================================================

/**
 * Returns the compact UI processing state for each prospect, based on the
 * latest pipeline run in the database. Prospects with no run map to null
 * ("no data yet") — never confused with processing or failure.
 */
export async function getPipelineStatusesForProspects(
  prospectIds: string[]
): Promise<Record<string, UiProcessingState | null>> {
  const states: Record<string, UiProcessingState | null> = {};
  if (prospectIds.length === 0) return states;
  for (const id of prospectIds) states[id] = null;

  try {
    const supabase = await createClient();
    const { data: runs } = await supabase
      .from("intelligence_jobs")
      .select("prospect_id, status, metadata, created_at")
      .eq("provider", PIPELINE_PROVIDER)
      .in("prospect_id", prospectIds)
      .order("created_at", { ascending: false })
      .limit(500);

    // First (newest) row per prospect wins.
    for (const row of runs ?? []) {
      const pid = row.prospect_id as string;
      if (states[pid] !== null && states[pid] !== undefined) continue;
      if (row.status === "pending" || row.status === "processing") {
        states[pid] = "processing";
        continue;
      }
      states[pid] = toUiProcessingState(
        derivePipelineState(row.status as string, row.metadata)
      );
    }
  } catch {
    // On error, leave all states null ("unknown") — never fake a state.
  }

  return states;
}

/**
 * Returns the full pipeline state + honest progress steps for one prospect.
 * Used by the Intelligence Workspace banner.
 */
export async function getProspectPipelineDetail(prospectId: string): Promise<{
  state: ReturnType<typeof toUiProcessingState> | null;
  label: string | null;
  progress: Array<{ id: string; label: string; marker: string }>;
} | null> {
  try {
    const auth = await getOrgAndUserOrRedirect();
    if (!auth) return null;

    const supabase = await createClient();
    // Ownership check: the prospect must belong to the caller's org.
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, organization_id")
      .eq("id", prospectId)
      .single();
    if (!prospect || prospect.organization_id !== auth.orgId) return null;

    const { data: runs } = await supabase
      .from("intelligence_jobs")
      .select("status, metadata, created_at")
      .eq("provider", PIPELINE_PROVIDER)
      .eq("prospect_id", prospectId)
      .order("created_at", { ascending: false })
      .limit(1);

    const latest = (runs ?? [])[0];
    if (!latest) return null;

    const isRunning = latest.status === "processing" || latest.status === "pending";
    const meta = parseRunMetadata(latest.metadata);
    if (isRunning) {
      const { derivePipelineProgress } = await import("./state");
      return {
        state: "processing",
        label: "Prosventa is analyzing this prospect…",
        progress: derivePipelineProgress(meta, true),
      };
    }

    const state = derivePipelineState(latest.status as string, latest.metadata);
    const ui = toUiProcessingState(state);
    const labels: Record<UiProcessingState, string> = {
      ready: "Intelligence ready",
      partial: "Some intelligence couldn't be retrieved.",
      attention: "Intelligence processing needs attention.",
      processing: "Prosventa is analyzing this prospect…",
    };
    const { derivePipelineProgress } = await import("./state");
    return {
      state: ui,
      label: labels[ui],
      progress: derivePipelineProgress(meta, false),
    };
  } catch {
    return null;
  }
}

