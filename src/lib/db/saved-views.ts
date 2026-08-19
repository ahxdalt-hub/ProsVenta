"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  SavedView,
  SavedViewInsert,
  SavedViewUpdate,
} from "@/types/database";

/**
 * Retrieves all saved views accessible to the authenticated user.
 * Includes personal views and shared/team/org views.
 */
export async function getSavedViews(): Promise<SavedView[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return [];

  const orgIds = memberships.map((m) => m.organization_id);

  // Fetch personal + shared views for the user's organizations
  const { data: views } = await supabase
    .from("saved_views")
    .select("*")
    .in("organization_id", orgIds)
    .order("is_pinned", { ascending: false })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  return views ?? [];
}

/**
 * Retrieves a single saved view by ID.
 */
export async function getSavedView(id: string): Promise<SavedView | null> {
  const supabase = await createClient();

  const { data: view } = await supabase
    .from("saved_views")
    .select("*")
    .eq("id", id)
    .single();

  return view;
}

/**
 * Creates a new saved view.
 */
export async function createSavedView(
  input: SavedViewInsert
): Promise<SavedView | null> {
  const supabase = await createClient();

  const { data: view } = await supabase
    .from("saved_views")
    .insert(input)
    .select()
    .single();

  return view;
}

/**
 * Updates an existing saved view.
 */
export async function updateSavedView(
  id: string,
  updates: SavedViewUpdate
): Promise<SavedView | null> {
  const supabase = await createClient();

  const { data: view } = await supabase
    .from("saved_views")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return view;
}

/**
 * Deletes a saved view.
 */
export async function deleteSavedView(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("saved_views")
    .delete()
    .eq("id", id);

  return !error;
}

/**
 * Duplicates a saved view with a new name.
 */
export async function duplicateSavedView(
  id: string,
  newName: string
): Promise<SavedView | null> {
  const supabase = await createClient();

  const view = await getSavedView(id);
  if (!view) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: duplicate } = await supabase
    .from("saved_views")
    .insert({
      organization_id: view.organization_id,
      created_by: user.id,
      name: newName,
      description: view.description,
      view_type: "personal",
      filters: view.filters,
      sort_field: view.sort_field,
      sort_order: view.sort_order,
      search: view.search,
      quick_filter: view.quick_filter,
      favorites_only: view.favorites_only,
      is_pinned: false,
      icon: view.icon,
      color: view.color,
      display_order: view.display_order + 1,
    })
    .select()
    .single();

  return duplicate;
}