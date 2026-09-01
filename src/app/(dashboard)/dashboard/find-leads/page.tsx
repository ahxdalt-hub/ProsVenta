// ============================================================================
// Prosventa Find Matching Leads — Page
// ============================================================================
// Phase 1: wide discovery workspace foundation.
// Loads the organization's active ICP through the existing RLS-scoped data
// layer and hands off to the client workspace. Discovery runs through the
// existing provider abstraction (src/features/prospects/providers) in a
// later phase — no fake results are rendered here.
// ============================================================================

import { getWorkspaceIcpAction } from "@/features/intelligence/scoring/icp-actions";
import { FindLeadsWorkspace } from "@/features/prospects/components/discovery/FindLeadsWorkspace";
import { summarizeIcpCriteria } from "@/features/prospects/components/discovery/icp-summary";
import { deriveDiscoveryDefaults } from "@/features/prospects/components/discovery/discovery-defaults";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Find Matching Leads - Prosventa",
};

export default async function FindMatchingLeadsPage() {
  const { config } = await getWorkspaceIcpAction();
  const icp = config ? summarizeIcpCriteria(config) : null;
  const defaults = deriveDiscoveryDefaults(icp);

  return <FindLeadsWorkspace icp={icp} defaults={defaults} />;
}
