"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createSavedView, updateSavedView, deleteSavedView, duplicateSavedView } from "@/lib/db/saved-views";
import type { SavedViewInsert, SavedViewUpdate } from "@/types/database";

/**
 * Creates a new saved view from the current workspace state.
 */
export async function createSavedViewAction(
  input: {
    name: string;
    description?: string;
    filters?: Record<string, unknown>;
    sort_field?: string | null;
    sort_order?: "asc" | "desc" | null;
    search?: string | null;
    quick_filter?: string | null;
    favorites_only?: boolean;
    icon?: string | null;
    color?: string | null;
  }
): Promise<{ error: string | null; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };
  if (!input.name.trim()) return { error: "View name is required." };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return { error: "You are not a member of an organization." };

  try {
    const view = await createSavedView({
      organization_id: membership.organization_id,
      created_by: user.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      filters: input.filters ?? {},
      sort_field: input.sort_field ?? null,
      sort_order: input.sort_order ?? null,
      search: input.search?.trim() || null,
      quick_filter: input.quick_filter ?? null,
      favorites_only: input.favorites_only ?? false,
      icon: input.icon ?? null,
      color: input.color ?? null,
      display_order: 0,
    });

    if (!view) return { error: "Failed to create view." };
    revalidatePath("/dashboard/prospects");
    return { error: null, id: view.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create view.",
    };
  }
}

/**
 * Renames a saved view.
 */
export async function renameSavedViewAction(
  viewId: string,
  name: string
): Promise<{ error: string | null }> {
  if (!name.trim()) return { error: "View name is required." };

  try {
    await updateSavedView(viewId, { name: name.trim() });
    revalidatePath("/dashboard/prospects");
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to rename view.",
    };
  }
}

/**
 * Updates a saved view's configuration.
 */
export async function updateSavedViewAction(
  viewId: string,
  updates: SavedViewUpdate
): Promise<{ error: string | null }> {
  try {
    await updateSavedView(viewId, updates);
    revalidatePath("/dashboard/prospects");
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update view.",
    };
  }
}

/**
 * Deletes a saved view.
 */
export async function deleteSavedViewAction(
  viewId: string
): Promise<{ error: string | null }> {
  try {
    const ok = await deleteSavedView(viewId);
    if (!ok) return { error: "Could not delete view." };
    revalidatePath("/dashboard/prospects");
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete view.",
    };
  }
}

/**
 * Duplicates a saved view.
 */
export async function duplicateSavedViewAction(
  viewId: string
): Promise<{ error: string | null; id?: string }> {
  try {
    const duplicate = await duplicateSavedView(viewId, `${"View"} Copy`);
    if (!duplicate) return { error: "Could not duplicate view." };
    revalidatePath("/dashboard/prospects");
    return { error: null, id: duplicate.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to duplicate view.",
    };
  }
}

/**
 * Toggles a view's favorite/pinned status.
 */
export async function toggleSavedViewPinAction(
  viewId: string,
  isPinned: boolean
): Promise<{ error: string | null }> {
  try {
    await updateSavedView(viewId, { is_pinned: isPinned });
    revalidatePath("/dashboard/prospects");
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update view.",
    };
  }
}

/**
 * Toggles a prospect's favorite status.
 */
export async function toggleProspectFavoriteAction(
  prospectId: string,
  isFavorite: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  try {
    const { error } = await supabase
      .from("prospects")
      .update({ is_favorite: isFavorite })
      .eq("id", prospectId);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/prospects");
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update favorite.",
    };
  }
}