import { Card, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { MembersSection } from "./MembersSection";
import type { OrganizationDetails } from "@/lib/db/organizations";
import type { OrganizationMemberWithProfile } from "@/lib/db/organizations";
import type { OrganizationInvitation, OrganizationRole } from "@/types/database";

interface OrganizationOverviewProps {
  details: OrganizationDetails;
  members: OrganizationMemberWithProfile[];
  invitations: OrganizationInvitation[];
  currentUserId: string;
  currentUserRole: OrganizationRole | null;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatCreatedDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function OrganizationOverview({
  details,
  members,
  invitations,
  currentUserId,
  currentUserRole,
}: OrganizationOverviewProps) {
  const { organization } = details;

  // Error state — organization data could not be loaded
  if (!organization) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="dashboard-enter">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Organization
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your workspace.
          </p>
        </div>
        <div className="dashboard-enter" style={{ animationDelay: "60ms" }}>
          <Alert variant="error" title={"Couldn't load this workspace"}>
            {"We couldn't load the workspace information. Please try again."}
          </Alert>
        </div>
      </div>
    );
  }

  const displayName = organization.name || "Untitled Workspace";
  const initials = getInitials(displayName);
  const slug = deriveSlug(displayName);
  const createdDate = formatCreatedDate(organization.created_at);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page header */}
      <div className="dashboard-enter">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Organization
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your workspace.
        </p>
      </div>

      {/* Organization identity */}
      <div className="dashboard-enter" style={{ animationDelay: "60ms" }}>
        <Card as="section" className="overflow-hidden" aria-label="Organization identity">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-5">
              <div
                className="avatar-enter flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-sm"
                aria-hidden="true"
              >
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt=""
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold tracking-tight">
                    {initials}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {displayName}
                </h2>
                {organization.description && (
                  <p className="mt-1 text-sm text-slate-500">
                    {organization.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Workspace information */}
      <div className="dashboard-enter" style={{ animationDelay: "120ms" }}>
        <Card as="section" aria-label="Workspace information">
          <CardHeader
            title="Workspace information"
            description="Basic details about this workspace"
            icon={
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            }
          />
          <div className="p-6 pt-4">
            <dl className="divide-y divide-slate-100">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-slate-500">Organization name</dt>
                <dd className="text-right text-sm font-semibold text-slate-900">
                  {displayName}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-slate-500">Workspace identifier</dt>
                <dd className="text-right font-mono text-sm font-semibold text-slate-900">
                  {slug}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-slate-500">Created</dt>
                <dd className="text-right text-sm font-semibold text-slate-900">
                  {createdDate}
                </dd>
              </div>
            </dl>
          </div>
        </Card>
      </div>

      {/* Members & invitations */}
      <MembersSection
        members={members}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        invitations={invitations}
      />
    </div>
  );
}
