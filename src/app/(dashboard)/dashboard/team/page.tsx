import { createClient } from "@/lib/supabase/server";
import { ensureOrganization, getOrganizationDetails, getOrganizationMembers } from "@/lib/db/organizations";
import { getTeamDashboardData, getActivityFeed } from "@/lib/db/collaboration";
import { Card, CardHeader } from "@/components/ui/Card";
import { ActivityFeed } from "@/components/collaboration/ActivityFeed";
import { RoleBadge } from "@/components/collaboration/RoleBadge";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function TeamDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  await ensureOrganization();

  const [details, members, teamData, activity] = await Promise.all([
    getOrganizationDetails(),
    getOrganizationMembers(),
    getTeamDashboardData(),
    getActivityFeed(20),
  ]);

  const { organization, currentUserRole } = details;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="dashboard-enter">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          {organization?.name ?? "Your workspace"} — collaboration overview
        </p>
      </div>

      {/* Metrics */}
      <div className="dashboard-enter grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ animationDelay: "60ms" }}>
        <MetricCard
          label="Active Members"
          value={teamData.activeMembers}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          }
          color="blue"
        />
        <MetricCard
          label="Assigned Prospects"
          value={teamData.totalAssignedProspects}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
          }
          color="green"
        />
        <MetricCard
          label="Activity (7d)"
          value={teamData.recentActivityCount}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
          }
          color="purple"
        />
        <MetricCard
          label="Unread Notifications"
          value={teamData.unreadNotifications}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          }
          color="amber"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Team members + assignments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Team members */}
          <div className="dashboard-enter" style={{ animationDelay: "120ms" }}>
            <Card>
              <CardHeader
                title="Team Members"
                description={`${members.length} ${members.length === 1 ? "member" : "members"} in this workspace`}
                icon={
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                }
              />
              <div className="p-6 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members.map((member) => {
                    const isCurrentUser = member.user_id === user.id;
                    const name = member.profile.full_name || "Unknown";
                    const initials = (name.split(" ").map((n) => n[0]).join("").slice(0, 2)).toUpperCase();
                    const assignedCount = teamData.assignedByMember.find((a) => a.user_id === member.user_id)?.count ?? 0;
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
                          <div className="flex items-center gap-2 mt-0.5">
                            <RoleBadge role={member.role} />
                            <span className="text-xs text-slate-400">{assignedCount} assigned</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* Assignments breakdown */}
          <div className="dashboard-enter" style={{ animationDelay: "180ms" }}>
            <Card>
              <CardHeader
                title="Prospect Assignments"
                description="Distribution of assigned prospects across the team"
                icon={
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
                }
              />
              <div className="p-6 pt-4">
                {teamData.assignedByMember.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    No prospects assigned yet. Assign prospects to team members to see the breakdown.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {teamData.assignedByMember.map((assignment) => {
                      const maxCount = Math.max(...teamData.assignedByMember.map((a) => a.count));
                      const percentage = maxCount > 0 ? (assignment.count / maxCount) * 100 : 0;
                      return (
                        <div key={assignment.user_id} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-slate-700 w-32 truncate">
                            {assignment.full_name ?? "Unknown"}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900 w-8 text-right">
                            {assignment.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Right: Activity feed */}
        <div className="dashboard-enter space-y-6" style={{ animationDelay: "120ms" }}>
          <Card>
            <CardHeader
              title="Recent Activity"
              description="Latest team actions"
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              }
            />
            <div className="p-6 pt-4">
              <ActivityFeed events={activity} limit={15} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "purple" | "amber";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}