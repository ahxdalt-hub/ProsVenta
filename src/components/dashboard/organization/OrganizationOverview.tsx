import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/collaboration/RoleBadge";
import { MembersWindowProvider, OpenMembersWindowButton } from "@/components/dashboard/organization/MembersWindowHost";
import {
  ROLE_DEFINITIONS,
  hasPermission,
} from "@/features/collaboration/permissions";
import type {
  OrganizationDetails,
  OrganizationMemberWithProfile,
} from "@/lib/db/organizations";
import type {
  OrganizationInvitation,
  OrganizationRole,
  SubscriptionPlan,
} from "@/types/database";

// ============================================================================
// Organization Overview
// ============================================================================
// Server-rendered control page for the user's Prosventa workspace: an identity
// header (who owns / manages this workspace), a real-data at-a-glance strip,
// organization profile, workspace context, and a team summary. Member management
// is contextual here (Phase 2): the hero's "Manage members" / "Invite member"
// actions open the in-page Members window (MembersWindowHost) instead of
// navigating away. The legacy /dashboard/organization/members route now
// simply redirects back here.
// All data comes from real organization queries — no placeholder content.
// ============================================================================

interface OrganizationOverviewProps {
  details: OrganizationDetails;
  members: OrganizationMemberWithProfile[];
  invitations: OrganizationInvitation[];
  currentUserId: string | null;
  currentUserRole: OrganizationRole | null;
}

/** How many members appear as preview tiles in the team summary. */
const MEMBER_PREVIEW_LIMIT = 6;
/** How many avatars appear in the overlapping avatar stack. */
const AVATAR_STACK_LIMIT = 5;

/* ----------------------------- Small helpers ----------------------------- */

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatMonthYear(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const PLAN_BADGE_VARIANTS: Record<
  SubscriptionPlan,
  "neutral" | "default" | "success" | "primary"
> = {
  free: "neutral",
  pro: "default",
  business: "success",
  enterprise: "primary",
};

/* ------------------------------ Tiny icons ------------------------------- */
/* Inline SVGs matching the existing stroke style (1.75 / round caps). */

function ChipIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function BuildingIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
    </svg>
  );
}

function GlobeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function UsersIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function UserCheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  );
}

function MailIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* --------------------------- Reusable fragments -------------------------- */

function HeroChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-xs">
      {icon}
      {children}
    </span>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{children}</dd>
    </div>
  );
}

function NotSet() {
  return <span className="font-normal text-slate-400">Not set</span>;
}

