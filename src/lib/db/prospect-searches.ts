"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProspectSearch, ProspectSearchInsert, ProspectSearchUpdate } from "@/types/database";

/**
 * Retrieves all prospect searches for the authenticated user's organization.
 * Uses RLS to ensure users can only access their organization's data.
 */
export async function getProspectSearches(): Promise<ProspectSearch[]> {
  const supabase = await createClient();

  const { data: searches } = await supabase
    .from("prospect_searches")
    .select("*")
    .order("created_at", { ascending: false });

  return searches ?? [];
}

/**
 * Retrieves a single prospect search by ID.
 */
export async function getProspectSearch(id: string): Promise<ProspectSearch | null> {
  const supabase = await createClient();

  const { data: search } = await supabase
    .from("prospect_searches")
    .select("*")
    .eq("id", id)
    .single();

  return search;
}

/**
 * Creates a new prospect search record.
 */
export async function createProspectSearch(
  input: ProspectSearchInsert
): Promise<ProspectSearch | null> {
  const supabase = await createClient();

  const { data: search } = await supabase
    .from("prospect_searches")
    .insert(input)
    .select()
    .single();

  return search;
}

/**
 * Updates an existing prospect search record.
 */
export async function updateProspectSearch(
  id: string,
  updates: ProspectSearchUpdate
): Promise<ProspectSearch | null> {
  const supabase = await createClient();

  const { data: search } = await supabase
    .from("prospect_searches")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return search;
}

/**
 * Deletes a prospect search record.
 */
export async function deleteProspectSearch(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("prospect_searches")
    .delete()
    .eq("id", id);

  return !error;
}

/**
 * Retrieves the total count of prospect searches for the organization.
 */
export async function getProspectSearchCount(): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("prospect_searches")
    .select("*", { count: "exact", head: true });

  return count ?? 0;
}