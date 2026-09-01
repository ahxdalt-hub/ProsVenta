"use server";

import { createClient } from "@/lib/supabase/server";
import { getSignedAvatarUrls } from "@/lib/db/profiles";
import { EntitlementService } from "@/features/plans/service";
import type {
  ProspectComment,
  ActivityEvent,
  ActivityEventInsert,
  ActivityAction,
  Notification,
  NotificationInsert,
  OrganizationInvitation,
  OrganizationRole,
} from "@/types/database";

// ============================================================================
// Prospect Comments
// ============================================================================

export interface CommentWithAuthor extends ProspectComment {
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  replies: CommentWithAuthor[];
}

/**
 * Retrieves all comments for a prospect, including replies.
 * Uses RLS to ensure users can only see comments within their organization.
 */
export async function getProspectComments(prospectId: string): Promise<CommentWithAuthor[]> {
  const supabase = await createClient();

  // Get the prospect's organization
  const { data: prospect } = await supabase
    .from("prospects")
    .select("organization_id")
    .eq("id", prospectId)
    .single();

  if (!prospect) return [];

  // Fetch all comments for the prospect (both top-level and replies)
  const { data: comments } = await supabase
    .from("prospect_comments")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: true });

  if (!comments || comments.length === 0) return [];

  // Fetch author profiles for all comments
  const authorIds = Array.from(new Set(comments.map((c) => c.author_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", authorIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Build nested structure: top-level comments with their replies
  const commentsWithAuthors: CommentWithAuthor[] = comments.map((comment) => {
    const author = profileMap.get(comment.author_id);
    return {
      ...comment,
      author: author
        ? {
            id: author.id,
            full_name: author.full_name,
            avatar_url: author.avatar_url,
          }
        : null,
      replies: [],
    };
  });

  // Build parent-child relationships
  const byId = new Map(commentsWithAuthors.map((c) => [c.id, c]));
  const roots: CommentWithAuthor[] = [];

  commentsWithAuthors.forEach((comment) => {
    if (comment.parent_id && byId.has(comment.parent_id)) {
      byId.get(comment.parent_id)!.replies.push(comment);
    } else {
      roots.push(comment);
    }
  });

  return roots;
}

/**
 * Adds a comment to a prospect.
 * Extracts @mentions from content and sends notifications to mentioned users.
 */
export async function addProspectComment(
  prospectId: string,
  content: string,
  parentId?: string | null
): Promise<{ error: string | null; comment?: CommentWithAuthor }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };
  if (!content.trim()) return { error: "Comment content is required." };

  // Get prospect for organization
  const { data: prospect } = await supabase
    .from("prospects")
    .select("organization_id, company_name")
    .eq("id", prospectId)
    .single();

  if (!prospect) return { error: "Prospect not found." };

  // Extract @mentions - find user IDs from mentioned names
  const mentionedNames = content.match(/@([A-Za-z0-9_.]+)/g)?.map((m) => m.slice(1)) ?? [];

  // Get organization members to resolve mention names
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", prospect.organization_id);

  const memberIds = (members ?? []).map((m) => m.user_id);

  const { data: memberProfiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", memberIds);

  const mentionIds: string[] = [];
  (memberProfiles ?? []).forEach((profile) => {
    if (profile.full_name) {
      const fullName = profile.full_name.toLowerCase();
      mentionedNames.forEach((name) => {
        const lowerName = name.toLowerCase();
        if (fullName.includes(lowerName) || fullName.split(" ").some((part: string) => part.toLowerCase() === lowerName)) {
          if (!mentionIds.includes(profile.id)) mentionIds.push(profile.id);
        }
      });
    }
  });

  try {
    const { data: comment } = await supabase
      .from("prospect_comments")
      .insert({
        prospect_id: prospectId,
        organization_id: prospect.organization_id,
        author_id: user.id,
        content: content.trim(),
        parent_id: parentId ?? null,
        mentions: mentionIds,
      })
      .select()
      .single();

    if (!comment) return { error: "Failed to add comment." };

    // Notify mentioned users
    if (mentionIds.length > 0 && parentId) {
      // This is a reply - notify the original comment author too
      const { data: parentComment } = await supabase
        .from("prospect_comments")
        .select("author_id")
        .eq("id", parentId)
        .single();

      const notifyUserIds = new Set([...mentionIds]);
      if (parentComment && parentComment.author_id !== user.id) {
        notifyUserIds.add(parentComment.author_id);
      }

      for (const targetUserId of notifyUserIds) {
        await createNotificationEntry({
          user_id: targetUserId,
          organization_id: prospect.organization_id,
          type: parentId ? "comment_reply" : "prospect_mentioned",
          title: parentId ? "New reply to your comment" : "You were mentioned in a comment",
          body: content.slice(0, 120),
          entity_type: "prospect",
          entity_id: prospectId,
          actor_id: user.id,
        });
      }
    } else if (mentionIds.length > 0) {
      // Top-level comment with mentions
      for (const targetUserId of mentionIds) {
        if (targetUserId === user.id) continue;
        await createNotificationEntry({
          user_id: targetUserId,
          organization_id: prospect.organization_id,
          type: "prospect_mentioned",
          title: "You were mentioned in a comment",
          body: content.slice(0, 120),
          entity_type: "prospect",
          entity_id: prospectId,
          actor_id: user.id,
        });
      }
    }

    // Record activity
    await recordActivityEntry({
      organization_id: prospect.organization_id,
      actor_id: user.id,
      action: parentId ? "comment_replied" : "comment_added",
      entity_type: "prospect",
      entity_id: prospectId,
      entity_name: prospect.company_name || "Prospect",
      metadata: { preview: content.slice(0, 80) },
    });

    // Get author profile for the response
    const { data: authorProfile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", user.id)
      .single();

    return {
      error: null,
      comment: {
        ...(comment as ProspectComment),
        author: authorProfile
          ? {
              id: authorProfile.id,
              full_name: authorProfile.full_name,
              avatar_url: authorProfile.avatar_url,
            }
          : null,
        replies: [],
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to add comment.",
    };
  }
}

/**
 * Deletes a comment.
 * RLS ensures users can only delete their own comments.
 */
export async function deleteProspectComment(commentId: string): Promise<boolean> {
  const supabase = await createClient();

  // Delete the comment and its replies (CASCADE handles replies)
  const { error } = await supabase
    .from("prospect_comments")
    .delete()
    .eq("id", commentId);

  return !error;
}

// ============================================================================
// Activity Feed
// ============================================================================

/**
 * Retrieves the recent activity feed for the user's organization.
 * Includes actor profile data for display.
 */
export async function getActivityFeed(limit = 50): Promise<(ActivityEvent & { actor: { full_name: string | null; avatar_url: string | null } | null })[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return [];

  const { data: events } = await supabase
    .from("activity_events")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!events || events.length === 0) return [];

  // Fetch actor profiles
  const actorIds = Array.from(new Set(events.map((e) => e.actor_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", actorIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Avatars live in a private bucket — swap storage paths for short-lived
  // signed URLs so actor avatars render instead of silently 403-ing.
  const signedUrls = await getSignedAvatarUrls(
    events.map((e) => {
      const actor = profileMap.get(e.actor_id);
      return { userId: e.actor_id, avatarPath: actor?.avatar_url ?? null };
    }),
    user.id
  );
  const signedByUrl = new Map<string, string | null>();
  events.forEach((e, i) => signedByUrl.set(e.actor_id, signedUrls[i] ?? null));

  return events.map((event) => {
    const actor = profileMap.get(event.actor_id);
    return {
      ...(event as ActivityEvent),
      actor: actor
        ? {
            full_name: actor.full_name,
            avatar_url: actor.avatar_url
              ? (signedByUrl.get(actor.id) ?? null)
              : null,
          }
        : null,
    };
  });
}

/**
 * Records an activity event.
 * Used by server actions after important changes.
 */
export async function recordActivityEntry(input: ActivityEventInsert): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activity_events")
    .insert(input)
    .select("id")
    .single();

  if (error) return null;
  return data.id as string;
}

/**
 * Records a prospect-related activity event to the activity feed.
 * Convenience wrapper for the action layer.
 */
export async function recordActivity(
  action: ActivityAction,
  entityType: string,
  entityId: string | null,
  entityName: string | null,
  metadata: Record<string, unknown> = {}
): Promise<string | null> {
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

  if (!membership) return null;

  return recordActivityEntry({
    organization_id: membership.organization_id,
    actor_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    metadata,
  });
}

// ============================================================================
// Notifications
// ============================================================================

/**
 * Retrieves notifications for the current user.
 */
export async function getNotifications(limit = 50): Promise<Notification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (notifications ?? []) as Notification[];
}

/**
 * Retrieves the unread notification count for the current user.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return count ?? 0;
}

/**
 * Marks a notification as read.
 */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  return !error;
}

/**
 * Marks all notifications as read.
 */
export async function markAllNotificationsRead(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id);

  return !error;
}

/**
 * Creates a notification entry.
 * Internal helper used by other server functions.
 */
export async function createNotificationEntry(input: NotificationInsert): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert(input)
    .select("id")
    .single();

  if (error) return null;
  return data.id as string;
}