function MemberAvatar({
  member,
  size = "md",
}: {
  member: OrganizationMemberWithProfile;
  size?: "md" | "lg";
}) {
  const dimension = size === "lg" ? "h-10 w-10" : "h-9 w-9";
  return (
    <div className={`relative shrink-0 ${dimension}`}>
      <Avatar
        src={member.profile.avatar_url}
        name={member.profile.full_name}
        size="lg"
        className="h-full w-full"
      />
      {member.status === "active" && (
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white"
          aria-hidden="true"
        />
      )}
      {member.status === "invited" && (
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white"
          aria-hidden="true"
        />
      )}
      {member.status === "suspended" && (
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-slate-400 ring-2 ring-white"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/* ========================================================================== */
/* Component                                                                  */
/* ========================================================================== */

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
      <div className="space-y-8">
        <div className="dashboard-enter">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Organization
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
            Your workspace
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Company details, workspace context, and the people collaborating in
            this workspace.
          </p>
        </div>
        <div className="dashboard-enter" style={{ animationDelay: "60ms" }}>
          <Alert variant="error" title={"Couldn't load this workspace"}>
            {
              "We couldn't load the workspace information. Refresh the page to try again — if this keeps happening, contact your workspace owner."
            }
          </Alert>
        </div>
      </div>
    );
  }

  /* ------------------------------ Derived data ----------------------------- */

  const displayName = organization.name || "Untitled Workspace";
  const initials = getInitials(displayName);
  const createdMonthYear = formatMonthYear(organization.created_at);
  const createdFull = formatDate(organization.created_at);
  const updatedFull = formatDate(organization.updated_at);

  const activeMemberCount = members.filter(
    (member) => member.status === "active"
  ).length;
  const pendingInvitationCount = invitations.filter(
    (invitation) => invitation.status === "pending"
  ).length;

  // Role distribution across the team (real counts, hierarchy order)
  const roleMix = (
    ["owner", "admin", "manager", "sales", "viewer"] as const
  )
    .map((role) => ({
      role,
      label: ROLE_DEFINITIONS[role].label,
      count: members.filter((member) => member.role === role).length,
    }))
    .filter((entry) => entry.count > 0);

  // Workspace owner (from real member records)
  const ownerMember = members.find((member) => member.role === "owner");

  // Invite is only offered when the current role actually supports it
  const canInvite = hasPermission(currentUserRole, "invite_members");

  const previewMembers = members.slice(0, MEMBER_PREVIEW_LIMIT);
  const remainingMembers = Math.max(
    members.length - previewMembers.length,
    0
  );
  const stackAvatars = members.slice(0, AVATAR_STACK_LIMIT);
  const stackRemainder = Math.max(members.length - stackAvatars.length, 0);

  const hasMetaChips = Boolean(
    organization.industry || organization.country || organization.created_at
  );
  const hasMetaRow = hasMetaChips || Boolean(ownerMember);

  /* --------------------------------- Render -------------------------------- */

  return (
    <MembersWindowProvider
      members={members}
      invitations={invitations}
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
    >
    <div className="space-y-6 sm:space-y-8">
      {/* ============================ Hero / header ============================ */}
      <header className="dashboard-enter">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Organization avatar — logo when available, initials otherwise */}
            <div
              className="avatar-enter flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-navy-900 text-white shadow-sm ring-1 ring-slate-900/5 sm:h-20 sm:w-20"
              aria-hidden="true"
            >
              {organization.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold tracking-tight sm:text-2xl">
                  {initials}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Organization
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                  {displayName}
                </h1>
                {currentUserRole && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-2.5 pr-1.5 shadow-xs">
                    <span className="text-[11px] font-medium text-slate-500">
                      Your role
                    </span>
                    <RoleBadge role={currentUserRole} />
                  </span>
                )}
              </div>

              {organization.description ? (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                  {organization.description}
                </p>
              ) : (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                  Company details, workspace context, and the people
                  collaborating in this workspace.
                </p>
              )}

              {hasMetaRow && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* Managed by — answers "who runs this workspace" at a glance */}
                  {ownerMember && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 shadow-xs">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-200 to-slate-300">
                        {ownerMember.profile.avatar_url ? (
                          <img
                            src={ownerMember.profile.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-600">
                            {ownerMember.profile.full_name
                              ? getInitials(ownerMember.profile.full_name)
                              : "?"}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-slate-500">
                        Managed by{" "}
                        <span className="font-semibold text-slate-800">
                          {ownerMember.profile.full_name || "workspace owner"}
                        </span>
                      </span>
                    </span>
                  )}
                  {organization.industry && (
                    <HeroChip
                      icon={
                        <ChipIcon>
                          <BuildingIcon className="h-3.5 w-3.5" />
                        </ChipIcon>
                      }
                    >
                      <span className="capitalize">{organization.industry}</span>
                    </HeroChip>
                  )}
                  {organization.country && (
                    <HeroChip
                      icon={
                        <ChipIcon>
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </ChipIcon>
                      }
                    >
                      {organization.country}
                    </HeroChip>
                  )}
                  <HeroChip
                    icon={
                      <ChipIcon>
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </ChipIcon>
                    }
                  >
                    Since {createdMonthYear}
                  </HeroChip>
                </div>
              )}
            </div>
          </div>

          {/* Actions — primary workspace action first, invite where supported.
              Both open the shared in-page Members window (Phase 3) instead of
              navigating to the legacy members page. */}
          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:shrink-0">
            {canInvite && (
              <OpenMembersWindowButton
                mode="invite"
                variant="secondary"
                className="w-full sm:w-auto"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Invite member
              </OpenMembersWindowButton>
            )}
            <OpenMembersWindowButton
              mode="list"
              variant="primary"
              className="w-full sm:w-auto"
            >
              <UsersIcon />
              Manage members
              <ArrowRightIcon />
            </OpenMembersWindowButton>
          </div>
        </div>
      </header>

      {/* ========================= At-a-glance stat strip ====================== */}
      {/* All figures are derived from real organization/member/invitation data */}
      <section
        aria-label="Workspace at a glance"
        className="dashboard-enter"
        style={{ animationDelay: "60ms" }}
      >
        <Card as="div" className="overflow-hidden">
          <div className="grid grid-cols-3 gap-px bg-slate-200/70">
            {/* Members */}
            <div className="bg-white p-4 sm:p-6">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <UsersIcon className="h-3.5 w-3.5" />
                Members
              </p>
              <p className="mt-2.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {members.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {members.length === 1
                  ? "Person with workspace access"
                  : "People with workspace access"}
              </p>
            </div>

            {/* Active members */}
            <div className="bg-white p-4 sm:p-6">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <UserCheckIcon className="h-3.5 w-3.5" />
                Active
              </p>
              <p className="mt-2.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {activeMemberCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">Confirmed active seats</p>
            </div>

            {/* Pending invitations */}
            <div className="bg-white p-4 sm:p-6">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <MailIcon className="h-3.5 w-3.5" />
                Invitations
              </p>
              <p className="mt-2.5 flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {pendingInvitationCount}
                {pendingInvitationCount > 0 && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-500"
                    aria-label="Awaiting response"
                  />
                )}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {pendingInvitationCount > 0
                  ? "Awaiting response"
                  : "Nothing awaiting response"}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* ============================= Main content ============================= */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* ---------------------- Organization profile ---------------------- */}
        <section
          aria-label="Organization profile"
          className="dashboard-enter lg:col-span-7"
          style={{ animationDelay: "120ms" }}
        >
          <Card as="article" className="h-full">
            <CardHeader
              title="Organization profile"
              description="Identity and company details for this workspace"
              icon={<BuildingIcon />}
              action={
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit in Settings
                </Link>
              }
            />
            <div className="p-6 pt-5">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <DetailField label="Organization name">
                  {displayName}
                </DetailField>
                <DetailField label="Website">
                  {organization.website ? (
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-blue-600 transition-colors duration-150 hover:text-blue-700 hover:underline"
                    >
                      {organization.website}
                    </a>
                  ) : (
                    <NotSet />
                  )}
                </DetailField>
                <DetailField label="Industry">
                  {organization.industry ? (
                    <span className="capitalize">{organization.industry}</span>
                  ) : (
                    <NotSet />
                  )}
                </DetailField>
                <DetailField label="Country">
                  {organization.country || <NotSet />}
                </DetailField>
                <DetailField label="Created">{createdFull}</DetailField>
                <DetailField label="Last updated">{updatedFull}</DetailField>
              </dl>
            </div>
          </Card>
        </section>

        {/* -------------------- Workspace information ----------------------- */}
        <section
          aria-label="Workspace information"
          className="dashboard-enter lg:col-span-5"
          style={{ animationDelay: "180ms" }}
        >
          <Card as="article" className="h-full">
            <CardHeader
              title="Workspace"
              description="Regional and account context"
              icon={<GlobeIcon />}
            />
            <div className="p-6 pt-5">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <DetailField label="Timezone">
                  <span className="block truncate" title={organization.timezone}>
                    {organization.timezone}
                  </span>
                </DetailField>
                <DetailField label="Default currency">
                  {organization.default_currency}
                </DetailField>
                <DetailField label="Subscription plan">
                  <Badge
                    variant={PLAN_BADGE_VARIANTS[organization.subscription_plan]}
                  >
                    <span className="capitalize">
                      {organization.subscription_plan}
                    </span>
                  </Badge>
                </DetailField>
                <DetailField label="Members">
                  {members.length}{" "}
                  <span className="font-normal text-slate-400">
                    {members.length === 1 ? "person" : "people"}
                  </span>
                </DetailField>
              </dl>

              {/* Workspace owner */}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Workspace owner
                </p>
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-200 to-slate-300">
                    {ownerMember?.profile.avatar_url ? (
                      <img
                        src={ownerMember.profile.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-600">
                        {ownerMember?.profile.full_name
                          ? getInitials(ownerMember.profile.full_name)
                          : "?"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {ownerMember?.profile.full_name || "Unknown"}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {ownerMember?.profile.job_role ||
                        "Full control of this workspace"}
                    </p>
                  </div>
                  <RoleBadge role="owner" className="shrink-0" />
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ------------------------- Team members ---------------------------- */}
        <section
          aria-label="Team members"
          className="dashboard-enter lg:col-span-12"
          style={{ animationDelay: "240ms" }}
        >
          <Card as="article">
            <CardHeader
              title="Team members"
              description="Manage the people who have access to this workspace."
              icon={<UsersIcon />}
              action={
                <OpenMembersWindowButton mode="list" variant="secondary" size="sm">
                  Manage members
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </OpenMembersWindowButton>
              }
            />
            <div className="p-6 pt-5">
              {members.length === 0 ? (
                /* Polished empty state — no members yet */
                <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <UsersIcon className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-900">
                    No members yet
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                    Invite teammates so they can collaborate on prospects,
                    lists, and shared views with you in Prosventa.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <OpenMembersWindowButton mode="list" variant="secondary" size="sm">
                      Go to member management
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </OpenMembersWindowButton>
                  </div>
                </div>
              ) : (
                <>
                  {/* Avatar stack + pending invitations + role mix */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex -space-x-2" aria-hidden="true">
                      {stackAvatars.map((member) => (
                        <div
                          key={member.id}
                          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-200 to-slate-300 ring-2 ring-white"
                        >
                          {member.profile.avatar_url ? (
                            <img
                              src={member.profile.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-600">
                              {member.profile.full_name
                                ? getInitials(member.profile.full_name)
                                : "?"}
                            </span>
                          )}
                        </div>
                      ))}
                      {stackRemainder > 0 && (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 ring-2 ring-white">
                          <span className="text-[11px] font-semibold text-slate-500">
                            +{stackRemainder}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {pendingInvitationCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-amber-500"
                            aria-hidden="true"
                          />
                          {pendingInvitationCount} pending{" "}
                          {pendingInvitationCount === 1
                            ? "invitation"
                            : "invitations"}
                        </span>
                      )}
                      {roleMix.map((entry) => (
                        <span
                          key={entry.role}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                        >
                          {entry.count} {entry.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Member preview tiles */}
                  <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {previewMembers.map((member) => {
                      const name = member.profile.full_name || "Unknown";
                      const isCurrentUser =
                        currentUserId !== null &&
                        member.user_id === currentUserId;
                      return (
                        <li
                          key={member.id}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                        >
                          <MemberAvatar member={member} size="lg" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p
                                className="truncate text-sm font-semibold text-slate-900"
                                title={name}
                              >
                                {name}
                              </p>
                              {isCurrentUser && (
                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-slate-400">
                              {member.profile.job_role ||
                                `Joined ${formatMonthYear(member.created_at)}`}
                            </p>
                          </div>
                          <RoleBadge role={member.role} className="shrink-0" />
                        </li>
                      );
                    })}
                    {remainingMembers > 0 && (
                      <li>
                        <OpenMembersWindowButton
                          mode="list"
                          variant="unstyled"
                          className="flex h-full min-h-[64px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-3.5 text-sm font-semibold text-slate-500 transition-colors duration-150 hover:border-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          View {remainingMembers} more{" "}
                          {remainingMembers === 1 ? "member" : "members"}
                          <ArrowRightIcon className="h-4 w-4" />
                        </OpenMembersWindowButton>
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
    </MembersWindowProvider>
  );
}