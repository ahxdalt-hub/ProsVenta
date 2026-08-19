"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updateOrganization,
  removeMember,
  updateMemberRole,
} from "@/lib/db/organizations";
import type { OrganizationRole } from "@/types/database";

export async function updateOrganizationAction(input: { name: string; website?: string; industry?: string; country?: string; description?: string; }): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!input.name.trim()) { return { error: "Organization name is required." }; }
  const { data: membership } = await supabase.from("organization_members").select("organization_id, role").eq("user_id", user.id).single();
  if (!membership) { return { error: "You are not a member of an organization." }; }
  if (membership.role !== "owner") { return { error: "Only the owner can update the organization profile." }; }
  try {
    const org = await updateOrganization(membership.organization_id, { name: input.name.trim(), website: input.website?.trim() || null, industry: input.industry?.trim() || null, country: input.country?.trim() || null, description: input.description?.trim() || null });
    if (!org) { return { error: "Failed to update organization." }; }
    revalidatePath("/dashboard/organization");
    revalidatePath("/dashboard");
    return { error: null };
  } catch (error) { return { error: error instanceof Error ? error.message : "Failed to update organization." }; }
}

export async function updateMemberRoleAction(memberId: string, role: OrganizationRole): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  try {
    const ok = await updateMemberRole(memberId, role);
    if (!ok) { return { error: "Could not update member role." }; }
    revalidatePath("/dashboard/organization");
    revalidatePath("/dashboard/organization/members");
    return { error: null };
  } catch (error) { return { error: error instanceof Error ? error.message : "Failed to update member role." }; }
}

export async function removeMemberAction(memberId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  try {
    const ok = await removeMember(memberId);
    if (!ok) { return { error: "Could not remove member." }; }
    revalidatePath("/dashboard/organization");
    revalidatePath("/dashboard/organization/members");
    return { error: null };
  } catch (error) { return { error: error instanceof Error ? error.message : "Failed to remove member." }; }
}

export async function leaveOrganizationAction(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("organization_members").select("id, role").eq("user_id", user.id).single();
  if (!membership) { return { error: "You are not a member of an organization." }; }
  if (membership.role === "owner") { return { error: "Owners cannot leave the workspace. Transfer ownership first (coming soon)." }; }
  try {
    const ok = await removeMember(membership.id);
    if (!ok) { return { error: "Could not leave the organization." }; }
    revalidatePath("/dashboard");
    return { error: null };
  } catch (error) { return { error: error instanceof Error ? error.message : "Failed to leave organization." }; }
}

export async function deleteOrganizationAction(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("organization_members").select("organization_id, role").eq("user_id", user.id).single();
  if (!membership) { return { error: "You are not a member of an organization." }; }
  if (membership.role !== "owner") { return { error: "Only the owner can delete the organization." }; }
  try {
    const { error } = await supabase.from("organizations").delete().eq("id", membership.organization_id);
    if (error) { return { error: error.message }; }
    revalidatePath("/dashboard");
    return { error: null };
  } catch (error) { return { error: error instanceof Error ? error.message : "Failed to delete organization." }; }
}
