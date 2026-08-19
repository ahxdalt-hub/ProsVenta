import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Organization } from "@/types/database";

interface OrganizationHeaderProps {
  organization: Organization;
  ownerName: string | null;
  memberCount: number;
  currentUserRole: string | null;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function OrganizationHeader({
  organization,
  ownerName,
  memberCount,
  currentUserRole,
}: OrganizationHeaderProps) {
  const displayName = organization.name || "Untitled Workspace";
  const initials = getInitials(displayName);

  return (
    <Card className="overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-navy-900 via-navy-800 to-blue-600 relative">
        <div className="absolute inset-0 grid-pattern opacity-20" />
      </div>
      <div className="px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center shrink-0">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt={displayName} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-navy-900 to-blue-600 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{initials}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{displayName}</h1>
              <Badge variant="success"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active</Badge>
            </div>
            {organization.description && (
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{organization.description}</p>
            )}
          </div>
          <div className="shrink-0">
            <Badge variant="neutral" className="px-3 py-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              Free Plan
            </Badge>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Workspace ID</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 font-mono truncate">{organization.id.slice(0, 8)}...</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Created</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(organization.created_at)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Owner</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{ownerName || "Unknown"}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Members</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{memberCount} {memberCount === 1 ? "member" : "members"}</p>
          </div>
        </div>
        {currentUserRole && (
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            You are a <span className="font-semibold text-slate-600 capitalize">{currentUserRole}</span> of this workspace
          </div>
        )}
      </div>
    </Card>
  );
}
