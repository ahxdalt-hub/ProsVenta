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
 * Idempotent: re-adding an existing member is NOT an error (the DB enforces
 * uniqueness via unique_list_prospect; we upsert with ignoreDuplicates so
 * double-submissions and repeat saves succeed harmlessly).
 */
export async function addToList(
  input: SavedListItemInsert
): Promise<SavedListItem | null> {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("saved_list_items")
    .upsert(input, { onConflict: "list_id,prospect_id", ignoreDuplicates: true })
    .select()
    .limit(1);

  // No row returned means the prospect was already a member — not a failure.
  return items?.[0] ?? null;
}

/**
 * Adds MULTIPLE prospects to a saved list in ONE statement.
 * Idempotent (existing members are skipped, not errors) — protects against
 * double-submission and duplicate memberships in a single round trip.
 */
export async function addToListMany(
  listId: string,
  prospectIds: string[]
): Promise<boolean> {
  if (prospectIds.length === 0) return true;
  const supabase = await createClient();

  const { error } = await supabase.from("saved_list_items").upsert(
    prospectIds.map((prospect_id) => ({ list_id: listId, prospect_id })),
    { onConflict: "list_id,prospect_id", ignoreDuplicates: true }
  );

  return !error;
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

/**
 * Retrieves every saved list with its prospect count embedded in ONE query
 * (saved_list_items(count) aggregation — no per-list round trips).
 * Ordered by updated_at so recently touched lists surface first.
 */
export async function getSavedListsWithCounts(): Promise<
  (SavedList & { prospect_count: number })[]
> {
  const supabase = await createClient();

  const { data: lists } = await supabase
    .from("saved_lists")
    .select("*, saved_list_items(count)")
    .order("updated_at", { ascending: false });

  return (lists ?? []).map((list) => ({
    ...list,
    prospect_count: Array.isArray(list.saved_list_items)
      ? (list.saved_list_items[0]?.count ?? 0)
      : 0,
  }));
}

/**
 * Retrieves the members of a saved list WITH their embedded ICP scores so the
 * list detail workspace can reuse the shared ProspectTable without N+1 lookups.
 * RLS ensures the list belongs to the user's organization.
 */
export async function getSavedListMembers(
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
    .select("*, prospect_scores(score, category)")
    .in("id", prospectIds);

  // Preserve the membership order (most recently added first).
  const byId = new Map((prospects ?? []).map((p) => [p.id, p]));
  return {
    list,
    prospects: prospectIds.map((id) => byId.get(id)).filter(Boolean) as Prospect[],
  };
}

/**
 * Removes multiple prospects from a saved list in ONE delete statement.
 * Only removes memberships — underlying prospects are never deleted.
 */
export async function removeFromListMany(
  listId: string,
  prospectIds: string[]
): Promise<boolean> {
  if (prospectIds.length === 0) return true;
  const supabase = await createClient();

  const { error } = await supabase
    .from("saved_list_items")
    .delete()
    .eq("list_id", listId)
    .in("prospect_id", prospectIds);

  return !error;
}
