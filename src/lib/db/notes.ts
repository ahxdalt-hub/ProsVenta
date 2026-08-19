"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProspectNote, ProspectNoteInsert } from "@/types/database";

/**
 * Retrieves all notes for a prospect.
 * RLS ensures users can only access notes on prospects in their organization.
 */
export async function getProspectNotes(prospectId: string): Promise<ProspectNote[]> {
  const supabase = await createClient();

  const { data: notes } = await supabase
    .from("prospect_notes")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });

  return notes ?? [];
}

/**
 * Creates a new note on a prospect.
 * RLS ensures the note is tied to the authenticated user.
 */
export async function createProspectNote(
  input: ProspectNoteInsert
): Promise<ProspectNote | null> {
  const supabase = await createClient();

  const { data: note } = await supabase
    .from("prospect_notes")
    .insert(input)
    .select()
    .single();

  return note;
}

/**
 * Deletes a note.
 * RLS ensures users can only delete notes they created.
 */
export async function deleteProspectNote(noteId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("prospect_notes")
    .delete()
    .eq("id", noteId);

  return !error;
}