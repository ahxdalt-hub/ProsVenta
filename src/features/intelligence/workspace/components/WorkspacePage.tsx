// ============================================================================
// Prosventa Intelligence Workspace — Page Container
// Stage 5 — Phase 3: Intelligence Workspace
// ============================================================================
// Server component that reads the `prospect` URL param and renders the
// workspace client. When no prospect is selected, the client shows the
// selector + empty state (never a blank page).
// ============================================================================

import { WorkspaceClient } from "./WorkspaceClient";

export function WorkspacePage({
  prospectId,
}: {
  prospectId: string | null;
}) {
  return (
    <div className="space-y-8">
      <WorkspaceClient initialProspectId={prospectId} />
    </div>
  );
}