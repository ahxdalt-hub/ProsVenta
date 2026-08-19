// ============================================================================
// Prosventa Intelligence Command Center — Page Container
// Stage 4 — Phase 10: Intelligence Command Center
// ============================================================================

import { CommandCenterClient } from "./CommandCenterClient";

export function CommandCenterPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Intelligence Command Center
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Prioritized intelligence from scoring, signals, recommendations, and workflows.
        </p>
      </div>
      <CommandCenterClient />
    </div>
  );
}