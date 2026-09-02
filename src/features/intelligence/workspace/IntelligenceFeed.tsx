"use client";

// ============================================================================
// Prosventa Intelligence Workspace — Intelligence Feed (interactive)
// ============================================================================
// Phase 3: the interactive layer over the server-loaded signal records.
// Lightweight intelligence-specific filtering (only categories that actually
// exist in the loaded data), vertically scrollable, stable row heights, and
// reuse of the EXISTING detail experiences:
//   • SignalDetailWindow — stored normalized evidence + source transparency
//   • ProspectDetailPanel — the existing prospect detail slide-over
// No fake events, no duplicate detail implementations.
// ============================================================================

import { useMemo, useState } from "react";
import type { SavedList } from "@/types/database";
import { ProspectDetailPanel } from "@/features/prospects/components/ProspectDetailPanel";
import { SignalDetailWindow } from "@/features/intelligence/signals/components/SignalDetailWindow";
import type { SignalRecord } from "@/features/intelligence/signals/types";
import {
  buildFeedFilters,
  filterFeedSignals,
  type FeedFilterId,
} from "./feed-logic";
import { IntelligenceItem } from "./IntelligenceItem";

export interface IntelligenceFeedProps {
  signals: SignalRecord[];
  savedLists: SavedList[];
}

export function IntelligenceFeed({ signals, savedLists }: IntelligenceFeedProps) {
  const [filter, setFilter] = useState<FeedFilterId>("all");
  const [detailProspectId, setDetailProspectId] = useState<string | null>(null);
  const [detailSignal, setDetailSignal] = useState<SignalRecord | null>(null);

  const filters = useMemo(() => buildFeedFilters(signals), [signals]);
  const visible = useMemo(() => filterFeedSignals(signals, filter), [signals, filter]);

  return (
    <>
      {/* Lightweight filters — quick intelligence exploration, NOT the
          Prospects filter system. */}
      {filters.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter intelligence feed">
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  active
                    ? "bg-navy-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {f.label}
                <span className={`ml-1.5 ${active ? "text-white/70" : "text-slate-400"}`}>{f.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="premium-card overflow-hidden">
        {visible.length > 0 ? (
          <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto" aria-label="Intelligence events">
            {visible.map((signal) => (
              <li key={signal.id} className="p-0">
                <IntelligenceItem
                  signal={signal}
                  onOpenProspect={signal.prospect_id ? (id) => setDetailProspectId(id) : undefined}
                  onOpenDetails={(s) => setDetailSignal(s)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            No events match this filter. Try another category or switch back to all.
          </p>
        )}
      </div>

      {/* Existing detail experiences — reused, never duplicated. */}
      <SignalDetailWindow signal={detailSignal} onClose={() => setDetailSignal(null)} />
      <ProspectDetailPanel
        prospectId={detailProspectId}
        onClose={() => setDetailProspectId(null)}
        savedLists={savedLists}
      />
    </>
  );
}
