"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProspectStatus, updateProspect, createProspect, deleteProspect } from "@/lib/db/prospects";
import { createProspectNote, deleteProspectNote } from "@/lib/db/notes";
import { removeFromList, addToListMany } from "@/lib/db/lists";
import { EntitlementService } from "@/features/plans/service";
import type { ProspectPriority, ProspectStatus } from "@/types/database";

// ============================================================================
// Prospect CRUD Actions
// ============================================================================

/**
 * Creates a new prospect manually.
 * Derives the organization_id from the authenticated user's membership.
 */
export async function createProspectAction(
  input: {
    company_name: string;
    website?: string;
    industry?: string;
    country?: string;
    city?: string;
    location?: string;
    description?: string;
    employee_count?: number;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
  }
): Promise<{ error: string | null; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!input.company_name.trim()) {
    return { error: "Company name is required." };
  }

  const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return { error: "You are not a member of an organization." };
    }

  // Stage 8 Phase 6 — server-side plan limit enforcement (authoritative).
  try {
    const decision = await EntitlementService.checkLimit(
      membership.organization_id,
      "max_prospects"
    );
    if (!decision.allowed) {
      return {
        error:
          decision.errorCode === "FEATURE_NOT_INCLUDED"
            ? "Your plan doesn't include prospect management. Upgrade your plan to add prospects."
            : `You've reached your plan limit (${decision.currentUsage} of ${decision.limitValue} prospects). View your plan to get more capacity.`,
      };
    }
  } catch {
    // Entitlement resolution must never block core CRUD on infrastructure
    // hiccups — RLS + DB constraints remain authoritative.
  }

  try {
    const prospect = await createProspect({
      organization_id: membership.organization_id,
      name: input.company_name.trim(),
      company_name: input.company_name.trim(),
      website: input.website?.trim() || null,
      industry: input.industry?.trim() || null,
      country: input.country?.trim() || null,
      city: input.city?.trim() || null,
      location: input.location?.trim() || null,
      description: input.description?.trim() || null,
      employee_count: input.employee_count ?? null,
      contact_name: input.contact_name?.trim() || null,
      contact_email: input.contact_email?.trim() || null,
      contact_phone: input.contact_phone?.trim() || null,
      source: "manual",
      status: "new",
    });

    if (!prospect) {
      return { error: "Failed to create prospect." };
    }

    // Stage 5 Task 4: automatic intelligence processing. Secondary operation —
    // a scoring failure must never prevent the prospect from being created.
    // The job is queued synchronously (cheap) and executed after this request
    // responds via Next.js `after()` — no blocking intelligence work.
    try {
      const { queueIntelligenceProcessing, runIntelligencePipeline } = await import(
        "@/features/intelligence/pipeline"
      );
      const { after } = await import("next/server");
      const queuedIds = await queueIntelligenceProcessing([prospect.id], {
        trigger: "prospect_created",
      });
      if (queuedIds.length > 0) {
        after(async () => {
          await runIntelligencePipeline(queuedIds);
        });
      }
    } catch (scoringError) {
      console.error("[createProspectAction] Intelligence queueing failed:", scoringError);
    }

    revalidatePath("/dashboard/prospects");
    return { error: null, id: prospect.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create prospect.",
    };
  }
}

/**
 * Retries automatic intelligence processing for a prospect whose scoring
 * previously failed. Uses the existing pipeline queue — idempotent and
 * org-scoped via RLS. Processing runs after the request responds.
 */
export async function retryIntelligenceAction(
  prospectId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  try {
    const { queueIntelligenceProcessing, runIntelligencePipeline } = await import(
      "@/features/intelligence/pipeline"
    );
    const { after } = await import("next/server");

    // Verify the prospect belongs to the user's organization before queueing.
        const { data: membership } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!membership) return { error: "You are not a member of an organization." };

    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, organization_id")
      .eq("id", prospectId)
      .single();
    if (!prospect || prospect.organization_id !== membership.organization_id) {
      return { error: "Prospect not found." };
    }

    const queuedIds = await queueIntelligenceProcessing([prospectId]);
    if (queuedIds.length > 0) {
      after(async () => {
        await runIntelligencePipeline(queuedIds);
      });
    }

    revalidatePath("/dashboard/prospects");
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to retry intelligence processing.",
    };
  }
}

/**
 * Deletes a prospect.
 * RLS ensures users can only delete prospects in their organization.
 */
export async function deleteProspectAction(
  prospectId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  try {
    const ok = await deleteProspect(prospectId);
    if (!ok) {
      return { error: "Could not delete prospect." };
    }
    revalidatePath("/dashboard/prospects");
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete prospect.",
    };
  }
}

