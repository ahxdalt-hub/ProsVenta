"use client";

// ============================================================================
// Prosventa Intelligence Workspace — Today's Priorities (interactive)
// ============================================================================
// Phase 2: the interactive layer over the server-built priority records.
// Lightweight filtering (All / High / Medium / Low) and ordering
// (Priority / Recent / Highest fit) over the ALREADY ranked set — never a
// duplicate of the Prospects filtering system.
//
// Prospect connection: "Open prospect" reuses the EXISTING ProspectDetailPanel
// slide-over (same pattern as the Saved Lists workspace) — no second detail
// implementation. No fake actions: records without a linked prospect simply
// have no action button.
// ============================================================================

import { useMemo, useState } from "react";
import type { SavedList } from "@/types/database";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProspectDetailPanel } from "@/features/prospects/components/ProspectDetailPanel";
import { PriorityRowActions } from "./PriorityRowActions";
import {
  sortPriorityRecords,
  type DisplayPriority,
  type PriorityRecord,
  type PrioritiesSortMode,
} from "./priority-logic";

// ============================================================================
// Presentation helpers
// ============================================================================

const PRIORITY_INDICATOR: Record<DisplayPriority, { bar: string; badge: "danger" | "warning" | "neutral" }> = {
  high: { bar: "bg-amber-500", badge: "warning" },
  medium: { bar: "bg-blue-500", badge: "neutral" },
  low: { bar: "bg-slate-300", badge: "neutral" },
};

function formatUtc(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

// ============================================================================
// Priority record row — WHO / WHY / WHAT CHANGED / PRIORITY / ACTION
// Evidence (facts) and interpretation (reason) are visually distinct.
// ============================================================================

function PriorityRecordRow({
  record,
  onOpenProspect,
}: {
  record: PriorityRecord;
  onOpenProspect: (prospectId: string) => void;
}) {
  const indicator = PRIORITY_INDICATOR[record.priority];
  const timestamp = formatUtc(record.updatedAt);
  const hasEvidence = record.evidence.length > 0 || record.icpScore !== null;
  const [expanded, setExpanded] = useState(false);
  const hasDetail = Boolean(record.reasoning) || Boolean(timestamp);

  return (
    <li className="relative border-b border-slate-100 transition-colors duration-150 last:border-b-0 hover:bg-slate-50/70">
      {/* Priority indicator — color PLUS text (never color alone). */}
      <span className={`absolute inset-y-0 left-0 w-1 ${indicator.bar}`} aria-hidden="true" />

      <div className="flex flex-col gap-3 px-5 py-4 pl-6 sm:flex-row sm:items-start sm:gap-6">
        {/* WHO — identity */}
        <div className="min-w-0 sm:w-56 sm:shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={indicator.badge}>{record.priorityLabel} priority</Badge>
            {record.isPrimary && <Badge variant="primary">Top match</Badge>}
          </div>
          <p className="mt-1.5 truncate text-sm font-semibold text-slate-900">
            {record.displayName}
          </p>
          {record.contextLine && (
            <p className="truncate text-xs text-slate-400">{record.contextLine}</p>
          )}
        </div>

        {/* WHY + WHAT CHANGED — interpretation and evidence kept distinct */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-700">{record.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{record.reason}</p>

          {hasEvidence && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="sr-only">Evidence:</span>
              {record.icpScore !== null && (
                <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  ICP fit: {record.icpScore}
                </span>
              )}
              {record.evidence.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                >
                  {label}
                </span>
              ))}
              {record.latestChange && (
                <span className="inline-flex items-center gap-1.5 rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  {record.latestChange}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ACTION + status — one primary action, quiet secondary overflow */}
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:justify-between">
          <PriorityRowActions record={record} onOpenProspect={onOpenProspect} />
          <div className="flex items-center gap-2">
            {hasDetail && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
                aria-label={`${expanded ? "Hide" : "Show"} details for ${record.displayName}`}
                className="rounded text-xs font-medium text-slate-400 transition-colors duration-150 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {expanded ? "Hide details" : "Details"}
              </button>
            )}
            {!hasDetail && timestamp && <p className="text-xs text-slate-400">{timestamp} UTC</p>}
          </div>
        </div>
      </div>

      {/* Compact detail — stored reasoning + date, no new data invented. */}
      {expanded && (
        <div className="mx-5 mb-4 ml-6 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
          {record.reasoning && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Why it matters</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{record.reasoning}</p>
            </>
          )}
          {timestamp && (
            <p className={`${record.reasoning ? "mt-2" : ""} text-xs text-slate-400`}>
              Updated {timestamp} UTC
            </p>
          )}
        </div>
      )}
    </li>
  );
}

// ============================================================================
// Section workspace — filters, ordering, list and detail panel
// ============================================================================

type PriorityFilter = "all" | DisplayPriority;

const FILTERS: { id: PriorityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

const SORTS: { id: PrioritiesSortMode; label: string }[] = [
  { id: "priority", label: "Priority order" },
  { id: "recent", label: "Most recent" },
  { id: "fit", label: "Highest fit" },
];

interface PrioritiesWorkspaceProps {
  records: PriorityRecord[];
  counts: Record<DisplayPriority, number>;
  savedLists: SavedList[];
}

export function PrioritiesWorkspace({ records, counts, savedLists }: PrioritiesWorkspaceProps) {
  const [filter, setFilter] = useState<PriorityFilter>("all");
  const [sortMode, setSortMode] = useState<PrioritiesSortMode>("priority");
  const [detailProspectId, setDetailProspectId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const filtered =
      filter === "all" ? records : records.filter((r) => r.priority === filter);
    return sortPriorityRecords(filtered, sortMode);
  }, [records, filter, sortMode]);

  return (
    <>
      {/* Lightweight quick-prioritization controls */}
      {records.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter priorities">
            {FILTERS.map((f) => {
              const count = f.id === "all" ? records.length : counts[f.id];
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
                  <span className={`ml-1.5 ${active ? "text-white/70" : "text-slate-400"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="priorities-sort" className="text-xs font-medium text-slate-400">
              Sort
            </label>
            <select
              id="priorities-sort"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as PrioritiesSortMode)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors duration-150 hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="premium-card overflow-hidden">
        {visible.length > 0 ? (
          <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
            {visible.map((record) => (
              <PriorityRecordRow
                key={record.id}
                record={record}
                onOpenProspect={(id) => setDetailProspectId(id)}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            className="py-14"
            title={
              records.length === 0
                ? "No priority prospects yet"
                : `No ${filter === "all" ? "" : `${filter} `}priorities right now`
            }
            description={
              records.length === 0
                ? "Prosventa will surface prospects here when there is enough useful information — ICP fit, signals, or recent changes — to identify something worth your attention."
                : "Try a different priority level or switch back to all priorities."
            }
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8-5-3.6-5 3.6 1.9-5.8L4 8.8h6.1z" />
              </svg>
            }
          />
        )}
      </div>

      {/* Existing prospect detail experience — reused, never duplicated. */}
      <ProspectDetailPanel
        prospectId={detailProspectId}
        onClose={() => setDetailProspectId(null)}
        savedLists={savedLists}
      />
    </>
  );
}

