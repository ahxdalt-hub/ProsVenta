import type { ReactNode } from "react";
import Link from "next/link";
import { CREDIT_LABEL } from "@/features/credits/ui-config";
import { SettingsCard, SettingsCardHeader, SettingsRow } from "../SettingsCard";
import { OrganizationDangerZone } from "./OrganizationDangerZone";
import { OrganizationIdentityCard } from "./OrganizationIdentityCard";
import type { OrganizationRole } from "@/types/database";
import type { SubscriptionPlan } from "@/types/database";

// ============================================================================
// WorkspaceContent — presentational Organization settings content
// ============================================================================
// Phase 1 of the Settings detail-panel architecture: this is the reusable
// content layer for Settings › Organization. It receives a fully-loaded,
// serializable view model and performs no data access of its own, so it can
// be rendered by BOTH the routed page (/dashboard/settings/workspace, via
// WorkspaceSection) and the Settings detail panel. One source of truth.
// ============================================================================

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

/** Serializable view model produced by loadWorkspaceViewModel() (server-side). */
export interface WorkspaceViewModel {
  hasWorkspace: boolean;
  name: string | null;
  role: string | null;
  memberCount: number;
  createdAt: string | null;
  isOwner: boolean;
  /** Raw plan enum from the organization record (fallback label source). */
  subscriptionPlan: SubscriptionPlan;
  /** Plan name from billing summary; null when it could not be loaded. */
  planName: string | null;
  /** Shared wallet balance; null when it could not be loaded. */
  balance: number | null;
}

export function planLabel(plan: SubscriptionPlan): string {
  return PLAN_LABELS[plan] ?? plan;
}

function formatCredits(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US");
}

export function WorkspaceContent({ vm }: { vm: WorkspaceViewModel }) {
  if (!vm.hasWorkspace) {
    return (
      <SettingsCard>
        <p className="text-sm leading-relaxed text-slate-500">
          You aren&apos;t part of a workspace yet. Workspaces are created when you
          complete onboarding or when a teammate invites you to theirs.
        </p>
      </SettingsCard>
    );
  }

  const fallbackPlanName = PLAN_LABELS[vm.subscriptionPlan] ?? vm.subscriptionPlan;
  const canManage = vm.role === "owner" || vm.role === "admin";

  return (
    <div className="space-y-6">
      {/* Identity */}
      <OrganizationIdentityCard
        name={vm.name ?? ""}
        role={(vm.role as OrganizationRole) ?? null}
        memberCount={vm.memberCount}
        createdAt={vm.createdAt}
        canEdit={vm.isOwner}
      />

      {/* Workspace information */}
      <SettingsCard>
        <SettingsCardHeader
          title="Workspace"
          description="These details apply to everyone in your workspace."
          icon={<BuildingIcon />}
        />
        <div>
          <SettingsRow title="Name" description={vm.name ?? ""}><span /></SettingsRow>
          <SettingsRow
            title="Your role"
            description={
              vm.role === "owner"
                ? "You have full control of this workspace and its settings."
                : `You are ${vm.role ?? "a member"} of this workspace.`
            }
          />
          <SettingsRow
            title="Members"
            description={`${vm.memberCount} ${vm.memberCount === 1 ? "person has" : "people have"} access to this workspace.`}
          />
          {vm.planName && (
            <SettingsRow title="Plan" description={`This workspace is on the ${vm.planName} plan.`}>
              <span />
            </SettingsRow>
          )}
        </div>
      </SettingsCard>

      {/* Team entry point — management lives contextually in Organization */}
      <SettingsCard>
        <SettingsCardHeader
          title="Team"
          description="People in your workspace and their access."
          icon={<UsersIcon />}
          action={
            canManage && (
              <Link
                href="/dashboard/organization"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Invite teammates
              </Link>
            )
          }
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">Manage members</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">
              Roles, invitations and removal are handled on the Organization
              page.
            </p>
          </div>
          <Link
            href="/dashboard/organization"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Manage members
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>
      </SettingsCard>


      {/* Plan & credits context — links to the existing billing sections */}
      <SettingsCard>
        <SettingsCardHeader
          title="Plan &amp; credits"
          description="Where your workspace stands today."
          icon={<CreditIcon />}
        />
        <div>
          <SettingsRow
            title="Current plan"
            description={vm.planName ?? fallbackPlanName}
          >
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
              {vm.planName ?? fallbackPlanName}
            </span>
          </SettingsRow>
          <SettingsRow
            title={`${CREDIT_LABEL}s`}
            description={`${formatCredits(vm.balance)} credits available in the shared workspace wallet.`}
          >
            <span className="text-sm font-semibold tabular-nums text-slate-800">{formatCredits(vm.balance)}</span>
          </SettingsRow>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/dashboard/settings/plan-billing"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Manage billing
          </Link>
          <Link
            href="/dashboard/settings/credits"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            View credits &amp; usage
          </Link>
        </div>
      </SettingsCard>

      {/* Danger zone — real capability, owner only */}
      {vm.isOwner && <OrganizationDangerZone organizationName={vm.name ?? ""} />}
    </div>
  );
}

/* ------------------------------ Tiny icons ------------------------------- */

function IconSvg({ children }: { children: ReactNode }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function BuildingIcon() {
  return (
    <IconSvg>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
    </IconSvg>
  );
}

function UsersIcon() {
  return (
    <IconSvg>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </IconSvg>
  );
}

function CreditIcon() {
  return (
    <IconSvg>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </IconSvg>
  );
}

