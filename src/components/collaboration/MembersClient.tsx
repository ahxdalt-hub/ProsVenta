"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MemberCard } from "./MemberCard";
import { InviteMemberModal } from "./InviteMemberModal";
import { updateMemberRoleAction, removeMemberAction } from "@/features/organization/actions/organization";
import { resendInvitationAction, revokeInvitationAction, deleteInvitationAction } from "@/features/collaboration/actions/collaboration";
import { isAdminRole, canManageRole } from "@/features/collaboration/permissions";
import type { OrganizationRole, OrganizationInvitation } from "@/types/database";
import type { OrganizationMemberWithProfile } from "@/lib/db/organizations";

interface MembersClientProps {
  members: OrganizationMemberWithProfile[];
  currentUserId: string;
  currentUserRole: OrganizationRole | undefined;
  invitations: OrganizationInvitation[];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function MembersClient({
  members,
  currentUserId,
  currentUserRole,
  invitations,
}: MembersClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = isAdminRole(currentUserRole);
  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  const handleRoleChange = (memberId: string, role: OrganizationRole) => {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberRoleAction(memberId, role);
      if (result.error) setError(result.error);
      router.refresh();
    });
  };

  const handleRemove = (memberId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await removeMemberAction(memberId);
      if (result.error) setError(result.error);
      router.refresh();
    });
  };

  const handleResend = (invitationId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await resendInvitationAction(invitationId);
      if (result.error) setError(result.error);
      router.refresh();
    });
  };

  const handleRevoke = (invitationId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await revokeInvitationAction(invitationId);
      if (result.error) setError(result.error);
      router.refresh();
    });
  };

  const handleDeleteInvite = (invitationId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteInvitationAction(invitationId);
      if (result.error) setError(result.error);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">All Members</h2>
          <p className="text-sm text-slate-500">
            {members.length} {members.length === 1 ? "member" : "members"} in this workspace
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16" y1="13" x2="16" y2="21" /><line x1="8" y1="13" x2="8" y2="21" /><line x1="4" y1="21" x2="20" y2="21" /><line x1="13" y1="3" x2="7" y2="14" /><line x1="11" y1="3" x2="17" y2="14" /></svg>
            Invite Member
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      {/* Members grid */}
      {members.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
            </div>
            <p className="text-sm font-medium text-slate-900">No members yet</p>
            <p className="mt-1 text-xs text-slate-400">Invite teammates to collaborate in your workspace.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const canManageThisMember = canManage && canManageRole(currentUserRole, member.role);
            return (
              <MemberCard
                key={member.id}
                member={member}
                currentUserId={currentUserId}
                canManage={canManageThisMember}
                canRemove={canManageThisMember}
                onRoleChange={handleRoleChange}
                onRemove={handleRemove}
              />
            );
          })}
        </div>
      )}

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Pending Invitations</h3>
          <Card>
            <div className="p-6 pt-4 space-y-3">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-50 text-amber-600 shrink-0">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{invitation.email}</p>
                      <p className="text-xs text-slate-400">
                        {invitation.role} · Expires {formatDate(invitation.expires_at)}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="secondary" onClick={() => handleResend(invitation.id)} disabled={isPending}>
                        Resend
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRevoke(invitation.id)} disabled={isPending}>
                        Revoke
                      </Button>
                      <button
                        onClick={() => handleDeleteInvite(invitation.id)}
                        disabled={isPending}
                        className="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors duration-150 disabled:opacity-50"
                        aria-label={`Delete invitation for ${invitation.email}`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <InviteMemberModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}