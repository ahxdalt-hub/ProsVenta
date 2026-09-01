"use server";

// ============================================================================
// Prosventa Intelligence Orchestrator — Server Actions
// Stage 6 — Phase 6: Intelligence Orchestration
// ============================================================================
// Manual refresh entry point. Verifies authorization and prospect ownership,
// prevents duplicate active runs, and executes after the request responds.
// ============================================================================

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  queueIntelligenceRuns,
  getProspectPipelineDetail,
} from "./index";

/**
 * Manual "Refresh intelligence" action.
 *  - authenticated user + org membership + prospect ownership verified here
 *  - queueIntelligenceRuns prevents duplicate active runs (idempotent)
 *  - processing continues in the background via `after()`
 */
export async function refreshIntelligenceAction(
  prospectId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  try {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();
    if (!membership) return { error: "You are not a member of an organization." };

    // Prospect ownership re-verified at processing time too — queueing must
    // never become an RLS bypass.
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, organization_id")
      .eq("id", prospectId)
      .single();
    if (!prospect || prospect.organization_id !== membership.organization_id) {
      return { error: "Prospect not found." };
    }

    const queued = await queueIntelligenceRuns([prospectId], {
      trigger: "manual_refresh",
    });
    if (queued.length === 0) {
      // An active run already exists — not an error, just nothing to do.
      return { error: null };
    }

    after(async () => {
      await import("./index").then(({ runQueuedIntelligenceRuns }) =>
        runQueuedIntelligenceRuns(queued)
      );
    });

    revalidatePath("/dashboard/prospects");
    revalidatePath("/dashboard/intelligence");
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to start intelligence refresh.",
    };
  }
}

/** Read-only pipeline detail for the workspace banner. No provider calls. */
export async function getPipelineStatusAction(
  prospectId: string
): Promise<Awaited<ReturnType<typeof getProspectPipelineDetail>>> {
  return getProspectPipelineDetail(prospectId);
}