// ============================================================================
// Invitations
// ============================================================================

/**
 * Creates a member invitation.
 * Generates a unique token and sets expiration (7 days from now).
 */
export async function createInvitation(email: string, role: OrganizationRole): Promise<{ error: string | null; invitation?: OrganizationInvitation }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .single();

  if (!membership) return { error: "You are not a member of an organization." };
  if (!["owner", "admin"].includes(membership.role)) {
    return { error: "Only owners and admins can invite members." };
  }

  // Only the owner can invite another admin. Admins can only invite
  // roles strictly below their own level.
  const roleLevel: Record<OrganizationRole, number> = {
    owner: 4,
    admin: 3,
    manager: 2,
    sales: 1,
    viewer: 0,
  };
  const actorLevel = roleLevel[membership.role as OrganizationRole] ?? 0;
  const targetLevel = roleLevel[role] ?? 0;
  if (role === "owner" || actorLevel <= targetLevel) {
    return { error: "You're not allowed to invite someone with that role." };
  }

  if (!email.trim() || !email.includes("@")) {
    return { error: "Valid email is required." };
  }

  // Stage 8 Phase 6 — server-side plan limit enforcement (authoritative).
  // Pending invitations count toward the limit too, so a plan can never be
  // bypassed by stacking invitations ahead of acceptances.
  try {
    // Seats used = current members + pending invitations. Requesting one more
    // seat must stay within max_team_members.
    const { count: pendingInvites } = await supabase
      .from("organization_invitations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organization_id)
      .is("accepted_at", null);
    const usage = await EntitlementService.getUsage(membership.organization_id);
    const seatsUsed = usage.teamMembers + (pendingInvites ?? 0);
    const entitlement = await EntitlementService.getEntitlement(
      membership.organization_id,
      "max_team_members"
    );
    const limitValue =
      entitlement?.limit_type === "integer" ? entitlement.value : null;
    if (limitValue !== null && seatsUsed + 1 > limitValue) {
      return {
        error: `You've reached your plan limit (${seatsUsed} of ${limitValue} team members, including pending invitations). View your plan to add more seats.`,
      };
    }
  } catch {
    // Never block invitations on entitlement infrastructure hiccups — the
    // role checks above remain authoritative for authorization.
  }

  // Check if the user is already a member
  const { data: existingMember } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .single();

  if (existingMember) {
    const { data: memberCheck } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", existingMember.id)
      .eq("organization_id", membership.organization_id)
      .single();

    if (memberCheck) {
      return { error: "This user is already a member of the workspace." };
    }
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabase
    .from("organization_invitations")
    .select("id")
    .eq("organization_id", membership.organization_id)
    .eq("email", email.trim().toLowerCase())
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    return { error: "An invitation for this email is already pending." };
  }

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data: invitation } = await supabase
      .from("organization_invitations")
      .insert({
        organization_id: membership.organization_id,
        email: email.trim().toLowerCase(),
        role,
        invited_by: user.id,
        token,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (!invitation) return { error: "Failed to create invitation." };

    return { error: null, invitation: invitation as OrganizationInvitation };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create invitation.",
    };
  }
}

