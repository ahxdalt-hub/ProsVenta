import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RoleBadge } from "@/components/collaboration/RoleBadge";
import type { OrganizationMemberWithProfile } from "@/lib/db/organizations";

interface TeamMembersListProps {
  members: OrganizationMemberWithProfile[];
  currentUserId: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function TeamMembersList({ members, currentUserId }: TeamMembersListProps) {
  return (
    <Card>
      <CardHeader
        title="Team Members"
        description={members.length + " " + (members.length === 1 ? "member" : "members") + " in this workspace"}
        icon={
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
        action={
          <Link href="/dashboard/organization/members">
            <Button variant="secondary" size="sm">
              View All
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Button>
          </Link>
        }
      />
      <div className="p-6 pt-4">
        {members.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
            </div>
            <p className="text-sm font-medium text-slate-900">No members yet</p>
            <p className="mt-1 text-xs text-slate-400">Invite teammates to collaborate in your workspace.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.slice(0, 5).map((member) => {
              const isCurrentUser = member.user_id === currentUserId;
              const name = member.profile.full_name || "Unknown";
              const initials = getInitials(member.profile.full_name);
              return (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors duration-150">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center shrink-0">
                    {member.profile.avatar_url ? (
                      <img src={member.profile.avatar_url} alt={name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-slate-600">{initials}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                      {isCurrentUser && <span className="text-xs text-slate-400">(You)</span>}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{member.profile.email}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <RoleBadge role={member.role} />
                    <span className="text-xs text-slate-400 hidden sm:inline">{formatDate(member.created_at)}</span>
                  </div>
                </div>
              );
            })}
            {members.length > 5 && (
              <div className="text-center pt-2">
                <Link href="/dashboard/organization/members" className="text-xs font-medium text-blue-600 hover:underline">View all {members.length} members</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
