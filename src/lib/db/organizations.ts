"use server";

import { createClient } from "@/lib/supabase/server";
import { getSignedAvatarUrls } from "@/lib/db/profiles";
import type {
  Organization,
  OrganizationMember,
  OrganizationRole,
  OrganizationUpdate,
  Profile,
} from "@/types/database";

// ============================================================================
// Types
// ============================================================================

export interface OrganizationMemberWithProfile extends OrganizationMember {
  profile: Pick<Profile, "id" | "full_name" | "avatar_url" | "job_role"> & {
    email: string;
  };
}

export interface OrganizationDetails {
  organization: Organization | null;
  membership: OrganizationMember | null;
  memberCount: number;
  currentUserRole: OrganizationRole | null;
  isOwner: boolean;
}

// ============================================================================
// Organization Queries
// ============================================================================

/**
 * Ensures the authenticated user has an organization.
 * Creates one if they completed onboarding but don't yet have a workspace.
 * This handles users who onboarded before the organization workspace phase.
 */
export async function ensureOrganization(): Promise<Organization | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check for existing membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (membership) {
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", membership.organization_id)
      .single();
    return org;
  }

  // No membership — create an organization from the user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, industry")
    .eq("id", user.id)
    .single();

  const orgName = profile?.company_name || "My Workspace";

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: orgName,
      owner_id: user.id,
      industry: profile?.industry ?? null,
    })
    .select()
    .single();

  if (orgError || !org) return null;

  // Create the owner membership. A workspace with no owner membership is
  // unusable — every org-scoped query (details, members, invitations,
  // prospects, settings…) resolves membership through organization_members.
  // The insert error must never be swallowed, or we'd silently report an
  // orphaned organization as a working workspace.
  const { data: createdMembership, error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "owner",
    })
    .select("id")
    .single();

  if (memberError || !createdMembership) {
    // Best-effort rollback of the just-created organization so we don't leave
    // an orphaned workspace. (Under RLS this delete needs an owner membership
    // to exist — which just failed — so it is attempted but may no-op. Either
    // way we must NOT report a successful organization setup.)
    await supabase.from("organizations").delete().eq("id", org.id).select("id");
    return null;
  }

  return org;
}

/**
 * Retrieves the authenticated user's organization with membership details.
 * Uses RLS to ensure users can only access their own workspace.
 */
export async function getOrganizationDetails(): Promise<OrganizationDetails> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      organization: null,
      membership: null,
      memberCount: 0,
      currentUserRole: null,
      isOwner: false,
    };
  }

  // Get the user's membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return {
      organization: null,
      membership: null,
      memberCount: 0,
      currentUserRole: null,
      isOwner: false,
    };
  }

  // Get the organization
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .single();

  // Get member count
  const { count } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", membership.organization_id);

  const role = membership.role as OrganizationRole;

  return {
    organization,
    membership,
    memberCount: count ?? 0,
    currentUserRole: role,
    isOwner: role === "owner",
  };
}

/**
 * Retrieves the authenticated user's organization ID.
 * Returns null if the user is not in an organization.
 */
export async function getOrganizationId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  return membership?.organization_id ?? null;
}

// ============================================================================
// Organization Profile Updates
// ============================================================================

/**
 * Updates the organization profile.
 * RLS ensures only the owner can update.
 */
export async function updateOrganization(
  id: string,
  updates: OrganizationUpdate
): Promise<Organization | null> {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return org;
}

// ============================================================================
// Member Queries
// ============================================================================

/**
 * Retrieves all members of the authenticated user's organization
 * with their profile data (name, avatar, email).
 * Uses RLS to ensure users can only see members in their own organization.
 */
export async function getOrganizationMembers(): Promise<
  OrganizationMemberWithProfile[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get the user's organization membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return [];

  // Get all members of the organization
  const { data: members } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: true });

  if (!members || members.length === 0) return [];

  // Fetch profiles for all members
  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, job_role")
    .in("id", userIds);

  // We also need emails — fetch from auth via the user object
  // Since we can't query auth.users directly, we use the current user's email
  // and fall back to profile data for others
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  // Build the result with profile data
  // Note: email is only available for the current user via auth;
  // for other members, we show a masked email or "—"
  const result: OrganizationMemberWithProfile[] = members.map((member) => {
    const profile = profileMap.get(member.user_id);
    return {
      ...member,
      role: member.role as OrganizationRole,
      profile: {
        id: member.user_id,
        full_name: profile?.full_name ?? null,
        // Raw storage path is kept for reference; signed URL added below.
        avatar_url: profile?.avatar_url ?? null,
        job_role: profile?.job_role ?? null,
        email: member.user_id === user.id ? (user.email ?? "—") : "—",
      },
    };
  });

  // Avatars live in a private bucket — swap storage paths for short-lived
  // signed URLs so every member card can actually render them. Own path is
  // signed directly; teammates' via the existing secure RPC helper.
  const signedUrls = await getSignedAvatarUrls(
    result.map((m) => ({ userId: m.profile.id, avatarPath: m.profile.avatar_url })),
    user.id
  );

  return result.map((member, i) => ({
    ...member,
    profile: { ...member.profile, avatar_url: signedUrls[i] ?? member.profile.avatar_url },
  }));
}

/**
 * Updates a member's role.
 * RLS ensures only owners/admins can change roles.
 */
export async function updateMemberRole(
  memberId: string,
  role: OrganizationRole
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId);

  return !error;
}

/**
 * Removes a member from the organization.
 * RLS ensures only owners/admins can remove members (or members can remove themselves).
 */
export async function removeMember(memberId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId);

  return !error;
}

/**
 * Retrieves the total count of members in the user's organization.
 */
export async function getMemberCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return 0;

  const { count } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", membership.organization_id);

  return count ?? 0;
}