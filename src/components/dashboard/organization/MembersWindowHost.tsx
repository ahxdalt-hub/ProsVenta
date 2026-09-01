"use client";

// ============================================================================
// Prosventa — Member Management Window (Phases 2–3)
// ============================================================================
// The contextual Members window for the Organization page. Built on the
// shared ActionWindow architecture (open/close animations, focus restoration,
// Escape handling — minimize is disabled for this window) — no separate modal
// system.
//
// Phase 3 integration model:
//   • <MembersWindowProvider> owns ALL window state once per page and renders
//     the single underlying window.
//   • Any entry point (hero "Manage members", "Invite member", team-card
//     action, "view more" tile) opens that SAME window through
//     <OpenMembersWindowButton mode="list" | "invite"> or useMembersWindow().
//   • It is a pure UI layer over the EXISTING member system:
//   • Data comes from the Organization page's server queries via props
//     (single source of truth — no duplicate member fetches here).
//   • Role changes / removal go through the existing authorized server
//     actions (updateMemberRoleAction / removeMemberAction), which keep
//     owner-protection and hierarchy rules authoritative on the server.
//   • Invitations use the existing collaboration actions
//     (create/resend/revoke/deleteInvitationAction).
//   • After any mutation the router refreshes so the Organization page and
//     its member counts re-render from the same server data.
// ============================================================================

import { createContext, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionWindow } from "@/components/action-window";
import { SearchField } from "@/components/action-window/SearchField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/collaboration/RoleBadge";
import {
  updateMemberRoleAction,
  removeMemberAction,
} from "@/features/organization/actions/organization";
import {
  createInvitationAction,
  resendInvitationAction,
  revokeInvitationAction,
  deleteInvitationAction,
} from "@/features/collaboration/actions/collaboration";
import {
  canAssignRole,
  canManageRole,
  hasPermission,
} from "@/features/collaboration/permissions";
import type { OrganizationMemberWithProfile } from "@/lib/db/organizations";
import type { OrganizationInvitation, OrganizationRole } from "@/types/database";

interface MembersWindowHostProps {
  members: OrganizationMemberWithProfile[];
  invitations: OrganizationInvitation[];
  currentUserId: string | null;
  currentUserRole: OrganizationRole | null;
}

/** Roles offered when inviting — mirrors the existing InviteMemberModal set. */
const INVITE_ROLE_OPTIONS: {
  value: OrganizationRole;
  label: string;
  description: string;
}[] = [
  { value: "admin", label: "Admin", description: "Can manage members and workspace content" },
  { value: "manager", label: "Manager", description: "Can manage prospects and team assignments" },
  { value: "sales", label: "Sales", description: "Can create, edit, and assign prospects" },
  { value: "viewer", label: "Viewer", description: "Read-only access with commenting" },
];

