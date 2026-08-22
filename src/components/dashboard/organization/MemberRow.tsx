"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { RoleBadge } from "@/components/collaboration/RoleBadge";
import { Badge } from "@/components/ui/Badge";
import { AnchoredMenu } from "./AnchoredMenu";
import { canAssignRole } from "@/features/collaboration/permissions";
import type { OrganizationRole } from "@/types/database";
import type { OrganizationMemberWithProfile } from "@/lib/db/organizations";

interface MemberRowProps {
  member: OrganizationMemberWithProfile;
  currentUserId: string;
  currentUserRole: OrganizationRole | null;
  canManage: boolean;
  canRemove: boolean;
  isPending?: boolean;
  onRequestRoleChange: (member: OrganizationMemberWithProfile, role: OrganizationRole) => void;
  onRequestRemove: (member: OrganizationMemberWithProfile) => void;
}

const ROLE_OPTIONS: { value: OrganizationRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Helps manage the workspace and its members." },
  { value: "manager", label: "Manager", description: "Manages prospects, lists, and team assignments." },
  { value: "sales", label: "Sales", description: "Uses Prosventa for day-to-day prospect work." },
  { value: "viewer", label: "Viewer", description: "Can view workspace data without making changes." },
];

function getInitials(name: string | null): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatJoined(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

export const MemberRow = memo(function MemberRow({
  member,
  currentUserId,
  currentUserRole,
  canManage,
  canRemove,
  isPending = false,
  onRequestRoleChange,
  onRequestRemove,
}: MemberRowProps) {
  const isCurrentUser = member.user_id === currentUserId;
  const isOwner = member.role === "owner";
  const name = member.profile.full_name || "Unknown";
  const initials = getInitials(member.profile.full_name);
  const email = member.profile.email;

  const canManageThisUser = !!currentUserRole && canManage && !isOwner;

  // Roles the current user is allowed to assign to this member.
  const assignableRoles =
    canManageThisUser && !isOwner && currentUserRole
      ? ROLE_OPTIONS.filter((option) => {
          if (option.value === member.role) return false;
          return canAssignRole(currentUserRole, option.value);
        })
      : [];

  const showRoleMenu = canManageThisUser && !isOwner && assignableRoles.length > 0;
  const showRemove = canRemove && !isCurrentUser && !isOwner;
  const showActions = showRoleMenu || showRemove || isCurrentUser;

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all duration-150",
        "hover:border-slate-300",
        isPending && "opacity-60"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300">
          {member.profile.avatar_url ? (
            <img
              src={member.profile.avatar_url}
              alt={name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-slate-600">{initials}</span>
          )}
        </div>
        {member.status === "active" && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" aria-hidden="true" />
        )}
        {member.status === "invited" && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" aria-hidden="true" />
        )}
        {member.status === "suspended" && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-slate-400 ring-2 ring-white" aria-hidden="true" />
        )}
      </div>

      {/* Identity — the strongest visual element */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          {isCurrentUser && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              You
            </span>
          )}
        </div>
        {email && email !== "—" ? (
          <a
            href={`mailto:${email}`}
            className="block truncate text-xs text-slate-400 transition-colors duration-150 hover:text-blue-600"
            title={email}
          >
            {email}
          </a>
        ) : (
          <p className="truncate text-xs text-slate-400">
            {member.profile.job_role || "Team member"}
          </p>
        )}
      </div>

      {/* Role */}
      <div className="flex shrink-0 items-center gap-2">
        {isOwner ? (
          <Badge variant="primary" className="capitalize">
            Owner
          </Badge>
        ) : (
          <RoleBadge role={member.role} />
        )}
        {isCurrentUser && (
          <span className="hidden text-xs font-medium text-slate-400 sm:inline">· You</span>
        )}
        {member.status !== "active" && (
          <span
            className={cn(
              "text-xs font-medium capitalize",
              member.status === "invited" ? "text-amber-600" : "text-slate-400"
            )}
          >
            {member.status}
          </span>
        )}
      </div>

      {/* Joined date (hidden on small screens) */}
      <span className="hidden w-24 shrink-0 text-right text-xs text-slate-400 md:inline">
        {formatJoined(member.created_at)}
      </span>

      {/* Actions */}
      {showActions && (
        <div className="shrink-0">
          <AnchoredMenu
            label={`Actions for ${name}`}
            width={216}
            trigger={({ open, toggle, ref }) => (
              <button
                ref={ref}
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="menu"
                disabled={isPending}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="19" cy="12" r="1.6" />
                </svg>
                <span className="sr-only">Actions for {name}</span>
              </button>
            )}
          >
            {(close) => (
              <>
                {showRoleMenu && (
                  <div className="px-1 pb-1 pt-1">
                    <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Change role
                    </p>
                    <div className="space-y-0.5">
                      {assignableRoles.map((option) => (
                        <button
                          key={option.value}
                          role="menuitem"
                          onClick={() => {
                            onRequestRoleChange(member, option.value);
                            close();
                          }}
                          className="flex w-full flex-col items-start rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-slate-100"
                        >
                          <span className="text-sm font-medium text-slate-700">{option.label}</span>
                          <span className="text-xs text-slate-400">{option.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isOwner && canManageThisUser && (
                  <div className="px-2 py-1.5">
                    <p className="text-xs leading-relaxed text-slate-400">
                      Owner management is restricted.
                    </p>
                  </div>
                )}

                {showRemove && (
                  <>
                    {showRoleMenu && <div className="my-1 border-t border-slate-100" />}
                    <button
                      role="menuitem"
                      onClick={() => {
                        onRequestRemove(member);
                        close();
                      }}
                      disabled={isPending}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-red-600 transition-colors duration-150 hover:bg-red-50 disabled:opacity-50"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Remove member
                    </button>
                  </>
                )}

                {isCurrentUser && (
                  <p className="px-2 py-1.5 text-xs text-slate-400">
                    This is you
                  </p>
                )}
              </>
            )}
          </AnchoredMenu>
        </div>
      )}
    </div>
  );
});