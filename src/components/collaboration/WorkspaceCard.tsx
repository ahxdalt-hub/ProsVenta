import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Organization } from "@/types/database";

interface WorkspaceCardProps {
  organization: Organization;
  memberCount: number;
  currentUserRole: string | null;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function WorkspaceCard({ organization, memberCount, currentUserRole }: WorkspaceCardProps) {
  const displayName = organization.name || "Untitled Workspace";
  const initials = getInitials(displayName);

  return (
    <Card className="overflow-hidden">
      <div className="h-20 bg-gradient-to-r from-navy-900 via-navy-800 to-blue-600 relative">
        <div className="absolute inset-0 grid-pattern opacity-20" />
      </div>
      <div className="px-6 pb-6">
        <div className="flex items-end gap-4 -mt-10">
          <div className="w-16 h-16 rounded-xl bg-white border-4 border-white shadow-lg flex items-center justify-center shrink-0">
            {organization.logo_url ? (
              <img src={organization.logo_url} alt={displayName} className="w-full h-full rounded-xl object-cover" />
            ) : (
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-navy-900 to-blue-600 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{initials}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold tracking-tight text-slate-900 truncate">{displayName}</h3>
              <Badge variant="success"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active</Badge>
            </div>
            {organization.website && (
              <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                {organization.website}
              </a>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Members</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{memberCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Plan</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 capitalize">{organization.subscription_plan}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Timezone</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{organization.timezone}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Created</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatDate(organization.created_at)}</p>
          </div>
        </div>

        {currentUserRole && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            You are a <span className="font-semibold text-slate-600 capitalize">{currentUserRole}</span> of this workspace
          </div>
        )}
      </div>
    </Card>
  );
}