function formatExpiry(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* --------------------------------- Icons ---------------------------------- */

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function UsersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function MailIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/** Small helper icon for the no-search-match state (kept local & private). */
function SearchMissIcon() {
  return (
    <svg className="mx-auto h-8 w-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8.5" y1="11" x2="13.5" y2="11" />
    </svg>
  );
}

/* ------------------------------- Component -------------------------------- */

interface MembersWindowHostProps {
  members: OrganizationMemberWithProfile[];
  invitations: OrganizationInvitation[];
  currentUserId: string | null;
  currentUserRole: OrganizationRole | null;
}

/**
 * Shared window-state mechanism (Phase 3): every member-management entry point
 * (hero buttons, team card, "view more" tile, …) opens the SAME underlying
 * window through this provider — different initial states, one architecture,
 * zero duplicated window logic.
 */
const MembersWindowContext = createContext<{
  openWindow: (mode: "list" | "invite") => void;
} | null>(null);

export function useMembersWindow() {
  const ctx = useContext(MembersWindowContext);
  if (!ctx) {
    throw new Error(
      "useMembersWindow must be used within a MembersWindowProvider."
    );
  }
  return ctx;
}

interface MembersWindowProviderProps extends MembersWindowHostProps {
  children: React.ReactNode;
}

export function MembersWindowProvider({
  members,
  invitations,
  currentUserId,
  currentUserRole,
  children,
}: MembersWindowProviderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "invite">("list");
  const [search, setSearch] = useState("");

  // Invitation form state (preserved while the window is open because children
  // stay mounted inside ActionWindow).
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("sales");
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<string | null>(null);

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canInvite = hasPermission(currentUserRole, "invite_members");
  const canManage = hasPermission(currentUserRole, "change_member_roles");
  const canRemove = hasPermission(currentUserRole, "remove_members");

  const pendingInvitations = useMemo(
    () => invitations.filter((i) => i.status === "pending"),
    [invitations]
  );

  // Immediate client-side filtering over fields that actually exist:
  // profile name and email.
  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const name = (member.profile.full_name ?? "").toLowerCase();
      const email =
        member.profile.email !== "—"
          ? member.profile.email.toLowerCase()
          : "";
      return name.includes(query) || email.includes(query);
    });
  }, [members, search]);

  // Success messages clear themselves shortly after appearing.
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const openWindow = (mode: "list" | "invite") => {
    setError(null);
    setSuccess(null);
    setView(canInvite && mode === "invite" ? "invite" : "list");
    setOpen(true);
  };

  /* ------------------------------ Mutations -------------------------------- */
  // All sensitive operations run through the existing authorized server
  // actions; this UI only reflects what the server allows.

  const handleRoleChange = (memberId: string, role: OrganizationRole) => {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberRoleAction(memberId, role);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Member role updated.");
      router.refresh();
    });
  };

  const confirmRemove = (memberId: string) => {
    setError(null);
    setMemberPendingRemoval(null);
    startTransition(async () => {
      const result = await removeMemberAction(memberId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Member removed.");
      router.refresh();
    });
  };

  const handleSendInvite = () => {
    setError(null);
    startTransition(async () => {
      const result = await createInvitationAction(inviteEmail.trim(), inviteRole);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Invitation sent.");
      setInviteEmail("");
      setView("list");
      router.refresh();
    });
  };

  const handleResend = (invitationId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await resendInvitationAction(invitationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Invitation resent.");
      router.refresh();
    });
  };

  const handleRevoke = (invitationId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await revokeInvitationAction(invitationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Invitation revoked.");
      router.refresh();
    });
  };

  const handleDeleteInvite = (invitationId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteInvitationAction(invitationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Invitation deleted.");
      router.refresh();
    });
  };


  /* -------------------------------- Render --------------------------------- */

  return (
    <MembersWindowContext.Provider value={{ openWindow }}>
      {children}

      <ActionWindow
        open={open}
        onClose={() => setOpen(false)}
        title="Members"
        description="Manage the people who have access to this workspace."
        busy={isPending}
        minimizable={false}
        closeLabel="Close members"
        size="lg"
      >
        {/* Contextual feedback */}
        {error && (
          <div
            role="alert"
            className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="shrink-0 rounded text-red-400 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        {success && (
          <div
            role="status"
            className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700"
          >
            {success}
          </div>
        )}


        {view === "invite" ? (
          /* ------------------------- Invitation state ------------------------ */
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteEmail.trim() || !inviteEmail.includes("@")) return;
              handleSendInvite();
            }}
          >
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
            />

            <div className="mt-4">
              <p className="mb-1.5 text-sm font-medium text-slate-700">Role</p>
              <div className="space-y-2">
                {INVITE_ROLE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-all duration-150 ${
                      inviteRole === option.value
                        ? "border-blue-300 bg-blue-50/60 ring-1 ring-blue-200"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="invite-role"
                      value={option.value}
                      checked={inviteRole === option.value}
                      onChange={() => setInviteRole(option.value)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className={`block text-sm font-medium ${inviteRole === option.value ? "text-blue-900" : "text-slate-900"}`}>
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setView("list")}
                disabled={isPending}
              >
                Back to members
              </Button>
              <Button
                type="submit"
                loading={isPending}
                disabled={!inviteEmail.trim() || !inviteEmail.includes("@")}
              >
                <MailIcon />
                Send invitation
              </Button>
            </div>
          </form>
        ) : (
          <MemberList
            members={members}
            filteredMembers={filteredMembers}
            search={search}
            setSearch={setSearch}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            canInvite={canInvite}
            canManage={canManage}
            canRemove={canRemove}
            isPending={isPending}
            pendingInvitations={pendingInvitations}
            memberPendingRemoval={memberPendingRemoval}
            setMemberPendingRemoval={setMemberPendingRemoval}
            onRoleChange={handleRoleChange}
            onConfirmRemove={confirmRemove}
            onOpenInvite={() => {
              setError(null);
              setView("invite");
            }}
            onResend={handleResend}
            onRevoke={handleRevoke}
            onDeleteInvite={handleDeleteInvite}
          />
        )}
      </ActionWindow>
    </MembersWindowContext.Provider>
  );
}

