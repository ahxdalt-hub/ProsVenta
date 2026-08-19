"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProspectStatus, updateProspect, createProspect, deleteProspect } from "@/lib/db/prospects";
import { createProspectNote, deleteProspectNote } from "@/lib/db/notes";
import { addToList, removeFromList } from "@/lib/db/lists";
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
    .single();

  if (!membership) {
    return { error: "You are not a member of an organization." };
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
      source: "manual",
      status: "new",
    });

    if (!prospect) {
      return { error: "Failed to create prospect." };
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  try {
    const item = await addToList({ list_id: listId, prospect_id: prospectId });
    if (!item) {
      return { error: "Could not save prospect to list." };
    }
    revalidatePath(`/dashboard/prospects/${prospectId}`);
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save prospect to list.",
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