// ============================================================================
// Status Actions
// ============================================================================

/**
 * Updates a prospect's status (new / reviewed / saved / archived).
 * RLS ensures users can only update prospects in their organization.
 */
export async function changeProspectStatus(
  prospectId: string,
  status: ProspectStatus
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  try {
    await updateProspectStatus(prospectId, status);
    revalidatePath("/dashboard/prospects");
    revalidatePath(`/dashboard/prospects/${prospectId}`);
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update prospect status.",
    };
  }
}

/**
 * Updates a prospect's priority (low / medium / high / urgent).
 */
export async function changeProspectPriority(
  prospectId: string,
  priority: ProspectPriority
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  try {
    await updateProspect(prospectId, { priority });
    revalidatePath("/dashboard/prospects");
    revalidatePath(`/dashboard/prospects/${prospectId}`);
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update prospect priority.",
    };
  }
}

/**
 * Updates a prospect's tags.
 */
export async function updateProspectTags(
  prospectId: string,
  tags: string[]
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  try {
    await updateProspect(prospectId, { tags });
    revalidatePath("/dashboard/prospects");
    revalidatePath(`/dashboard/prospects/${prospectId}`);
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update prospect tags.",
    };
  }
}

/**
 * Updates a prospect's contact information.
 */
export async function updateProspectContact(
  prospectId: string,
  contact: {
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  try {
    await updateProspect(prospectId, contact);
    revalidatePath("/dashboard/prospects");
    revalidatePath(`/dashboard/prospects/${prospectId}`);
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update prospect contact.",
    };
  }
}

// ============================================================================
// Note Actions
// ============================================================================

/**
 * Adds a note to a prospect.
 * RLS scopes the note to the authenticated user.
 */
export async function addProspectNote(
  prospectId: string,
  content: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!content.trim()) {
    return { error: "Note content is required." };
  }

  try {
    await createProspectNote({
      prospect_id: prospectId,
      user_id: user.id,
      content: content.trim(),
    });
    revalidatePath(`/dashboard/prospects/${prospectId}`);
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to add note.",
    };
  }
}

/**
 * Deletes a note.
 * RLS ensures users can only delete notes they created.
 */
export async function removeProspectNote(
  noteId: string,
  prospectId?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  try {
    const ok = await deleteProspectNote(noteId);
    if (!ok) {
      return { error: "Note could not be deleted." };
    }
    if (prospectId) {
      revalidatePath(`/dashboard/prospects/${prospectId}`);
    }
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete note.",
    };
  }
}

// ============================================================================
// Saved List Actions
// ============================================================================

/**
 * Adds a prospect to a saved list.
 * RLS ensures both the list and prospect belong to the user's organization.
 */
export async function saveProspectToList(
  listId: string,
  prospectId: string
): Promise<{ error: string | null }> {
  if (!listId || !prospectId) {
    return { error: "Could not save prospect to list." };
  }
  const result = await saveProspectsToListAction(listId, [prospectId]);
  return { error: result.error };
}

/**
 * Adds MULTIPLE prospects to a saved list in ONE round trip (Phase 6).
 * Idempotent — already-member prospects are skipped, never duplicated
 * (unique_list_prospect + upsert ignoreDuplicates are the final protection).
 * RLS ensures both the list and prospects belong to the user's organization.
 */
export async function saveProspectsToListAction(
  listId: string,
  prospectIds: string[]
): Promise<{ error: string | null; added: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!listId || prospectIds.length === 0) {
    return { error: "Nothing to save.", added: 0 };
  }

  try {
    const ok = await addToListMany(listId, prospectIds);
    if (!ok) {
      return { error: "Could not save prospects to list.", added: 0 };
    }
    revalidatePath(`/dashboard/saved-lists/${listId}`);
    revalidatePath("/dashboard/saved-lists");
    for (const prospectId of prospectIds) {
      revalidatePath(`/dashboard/prospects/${prospectId}`);
    }
    return { error: null, added: prospectIds.length };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to save prospects to list.",
      added: 0,
    };
  }
}

/**
 * Removes a prospect from a saved list.
 */
export async function removeProspectFromList(
  listId: string,
  prospectId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  try {
    const ok = await removeFromList(listId, prospectId);
    if (!ok) {
      return { error: "Could not remove prospect from list." };
    }
    revalidatePath(`/dashboard/prospects/${prospectId}`);
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to remove prospect from list.",
    };
  }
}