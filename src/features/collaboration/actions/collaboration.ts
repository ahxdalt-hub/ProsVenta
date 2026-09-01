"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  addProspectComment,
  deleteProspectComment,
  markNotificationRead,
  markAllNotificationsRead,
  createInvitation,
  resendInvitation,
  revokeInvitation,
  deleteInvitation,
  recordActivity,
} from "@/lib/db/collaboration";
import { updateProspect } from "@/lib/db/prospects";
import type { OrganizationRole } from "@/types/database";

// ============================================================================
// Prospect Comments
// ============================================================================

export async function addCommentAction(
  prospectId: string,
  content: string,
  parentId?: string | null
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await addProspectComment(prospectId, content, parentId);
  if (result.error) return { error: result.error };

  revalidatePath(`/dashboard/prospects`);
  return { error: null };
}

export async function deleteCommentAction(
  commentId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ok = await deleteProspectComment(commentId);
  if (!ok) return { error: "Could not delete comment." };

  revalidatePath(`/dashboard/prospects`);
  return { error: null };
}

// ============================================================================
// Prospect Ownership & Assignment
// ============================================================================

export async function assignProspectAction(
  prospectId: string,
  ownerId: string | null
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  try {
    // Get prospect info
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, company_name, organization_id")
      .eq("id", prospectId)
      .single();

    if (!prospect) return { error: "Prospect not found." };

    // Update the owner
    await updateProspect(prospectId, { owner_id: ownerId });

    // Get owner name for metadata
    let ownerName = null;
    if (ownerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", ownerId)
        .single();
      ownerName = profile?.full_name ?? null;
    }

    // Record activity
    await recordActivity(
      "prospect_assigned",
      "prospect",
      prospectId,
      prospect.company_name || "Prospect",
      { owner_id: ownerId, owner_name: ownerName }
    );

    revalidatePath("/dashboard/prospects");
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to assign prospect.",
    };
  }
}

// ============================================================================
// Notifications
// ============================================================================

export async function markNotificationReadAction(
  notificationId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ok = await markNotificationRead(notificationId);
  if (!ok) return { error: "Could not update notification." };
  return { error: null };
}

export async function markAllNotificationsReadAction(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ok = await markAllNotificationsRead();
  if (!ok) return { error: "Could not update notifications." };
  return { error: null };
}

// ============================================================================
// Invitations
// ============================================================================

export async function createInvitationAction(
  email: string,
  role: OrganizationRole
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await createInvitation(email, role);
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/organization");
  return { error: null };
}

export async function resendInvitationAction(
  invitationId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await resendInvitation(invitationId);
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/organization");
  return { error: null };
}

export async function revokeInvitationAction(
  invitationId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await revokeInvitation(invitationId);
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/organization");
  return { error: null };
}

export async function deleteInvitationAction(
  invitationId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ok = await deleteInvitation(invitationId);
  if (!ok) return { error: "Could not delete invitation." };

  revalidatePath("/dashboard/organization");
  return { error: null };
}