"use server";

import { createClient } from "@/lib/supabase/server";
import type { SavedList, SavedListInsert, SavedListUpdate, SavedListItem, SavedListItemInsert, Prospect } from "@/types/database";

/**
 * Retrieves all saved lists for the authenticated user's organization.
 * Uses RLS to ensure users can only access their organization's data.
 */
export async function getSavedLists(): Promise<SavedList[]> {
  const supabase = await createClient();

  const { data: lists } = await supabase
    .from("saved_lists")
    .select("*")
    .order("created_at", { ascending: false });

  return lists ?? [];
}

/**
 * Retrieves a single saved list by ID.
 */
export async function getSavedList(id: string): Promise<SavedList | null> {
  const supabase = await createClient();

  const { data: list } = await supabase
    .from("saved_lists")
    .select("*")
    .eq("id", id)
    .single();

  return list;
}

/**
 * Creates a new saved list.
 */
export async function createSavedList(
  input: SavedListInsert
): Promise<SavedList | null> {
  const supabase = await createClient();

  const { data: list } = await supabase
    .from("saved_lists")
    .insert(input)
    .select()
    .single();

  return list;
}

/**
 * Updates an existing saved list.
 */
export async function updateSavedList(
  id: string,
  updates: SavedListUpdate
): Promise<SavedList | null> {
  const supabase = await createClient();

  const { data: list } = await supabase
    .from("saved_lists")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return list;
}

/**
 * Deletes a saved list.
 */
export async function deleteSavedList(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("saved_lists")
    .delete()
    .eq("id", id);

  return !error;
}

/**
 * Retrieves all items in a saved list.
 */
export async function getSavedListItems(
  listId: string
): Promise<SavedListItem[]> {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("saved_list_items")
    .select("*")
    .eq("list_id", listId)
    .order("created_at", { ascending: false });

  return items ?? [];
}

/**
 * Adds a prospect to a saved list.
 */
export async function addToList(
  input: SavedListItemInsert
): Promise<SavedListItem | null> {
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("saved_list_items")
    .insert(input)
    .select()
    .single();

  return item;
}

/**
 * Removes a prospect from a saved list.
 */
export async function removeFromList(
  listId: string,
  prospectId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("saved_list_items")
    .delete()
    .eq("list_id", listId)
    .eq("prospect_id", prospectId);

  return !error;
}

/**
 * Retrieves the total count of saved lists for the organization.
 */
export async function getSavedListCount(): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("saved_lists")
    .select("*", { count: "exact", head: true });

  return count ?? 0;
}

/**
 * Retrieves a saved list with its associated prospects.
 * RLS ensures the list and items belong to the user's organization.
 */
export async function getSavedListWithProspects(
  listId: string
): Promise<{ list: SavedList | null; prospects: Prospect[] }> {
  const supabase = await createClient();

  const list = await getSavedList(listId);
  if (!list) {
    return { list: null, prospects: [] };
  }

  const { data: items } = await supabase
    .from("saved_list_items")
    .select("prospect_id")
    .eq("list_id", listId)
    .order("created_at", { ascending: false });

  const prospectIds = (items ?? []).map((item) => item.prospect_id);

  if (prospectIds.length === 0) {
    return { list, prospects: [] };
  }

  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .in("id", prospectIds)
    .order("created_at", { ascending: false });

  return { list, prospects: prospects ?? [] };
}