/* ========================================================================== */
/* Shared entry-point buttons (Phase 3)                                       */
/* ========================================================================== */

interface OpenMembersWindowButtonProps {
  /** Which initial state the window opens into. */
  mode: "list" | "invite";
  variant?: React.ComponentProps<typeof Button>["variant"] | "unstyled";
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  children: React.ReactNode;
}

/**
 * The single shared trigger used by EVERY member-management entry point.
 * All triggers share the same window, state, and animation — only the
 * initial mode differs.
 */
export function OpenMembersWindowButton({
  mode,
  variant = "primary",
  size,
  className,
  children,
}: OpenMembersWindowButtonProps) {
  const { openWindow } = useMembersWindow();

  if (variant === "unstyled") {
    return (
      <button type="button" onClick={() => openWindow(mode)} className={className}>
        {children}
      </button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => openWindow(mode)}
    >
      {children}
    </Button>
  );
}


/* ========================================================================== */
/* Member list (window body)                                                  */
/* ========================================================================== */

interface MemberListProps {
  members: OrganizationMemberWithProfile[];
  filteredMembers: OrganizationMemberWithProfile[];
  search: string;
  setSearch: (value: string) => void;
  currentUserId: string | null;
  currentUserRole: OrganizationRole | null;
  canInvite: boolean;
  canManage: boolean;
  canRemove: boolean;
  isPending: boolean;
  pendingInvitations: OrganizationInvitation[];
  memberPendingRemoval: string | null;
  setMemberPendingRemoval: (id: string | null) => void;
  onRoleChange: (memberId: string, role: OrganizationRole) => void;
  onConfirmRemove: (memberId: string) => void;
  onOpenInvite: () => void;
  onResend: (invitationId: string) => void;
  onRevoke: (invitationId: string) => void;
  onDeleteInvite: (invitationId: string) => void;
}

function MemberList({
  members,
  filteredMembers,
  search,
  setSearch,
  currentUserId,
  currentUserRole,
  canInvite,
  canManage,
  canRemove,
  isPending,
  pendingInvitations,
  memberPendingRemoval,
  setMemberPendingRemoval,
  onRoleChange,
  onConfirmRemove,
  onOpenInvite,
  onResend,
  onRevoke,
  onDeleteInvite,
}: MemberListProps) {
  return (
    <>
      {/* Search + primary action */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search members…"
          label="Search members"
          className="flex-1"
        />
        {canInvite && (
          <Button variant="secondary" className="shrink-0" onClick={onOpenInvite}>
            <PlusIcon />
            Invite member
          </Button>
        )}
      </div>

      {/* Empty workspace */}
      {members.length === 0 ? (
        <div className="py-10 text-center">
          <UsersIcon className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            You&apos;re the only member in this workspace.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Invite teammates to collaborate with you.
          </p>
          {canInvite && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={onOpenInvite}>
                <PlusIcon />
                Invite member
              </Button>
            </div>
          )}
        </div>
      ) : filteredMembers.length === 0 ? (
        /* No search matches */
        <div className="py-10 text-center" role="status">
          <SearchMissIcon />
          <p className="mt-3 text-sm font-semibold text-slate-800">No matches</p>
          <p className="mt-1 text-xs text-slate-500">
            No member matches &ldquo;{search.trim()}&rdquo;. Try a different name or email.
          </p>
        </div>
      ) : (
        <ul
          className="divide-y divide-slate-100"
          aria-label={`Showing ${filteredMembers.length} of ${members.length} members`}
        >
          {filteredMembers.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              canManage={canManage}
              canRemove={canRemove}
              isPending={isPending}
              confirmingRemove={memberPendingRemoval === member.id}
              setMemberPendingRemoval={setMemberPendingRemoval}
              onRoleChange={onRoleChange}
              onConfirmRemove={onConfirmRemove}
            />
          ))}
        </ul>
      )}

      {pendingInvitations.length > 0 && (
        <PendingInvitations
          invitations={pendingInvitations}
          canInvite={canInvite}
          isPending={isPending}
          onResend={onResend}
          onRevoke={onRevoke}
          onDeleteInvite={onDeleteInvite}
        />
      )}
    </>
  );
}


