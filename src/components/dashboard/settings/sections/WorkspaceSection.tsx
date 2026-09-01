import { getOrganizationDetails } from "@/lib/db/organizations";
import { CreditService } from "@/features/credits/service";
import { EntitlementService } from "@/features/plans/service";
import {
  WorkspaceContent,
  planLabel,
  type WorkspaceViewModel,
} from "./WorkspaceContent";

// ============================================================================
// WorkspaceSection - Settings > Organization (routed page wrapper)
// ============================================================================
// Phase 1 of the Settings detail-panel architecture: all presentation moved to
// WorkspaceContent so the SAME content renders both here (/dashboard/settings/
// workspace) and inside the Settings detail panel. This file is now the server
// data layer: it loads the organization view model on the preserved backend
// (queries, actions, RLS untouched) and hands it to the shared content.
// ============================================================================

/**
 * Loads everything WorkspaceContent needs as a serializable view model.
 * Used by this routed page AND by /dashboard/settings to preload the panel
 * content. Plan/credit context failures degrade gracefully.
 */
export async function loadWorkspaceViewModel(): Promise<WorkspaceViewModel> {
  const details = await getOrganizationDetails();
  const org = details.organization;

  if (!org || !details.membership) {
    return {
      hasWorkspace: false,
      name: null,
      role: details.currentUserRole,
      memberCount: 0,
      createdAt: null,
      isOwner: false,
      subscriptionPlan: "free",
      planName: null,
      balance: null,
    };
  }

  const [walletResult, billingResult] = await Promise.allSettled([
    CreditService.getWallet(details.membership.organization_id),
    EntitlementService.getBillingSummary(details.membership.organization_id),
  ]);

  const balance =
    walletResult.status === "fulfilled"
      ? Number((walletResult.value as Record<string, unknown>).balance ?? NaN)
      : null;
  const planName =
    billingResult.status === "fulfilled"
      ? ((billingResult.value as { plan?: { name?: string } }).plan?.name ?? null)
      : null;

  return {
    hasWorkspace: true,
    name: org.name,
    role: details.currentUserRole,
    memberCount: details.memberCount,
    createdAt: org.created_at ?? null,
    isOwner: details.isOwner,
    subscriptionPlan: org.subscription_plan,
    planName: planName ?? planLabel(org.subscription_plan),
    balance: Number.isNaN(balance) ? null : balance,
  };
}

export async function WorkspaceSection() {
  const vm = await loadWorkspaceViewModel();
  return <WorkspaceContent vm={vm} />;
}
