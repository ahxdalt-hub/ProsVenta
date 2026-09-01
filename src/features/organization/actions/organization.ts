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
    // Fetch the actor's membership to authorize the change.
    const { data: actorMembership } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .single();

    if (!actorMembership) return { error: "You are not a member of an organization." };
    const actorRole = actorMembership.role as OrganizationRole;
    if (actorRole !== "owner" && actorRole !== "admin") {
      return { error: "You're not allowed to change this member's role." };
    }

    // Fetch the target member to authorize against their current role.
    const { data: targetMember } = await supabase
      .from("organization_members")
      .select("role")
      .eq("id", memberId)
      .single();

    if (!targetMember) return { error: "That member could not be found." };
    const targetRole = targetMember.role as OrganizationRole;

    // Owner protection: the owner's role can never be changed, and ownership
    // cannot be assigned through this action.
    if (targetRole === "owner") {
      return { error: "Owner management is restricted." };
    }
    if (role === "owner") {
      return { error: "Ownership can't be assigned here." };
    }

    // Hierarchy guard: you can only set a role strictly below your own level.
    const actorLevel = actorRole === "owner" ? 4 : 3;
    const targetLevel = role === "admin" ? 3 : role === "manager" ? 2 : role === "sales" ? 1 : 0;
    if (actorLevel <= targetLevel) {
      return { error: "You're not allowed to change this member's role." };
    }

    const ok = await updateMemberRole(memberId, role);
    if (!ok) { return { error: "Couldn't update this role." }; }
    revalidatePath("/dashboard/organization");
    revalidatePath("/dashboard/organization");
    return { error: null };
  } catch {
    return { error: "Couldn't update this role." };
  }
}

export async function removeMemberAction(memberId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  try {
    // Fetch the actor's membership to authorize the removal.
    const { data: actorMembership } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .single();

    if (!actorMembership) return { error: "You are not a member of an organization." };
    const actorRole = actorMembership.role as OrganizationRole;
    if (actorRole !== "owner" && actorRole !== "admin") {
      return { error: "You're not allowed to remove this member." };
    }

    // Fetch the target member for owner protection.
    const { data: targetMember } = await supabase
      .from("organization_members")
      .select("role, user_id")
      .eq("id", memberId)
      .single();

    if (!targetMember) return { error: "That member could not be found." };

    // Owner protection: the owner can never be removed through this action.
    if (targetMember.role === "owner") {
      return { error: "Owner management is restricted." };
    }

    // Self-removal is handled by the leave action; prevent using remove here.
    if (targetMember.user_id === user.id) {
      return { error: "Use Leave workspace to remove yourself." };
    }

    const ok = await removeMember(memberId);
    if (!ok) { return { error: "That member could not be removed." }; }
    revalidatePath("/dashboard/organization");
    revalidatePath("/dashboard/organization");
    return { error: null };
  } catch {
    return { error: "That member could not be removed." };
  }
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