/**
 * Retrieves all invitations for the user's organization.
 */
export async function getInvitations(): Promise<OrganizationInvitation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return [];

  const { data: invitations } = await supabase
    .from("organization_invitations")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  return (invitations ?? []) as OrganizationInvitation[];
}

/**
 * Resends an invitation (extends expiration date).
 */
export async function resendInvitation(invitationId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("organization_invitations")
    .update({ expires_at: expiresAt, status: "pending" })
    .eq("id", invitationId);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Revokes an invitation.
 */
export async function revokeInvitation(invitationId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Removes an invitation.
 */
export async function deleteInvitation(invitationId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_invitations")
    .delete()
    .eq("id", invitationId);

  return !error;
}

// ============================================================================
// Helpers
// ============================================================================

function generateInviteToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================================================
// Member Status
// ============================================================================

/**
 * Updates a member's last_active timestamp.
 * Called when a user performs actions in the workspace.
 */
export async function updateMemberLastActive(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("organization_members")
    .update({ last_active_at: new Date().toISOString() })
    .eq("user_id", user.id);
}

// ============================================================================
// Team Dashboard
// ============================================================================

export interface TeamDashboardData {
  activeMembers: number;
  totalAssignedProspects: number;
  recentActivityCount: number;
  unreadNotifications: number;
  membersByRole: Record<string, number>;
  assignedByMember: { user_id: string; full_name: string | null; count: number }[];
}

/**
 * Aggregates team collaboration metrics for the team dashboard.
 */
export async function getTeamDashboardData(): Promise<TeamDashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      activeMembers: 0,
      totalAssignedProspects: 0,
      recentActivityCount: 0,
      unreadNotifications: 0,
      membersByRole: {},
      assignedByMember: [],
    };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return {
      activeMembers: 0,
      totalAssignedProspects: 0,
      recentActivityCount: 0,
      unreadNotifications: 0,
      membersByRole: {},
      assignedByMember: [],
    };
  }

  const orgId = membership.organization_id;

  // Fetch all needed data in parallel
  const [
    activeMembersResult,
    assignedProspectsResult,
    activityResult,
    unreadResult,
    rolesResult,
    assignmentResult,
  ] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "active"),
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .not("owner_id", "is", null),
    supabase
      .from("activity_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId),
    supabase
      .from("prospects")
      .select("owner_id")
      .eq("organization_id", orgId)
      .not("owner_id", "is", null),
  ]);

  // Count members by role
  const membersByRole: Record<string, number> = {};
  (rolesResult.data ?? []).forEach((m) => {
    const role = m.role as string;
    membersByRole[role] = (membersByRole[role] ?? 0) + 1;
  });

  // Count assignments by member
  const assignmentCounts = new Map<string, number>();
  (assignmentResult.data ?? []).forEach((p) => {
    const ownerId = p.owner_id as string;
    assignmentCounts.set(ownerId, (assignmentCounts.get(ownerId) ?? 0) + 1);
  });

  // Fetch member names for assignment breakdown
  const memberIds = Array.from(assignmentCounts.keys());
  let assignedByMember: { user_id: string; full_name: string | null; count: number }[] = [];

  if (memberIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", memberIds);

    assignedByMember = memberIds.map((id) => ({
      user_id: id,
      full_name: profiles?.find((p) => p.id === id)?.full_name ?? null,
      count: assignmentCounts.get(id) ?? 0,
    }));
  }

  return {
    activeMembers: activeMembersResult.count ?? 0,
    totalAssignedProspects: assignedProspectsResult.count ?? 0,
    recentActivityCount: activityResult.count ?? 0,
    unreadNotifications: unreadResult.count ?? 0,
    membersByRole,
    assignedByMember,
  };
}