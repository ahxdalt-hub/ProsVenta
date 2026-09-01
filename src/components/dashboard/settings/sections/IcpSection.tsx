import { getOrganizationDetails } from "@/lib/db/organizations";
import { getIcpConfiguration } from "@/lib/db/icp-scoring";
import {
  IcpSectionContent,
  type IcpViewModel,
} from "./IcpSectionContent";
import type { IcpCriteria } from "@/features/intelligence/scoring/types";

// ============================================================================
// IcpSection - Settings > ICP (routed page wrapper)
// ============================================================================
// Phase 2 rebuild: makes the intelligence understandable - who is Prosventa
// looking for, and why does a prospect receive its score. Reads the existing
// icp_configurations row (organization-scoped, RLS enforced); edits go through
// the preserved saveWorkspaceIcpAction which feeds the existing scoring engine.
//
// Phase 2 detail-panel architecture: all presentation lives in
// IcpSectionContent so the SAME content renders both here and inside the
// Settings detail panel. This file is the server data layer only.
// ============================================================================

export type { IcpViewModel };

/**
 * Loads the ICP view model on the preserved backend (icp_configurations,
 * saveWorkspaceIcpAction untouched). Used by this routed page AND by
 * /dashboard/settings to preload the panel content.
 */
export async function loadIcpViewModel(): Promise<IcpViewModel> {
  const details = await getOrganizationDetails();
  const orgId = details.membership?.organization_id ?? null;
  if (!orgId) return { hasWorkspace: false, config: null };
  const config = await getIcpConfiguration(orgId);
  return {
    hasWorkspace: true,
    config: config
      ? {
          name: config.name ?? null,
          description: config.description ?? null,
          criteria: (config.criteria as IcpCriteria | null) ?? null,
          updatedAt: config.updated_at ?? null,
        }
      : null,
  };
}

export async function IcpSection() {
  const vm = await loadIcpViewModel();
  return <IcpSectionContent vm={vm} />;
}
