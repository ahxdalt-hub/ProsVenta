// ============================================================================
// Prosventa Automatic Intelligence Pipeline - Stage 6 Phase 6 (delegation)
// ============================================================================
// Public entry points used by prospect creation, import and retry flows.
// Since Phase 6 this module DELEGATES to the unified intelligence
// orchestrator - the full pipeline now covers company enrichment, person
// enrichment, normalization/validation, ICP scoring, external signal
// detection and recommendation generation through the EXISTING services.
//
// Kept behavior:
//  - Lightweight: NO Redis/BullMQ/Kafka. Uses Next.js `after()` at call sites
//    so the HTTP request returns immediately while processing continues in
//    the same server process.
//  - Idempotent: duplicate active runs are never created.
//  - Org-scoped: organization is always resolved from the authenticated
//    session - never from client input. RLS is never bypassed.
//  - Failure-safe: never throws. Failures mark the run failed/partial and
//    leave the prospect itself untouched.
// ============================================================================

import { revalidatePath } from "next/cache";
import { createNotificationEntry, recordActivityEntry } from "@/lib/db/collaboration";
import {
  getOrgAndUserOrRedirect,
  queueIntelligenceRuns,
  runQueuedIntelligenceRuns,
} from "./orchestrator";
import type { PipelineTrigger } from "./orchestrator/state";

/** Batches at or above this size produce one grouped activity/notification. */
const GROUPED_EVENT_THRESHOLD = 5;

/**
 * Queues intelligence processing for the given prospects via the orchestrator.
 * Idempotent - prospects with an active pipeline run are skipped.
 * Never throws. Returns the prospect ids that were actually queued.
 */
export async function queueIntelligenceProcessing(
  prospectIds: string[],
  options?: { trigger?: PipelineTrigger }
): Promise<string[]> {
  return queueIntelligenceRuns(prospectIds, options);
}

/**
 * Runs the intelligence pipeline for the given prospect ids.
 * Intended to be called from `after()` so the triggering HTTP request
 * completes first. Records ONE grouped activity + notification for batch runs
 * (imports) - single manual prospect completions stay quiet.
 * Never throws.
 */
export async function runIntelligencePipeline(
  prospectIds: string[]
): Promise<void> {
  if (prospectIds.length === 0) return;

  try {
    const summary = await runQueuedIntelligenceRuns(prospectIds);

    // Grouped activity + notification for batch runs only - never per-prospect
    // noise. A single manually created prospect stays quiet (the score badge
    // appearing in the UI is the feedback).
    const analyzed =
      summary.completed + summary.partiallyCompleted;
    const needsAttention = summary.failed;

    if (prospectIds.length >= GROUPED_EVENT_THRESHOLD && analyzed > 0) {
      try {
        const auth = await getOrgAndUserOrRedirect();
        if (auth) {
          await recordActivityEntry({
            organization_id: auth.orgId,
            actor_id: auth.userId,
            // Existing ActivityAction value - the pipeline run follows an
            // import; one grouped user-facing event, not dozens.
            action: "import_completed",
            entity_type: "import",
            entity_id: null,
            entity_name: `${prospectIds.length} imported prospects`,
            metadata: {
              analyzed,
              failed: needsAttention,
              summary: `${analyzed} prospects analyzed${
                needsAttention > 0 ? ` · ${needsAttention} need attention` : ""
              }`,
            },
          });
          await createNotificationEntry({
            user_id: auth.userId,
            organization_id: auth.orgId,
            type: "signal_detected",
            title:
              needsAttention > 0 && analyzed === 0
                ? "Intelligence processing needs attention"
                : "Intelligence processing completed",
            body:
              needsAttention > 0
                ? `${analyzed} of ${prospectIds.length} prospects fully processed. ${needsAttention} need attention.`
                : `${analyzed} prospects processed.`,
            entity_type: null,
            entity_id: null,
            actor_id: auth.userId,
          });
        }
      } catch (activityError) {
        console.error("[intelligence-pipeline] Activity/notification recording failed:", activityError);
      }
    }

    // Refresh the Prospects table and Intelligence Command Center so newly
    // computed intelligence appears without a manual reload.
    try {
      revalidatePath("/dashboard/prospects");
      revalidatePath("/dashboard/intelligence");
    } catch {
      // revalidatePath outside an active request context is a safe no-op here.
    }
  } catch (error) {
    console.error("[intelligence-pipeline] Pipeline run failed:", error);
  }
}

