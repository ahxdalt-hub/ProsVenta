"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createSavedList,
  updateSavedList,
  deleteSavedList,
  removeFromListMany,
} from "@/lib/db/lists";
import { EntitlementService } from "@/features/plans/service";

/**
 * Creates a new saved list for the authenticated user's organization.
 */
export async function createSavedListAction(
  name: string,
  description?: string
): Promise<{ error: string | null; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!name.trim()) {
    return { error: "List name is required." };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { error: "You are not a member of an organization." };
  }

  // Stage 8 Phase 6 — server-side plan limit enforcement (authoritative).
  try {
    const decision = await EntitlementService.checkLimit(
      membership.organization_id,
      "max_saved_lists"
    );
    if (!decision.allowed) {
      return {
        error:
          decision.errorCode === "FEATURE_NOT_INCLUDED"
            ? "Your plan doesn't include saved lists. Upgrade your plan to organize prospects into lists."
            : `You've reached your plan limit (${decision.currentUsage} of ${decision.limitValue} saved lists). View your plan to get more capacity.`,
      };
    }
  } catch {
    // Never block core CRUD on entitlement infrastructure hiccups.
  }

  try {
    const list = await createSavedList({
      organization_id: membership.organization_id,
      name: name.trim(),
      description: description?.trim() || null,
    });
    if (!list) {
      return { error: "Failed to create list." };
    }
    revalidatePath("/dashboard/saved-lists");
    return { error: null, id: list.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create list.",
    };
  }
}

/**
 * Renames a saved list and updates its description.
 */
export async function updateSavedListAction(
  listId: string,
  name: string,
  description?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!name.trim()) {
    return { error: "List name is required." };
  }

  try {
    await updateSavedList(listId, {
      name: name.trim(),
      description: description?.trim() || null,
    });
    revalidatePath("/dashboard/saved-lists");
    revalidatePath(`/dashboard/saved-lists/${listId}`);
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update list.",
    };
  }
}

/**
 * Deletes a saved list.
 */
export async function deleteSavedListAction(
  listId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  try {
    const ok = await deleteSavedList(listId);
    if (!ok) {
      return { error: "Could not delete list." };
    }
    revalidatePath("/dashboard/saved-lists");
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete list.",
    };
  }
}

/**
 * Removes multiple prospects from a saved list (membership only).
 * The underlying prospects are NEVER deleted — a list is a container.
 */
export async function removeProspectsFromListAction(
  listId: string,
  prospectIds: string[]
): Promise<{ error: string | null; removed: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (prospectIds.length === 0) {
    return { error: null, removed: 0 };
  }

  try {
    const ok = await removeFromListMany(listId, prospectIds);
    if (!ok) {
      return { error: "Could not remove prospects from list.", removed: 0 };
    }
    revalidatePath(`/dashboard/saved-lists/${listId}`);
    revalidatePath("/dashboard/saved-lists");
    return { error: null, removed: prospectIds.length };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to remove prospects from list.",
      removed: 0,
    };
  }
}