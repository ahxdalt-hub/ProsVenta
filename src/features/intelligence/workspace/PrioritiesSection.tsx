// ============================================================================
// Prosventa Intelligence Workspace — Today's Priorities (container)
// ============================================================================
// Phase 2: the primary Intelligence experience. Priority records are built on
// the server from the EXISTING recommendation engine output (see
// priority-logic.ts) and rendered by the interactive PrioritiesWorkspace
// (filters, ordering, and the existing ProspectDetailPanel). When no real
// qualifying data exists, a calm empty state is shown — never fake records.
// ============================================================================

import { PrioritiesWorkspace } from "./PrioritiesWorkspace";
import type { DisplayPriority, PriorityRecord } from "./priority-logic";

interface PrioritiesSectionProps {
  records: PriorityRecord[];
  counts: Record<DisplayPriority, number>;
  savedLists: import("@/types/database").SavedList[];
}

export function PrioritiesSection({ records, counts, savedLists }: PrioritiesSectionProps) {
  return (
    <section aria-labelledby="priorities-heading" className="min-w-0">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <div>
          <h2 id="priorities-heading" className="text-lg font-bold tracking-tight text-slate-900">
            Today&apos;s priorities
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Prospects that may deserve your attention first — with the reasons why.
          </p>
        </div>
        {records.length > 0 && (
          <span className="shrink-0 text-xs font-medium text-slate-400">
            {records.length} item{records.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <PrioritiesWorkspace records={records} counts={counts} savedLists={savedLists} />
    </section>
  );
}
