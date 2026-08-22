"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { MemberRow } from "./MemberRow";
import { InviteMemberDialog } from "./InviteMemberDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { RolesInfo } from "./RolesInfo";
import { updateMemberRoleAction, removeMemberAction } from "@/features/organization/actions/organization";
import { revokeInvitationAction } from "@/features/collaboration/actions/collaboration";
import { isAdminRole, canManageRole, getRoleLabel } from "@/features/collaboration/permissions";
import type { OrganizationRole, OrganizationInvitation } from "@/types/database";
import type { OrganizationMemberWithProfile } from "@/lib/db/organizations";

interface MembersSectionProps {
  members: OrganizationMemberWithProfile[];
  currentUserId: string;
  currentUserRole: OrganizationRole | null;
  invitations: OrganizationInvitation[];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface PendingRoleChange {
  member: OrganizationMemberWithProfile;
  role: OrganizationRole;
}

interface PendingRemoval {
  member: OrganizationMemberWithProfile;
}

export function MembersSection({
  members,
  currentUserId,
  currentUserRole,
  invitations,
}: MembersSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  const canManage = isAdminRole(currentUserRole);
  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  const runAction = useCallback(
    (action: () => Promise<{ error: string | null }>, successMessage?: string) => {
      setError(null);
      setSuccess(null);
      startTransition(async () => {
        const result = await action();
        if (result.error) {
          setError(result.error);
          return;
        }
        if (successMessage) {
          setSuccess(successMessage);
          setTimeout(() => setSuccess(null), 2600);
        }
        router.refresh();
      });
    },
    [router]
  );

  const handleConfirmRoleChange = () => {
    if (!pendingRoleChange) return;
    const { member, role } = pendingRoleChange;
    runAction(() => updateMemberRoleAction(member.id, role), "Role updated.");
    setPendingRoleChange(null);
  };

  const handleConfirmRemove = () => {
    if (!pendingRemoval) return;
    const { member } = pendingRemoval;
    runAction(() => removeMemberAction(member.id), "Member removed.");
    setPendingRemoval(null);
  };

  const handleRevoke = (invitationId: string) => {
    runAction(() => revokeInvitationAction(invitationId), "Invitation cancelled.");
  };

  return (
    <section aria-labelledby="members-heading" className="dashboard-enter" style={{ animationDelay: "120ms" }}>
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 id="members-heading" className="text-lg font-semibold tracking-tight text-slate-900">
            Members
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            People who currently belong to this workspace.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setInviteOpen(true)} className="shrink-0">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Invite member
          </Button>
        )}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mb-4"
          >
            <Alert variant="error" title="Couldn't complete that action">
              {error}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mb-4"
          >
            <Alert variant="success">{success}</Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members list */}
      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-900">No members yet</p>
          <p className="mt-1 text-xs text-slate-400">Invite teammates to collaborate in your workspace.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const canManageThisMember =
              canManage &&
              !!currentUserRole &&
              canManageRole(currentUserRole, member.role) &&
              member.role !== "owner";
            const canRemoveThisMember =
              canManage && !!currentUserRole && canManageRole(currentUserRole, member.role) && member.role !== "owner";
            return (
              <MemberRow
                key={member.id}
                member={member}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                canManage={canManageThisMember}
                canRemove={canRemoveThisMember}
                isPending={isPending}
                onRequestRoleChange={(member, role) =>
                  setPendingRoleChange({ member, role })
                }
                onRequestRemove={(member) => setPendingRemoval({ member })}
              />
            );
          })}
        </div>
      )}

      {/* Pending invitations */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold tracking-tight text-slate-900">
          Pending invitations
        </h3>
        {pendingInvitations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white/40 px-4 py-5 text-sm text-slate-400">
            No pending invitations. Everyone you have invited is either already here or has not been invited yet.
          </p>
        ) : (
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors duration-150 hover:border-slate-300"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900" title={invitation.email}>
                      {invitation.email}
                    </p>
                    <p className="text-xs text-slate-400">
                      <span className="capitalize">{getRoleLabel(invitation.role)}</span> · Invited {formatDate(invitation.created_at)}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(invitation.id)}
                    disabled={isPending}
                    className="shrink-0 text-slate-400 hover:text-red-600"
                  >
                    Cancel invitation
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Roles reference */}
      <div className="mt-8">
        <RolesInfo />
      </div>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        currentUserRole={currentUserRole}
      />

      {/* Role change confirmation */}
      <ConfirmDialog
        open={!!pendingRoleChange}
        title="Change role"
        body={
          pendingRoleChange
            ? `Change ${pendingRoleChange.member.profile.full_name || "this member"} from ${getRoleLabel(
                pendingRoleChange.member.role
              )} to ${getRoleLabel(pendingRoleChange.role)}? They'll gain access to new workspace actions.`
            : undefined
        }
        confirmLabel="Confirm"
        isPending={isPending}
        onConfirm={handleConfirmRoleChange}
        onOpenChange={(open) => !open && setPendingRoleChange(null)}
      />

      {/* Remove member confirmation */}
      <ConfirmDialog
        open={!!pendingRemoval}
        title="Remove member?"
        body={
          pendingRemoval
            ? `${pendingRemoval.member.profile.full_name || "This member"} will lose access to this Prosventa workspace.`
            : undefined
        }
        confirmLabel="Remove member"
        confirmVariant="danger"
        isPending={isPending}
        onConfirm={handleConfirmRemove}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
      />
    </section>
  );
}