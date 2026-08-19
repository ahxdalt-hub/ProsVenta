"use client";

import { memo, useTransition } from "react";
import { cn } from "@/lib/utils";
import { RoleBadge } from "./RoleBadge";
import { Badge } from "@/components/ui/Badge";
import type { OrganizationRole } from "@/types/database";
import type { OrganizationMemberWithProfile } from "@/lib/db/organizations";

interface MemberCardProps {
  member: OrganizationMemberWithProfile;
  currentUserId: string;
  canManage: boolean;
  canRemove: boolean;
  onRoleChange?: (memberId: string, role: OrganizationRole) => void;
  onRemove?: (memberId: string) => void;
  showActions?: boolean;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatLastActive(dateString: string | null): string {
  if (!dateString) return "Never";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export const MemberCard = memo(function MemberCard({
  member,
  currentUserId,
  canManage,
  canRemove,
  onRoleChange,
  onRemove,
  showActions = true,
}: MemberCardProps) {
  const [isPending, startTransition] = useTransition();
  const isCurrentUser = member.user_id === currentUserId;
  const name = member.profile.full_name || "Unknown";
  const initials = getInitials(member.profile.full_name);

  const handleRoleChange = (role: OrganizationRole) => {
    if (!onRoleChange) return;
    startTransition(() => onRoleChange(member.id, role));
  };

  const handleRemove = () => {
    if (!onRemove) return;
    startTransition(() => onRemove(member.id));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm transition-all duration-150">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            {member.profile.avatar_url ? (
              <img src={member.profile.avatar_url} alt={name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-slate-600">{initials}</span>
            )}
          </div>
          {member.status === "active" && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 ring-2 ring-white" />
          )}
          {member.status === "invited" && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-amber-400 ring-2 ring-white" />
          )}
          {member.status === "suspended" && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-slate-400 ring-2 ring-white" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-900 truncate">{name}</h4>
            {isCurrentUser && (
              <span className="text-xs text-slate-400">(You)</span>
            )}
            <RoleBadge role={member.role} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500 truncate">
            {member.profile.email !== "—" ? member.profile.email : member.profile.job_role ?? "Team member"}
          </p>
          {member.profile.job_role && member.profile.email === "—" && (
            <p className="text-xs text-slate-400">{member.profile.job_role}</p>
          )}
        </div>

        {/* Actions */}
        {showActions && (canManage || isCurrentUser) && (
          <div className="shrink-0 flex flex-col items-end gap-2">
            {canManage && onRoleChange && (
              <select
                value={member.role}
                onChange={(e) => handleRoleChange(e.target.value as OrganizationRole)}
                disabled={isPending}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                aria-label={`Change role for ${name}`}
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="sales">Sales</option>
                <option value="viewer">Viewer</option>
              </select>
            )}
            {canRemove && onRemove && !isCurrentUser && (
              <button
                onClick={handleRemove}
                disabled={isPending}
                className="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors duration-150 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-slate-50 px-2 py-2">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Status</p>
          <p className={cn("mt-0.5 text-xs font-semibold capitalize", 
            member.status === "active" ? "text-green-600" : 
            member.status === "invited" ? "text-amber-600" : "text-slate-500"
          )}>
            {member.status}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-2">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Joined</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-700">{formatDate(member.created_at)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-2">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Last Active</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-700">{formatLastActive(member.last_active_at)}</p>
        </div>
      </div>
    </div>
  );
});