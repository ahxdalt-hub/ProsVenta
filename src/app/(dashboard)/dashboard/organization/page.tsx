import { createClient } from "@/lib/supabase/server";
import { ensureOrganization, getOrganizationDetails, getOrganizationMembers } from "@/lib/db/organizations";
import { OrganizationHeader } from "@/components/dashboard/organization/OrganizationHeader";
import { OrganizationProfileForm } from "@/components/dashboard/organization/OrganizationProfileForm";
import { RolesPermissions } from "@/components/dashboard/organization/RolesPermissions";
import { WorkspaceInfo } from "@/components/dashboard/organization/WorkspaceInfo";
import { WorkspaceActions } from "@/components/dashboard/organization/WorkspaceActions";
import { TeamMembersList } from "@/components/dashboard/organization/TeamMembersList";

export default async function DashboardOrganizationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Ensure the user has an organization (handles users who onboarded before this phase)
  await ensureOrganization();

  // Fetch organization details and members in parallel
  const [details, members] = await Promise.all([
    getOrganizationDetails(),
    getOrganizationMembers(),
  ]);

  const { organization, memberCount, currentUserRole, isOwner } = details;

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <path d="M9 22v-4h6v4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-900">No organization found</p>
          <p className="mt-1 text-xs text-slate-400">Please contact support if this issue persists.</p>
        </div>
      </div>
    );
  }

  // Fetch the owner's profile for display
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", organization.owner_id)
    .single();

  const ownerName = ownerProfile?.full_name ?? null;

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div className="dashboard-enter">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organization</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your workspace, team, and organization settings.</p>
      </div>

      {/* Organization Header */}
      <div className="dashboard-enter" style={{ animationDelay: "60ms" }}>
        <OrganizationHeader
          organization={organization}
          ownerName={ownerName}
          memberCount={memberCount}
          currentUserRole={currentUserRole}
        />
      </div>

      {/* Two-column layout: Profile + Roles on left, Info + Actions on right */}
      <div id="profile" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="dashboard-enter" style={{ animationDelay: "120ms" }}>
            <OrganizationProfileForm organization={organization} isOwner={isOwner} />
          </div>
          <div className="dashboard-enter" style={{ animationDelay: "180ms" }}>
            <TeamMembersList members={members} currentUserId={user.id} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="dashboard-enter" style={{ animationDelay: "120ms" }}>
            <WorkspaceInfo organization={organization} />
          </div>
          <div className="dashboard-enter" style={{ animationDelay: "180ms" }}>
            <RolesPermissions />
          </div>
        </div>
      </div>

      {/* Workspace Actions + Danger Zone */}
      <div className="dashboard-enter" style={{ animationDelay: "240ms" }}>
        <WorkspaceActions isOwner={isOwner} />
      </div>
    </div>
  );
}