interface MemberRowProps {
  member: OrganizationMemberWithProfile;
  currentUserId: string | null;
  currentUserRole: OrganizationRole | null;
  canManage: boolean;
  canRemove: boolean;
  isPending: boolean;
  confirmingRemove: boolean;
  setMemberPendingRemoval: (id: string | null) => void;
  onRoleChange: (memberId: string, role: OrganizationRole) => void;
  onConfirmRemove: (memberId: string) => void;
}

function MemberRow({
  member,
  currentUserId,
  currentUserRole,
  canManage,
  canRemove,
  isPending,
  confirmingRemove,
  setMemberPendingRemoval,
  onRoleChange,
  onConfirmRemove,
}: MemberRowProps) {
  const isCurrentUser = currentUserId !== null && member.user_id === currentUserId;
  const name = member.profile.full_name || "Unknown";
  const canManageThisMember = canManage && canManageRole(currentUserRole, member.role);
  const canRemoveThisMember =
    canRemove && canManageRole(currentUserRole, member.role) && !isCurrentUser;

  // Only roles the actor may actually assign are offered — the server
  // enforces the same hierarchy rules regardless.
  const assignableRoles = INVITE_ROLE_OPTIONS.filter((option) =>
    canAssignRole(currentUserRole, option.value)
  );

  return (
    <li className="py-3 first:pt-1 last:pb-1">
      <div className="flex items-center gap-3">
        <Avatar src={member.profile.avatar_url} name={member.profile.full_name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-slate-900" title={name}>
              {name}
            </p>
            {isCurrentUser && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                You
              </span>
            )}
          </div>
          <p className="truncate text-xs text-slate-400">
            {member.profile.email !== "—"
              ? member.profile.email
              : member.profile.job_role ?? "Team member"}
          </p>
        </div>

        {canManageThisMember && assignableRoles.length > 0 ? (
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.id, e.target.value as OrganizationRole)}
            disabled={isPending}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium capitalize text-slate-700 transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
            aria-label={`Change role for ${name}`}
          >
            {!assignableRoles.some((o) => o.value === member.role) && (
              <option value={member.role} className="capitalize">
                {member.role}
              </option>
            )}
            {assignableRoles.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <RoleBadge role={member.role} className="shrink-0" />
        )}

        {canRemoveThisMember && !confirmingRemove && (
          <button
            type="button"
            onClick={() => setMemberPendingRemoval(member.id)}
            disabled={isPending}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>

      {/* Deliberate removal confirmation */}
      {confirmingRemove && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2">
          <p className="text-xs font-medium text-red-700">
            Remove {name} from the workspace?
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMemberPendingRemoval(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isPending}
              onClick={() => onConfirmRemove(member.id)}
            >
              Remove member
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}


interface PendingInvitationsProps {
  invitations: OrganizationInvitation[];
  canInvite: boolean;
  isPending: boolean;
  onResend: (invitationId: string) => void;
  onRevoke: (invitationId: string) => void;
  onDeleteInvite: (invitationId: string) => void;
}

function PendingInvitations({
  invitations,
  canInvite,
  isPending,
  onResend,
  onRevoke,
  onDeleteInvite,
}: PendingInvitationsProps) {
  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <MailIcon className="h-4 w-4 text-slate-400" />
        Pending invitations
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">
          {invitations.length}
        </span>
      </h3>
      <ul className="space-y-2">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{invitation.email}</p>
              <p className="truncate text-xs text-slate-400">
                <span className="capitalize">{invitation.role}</span>
                {" · "}
                Expires {formatExpiry(invitation.expires_at)}
              </p>
            </div>
            {canInvite && (
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => onResend(invitation.id)} disabled={isPending}>
                  Resend
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onRevoke(invitation.id)} disabled={isPending}>
                  Revoke
                </Button>
                <button
                  type="button"
                  onClick={() => onDeleteInvite(invitation.id)}
                  disabled={isPending}
                  aria-label={`Delete invitation for ${invitation.email}`}
                  className="rounded-md p-1 text-slate-400 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

