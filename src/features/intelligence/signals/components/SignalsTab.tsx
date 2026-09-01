"use client";

// ============================================================================
// Prosventa Signals UX — Signals Tab
// Feature 3 — Phase 3: Signals User Experience, Evidence & Interaction
// ============================================================================
// The complete Signals experience inside ProspectDetailPanel:
//   • overview stats        → real server-side counts, nothing decorative
//   • filtering             → category / freshness / status
//   • sorting               → newest / freshest / most important (server-side)
//   • search                → lightweight, over the loaded bounded page
//   • timeline view         → chronological grouping from REAL timestamps
//   • pagination            → bounded "Load more" pages, never full history
//   • states                → distinct loading skeleton / empty / error
// No fake or demo signals are ever produced here.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListTree, RefreshCcw, Rows3, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import {
  changeSignalStatusAction,
  getProspectSignalsSummaryAction,
  listProspectSignalsAction,
} from "../actions";
import type { SignalCategory, SignalRecord } from "../types";
import {
  SIGNAL_CATEGORIES,
  SIGNAL_CATEGORY_LABELS,
} from "../types";
import {
  IMPORTANCE_RANK,
  getSignalEventDate,
  timelineBucketLabel,
} from "./signal-display";
import { SignalCard } from "./SignalCard";
import { SignalDetailWindow } from "./SignalDetailWindow";

// ============================================================================
// Types & options
// ============================================================================

type SortKey = "newest" | "freshest" | "important";
type StatusFilter = "live" | "dismissed" | "all";
type FreshnessFilter = "all" | "fresh" | "aging" | "expired";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "freshest", label: "Freshest" },
  { value: "important", label: "Most important" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "live", label: "Active" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

const FRESHNESS_OPTIONS: { value: FreshnessFilter; label: string }[] = [
  { value: "all", label: "Any time" },
  { value: "fresh", label: "Fresh" },
  { value: "aging", label: "Aging" },
  { value: "expired", label: "Expired" },
];

const PAGE_SIZE = 20;

export interface SignalsTabProps {
  prospectId: string;
  /** Normalized company domain — includes company-level signals. */
  companyKey: string | null;
}

interface Summary {
  total: number;
  fresh: number;
  highImportance: number;
}

// ============================================================================
// Component
// ============================================================================

export function SignalsTab({ prospectId, companyKey }: SignalsTabProps) {
  const [rows, setRows] = useState<SignalRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<SignalCategory | "all">("all");
  const [freshness, setFreshness] = useState<FreshnessFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("live");
  const [sort, setSort] = useState<SortKey>("newest");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "timeline">("list");

  const [summary, setSummary] = useState<Summary | null>(null);

  const [detailSignal, setDetailSignal] = useState<SignalRecord | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  // ---- Data loading ---------------------------------------------------------

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      setError(null);

      try {
        const result = await listProspectSignalsAction({
          prospectId,
          companyKey,
          category,
          freshness,
          status,
          sort,
          limit: sort === "important" ? 100 : PAGE_SIZE,
          offset: append ? offset : 0,
        });

        if (result.error) {
          if (!append) {
            setRows([]);
            setTotal(0);
          }
          setError(result.error);
        } else {
          setRows((prev) => {
            if (!append) return result.rows;
            // Merge by id so a re-fetch never creates duplicate React keys.
            const seen = new Set(prev.map((r) => r.id));
            return [...prev, ...result.rows.filter((r) => !seen.has(r.id))];
          });
          setTotal(result.total);
        }
      } finally {
        if (append) setIsLoadingMore(false);
        else setIsLoading(false);
      }
    },
    [prospectId, companyKey, category, freshness, status, sort]
  );

  // Initial load + reload whenever filters/sorting change.
  useEffect(() => {
    void fetchPage(0, false);
  }, [fetchPage]);

  // Overview summary — small independent counts, loaded once per entity.
  useEffect(() => {
    let cancelled = false;
    getProspectSignalsSummaryAction(prospectId, companyKey)
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [prospectId, companyKey]);

  const canLoadMore = error === null && sort !== "important" && rows.length < total;

  function handleLoadMore() {
    if (!canLoadMore || isLoadingMore) return;
    void fetchPage(rows.length, true);
  }

  // ---- Actions ----------------------------------------------------------------

  const handleOpen = useCallback((signal: SignalRecord) => {
    setDetailSignal(signal);
  }, []);

  const handleDismiss = useCallback(
    async (signal: SignalRecord) => {
      if (dismissingId) return;
      setDismissingId(signal.id);
      try {
        const updated = await changeSignalStatusAction(signal.id, "dismissed");
        if (updated) {
          // Live filter → remove from list; other filters → reflect status.
          if (status === "live") {
            setRows((prev) => prev.filter((r) => r.id !== signal.id));
            setTotal((t) => Math.max(0, t - 1));
          } else {
            setRows((prev) =>
              prev.map((r) =>
                r.id === signal.id ? { ...r, status: "dismissed" } : r
              )
            );
          }
          setSummary((s) => (s ? { ...s, total: Math.max(0, s.total - 1) } : s));
        }
      } finally {
        setDismissingId(null);
      }
    },
    [dismissingId, status]
  );

  // ---- Derived data -------------------------------------------------------------

  // Lightweight search over meaningful fields of the LOADED bounded page.
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.summary ?? "").toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          SIGNAL_CATEGORY_LABELS[r.category].toLowerCase().includes(q)
      );
    }
    if (sort === "important") {
      list = [...list].sort(
        (a, b) =>
          IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance] ||
          new Date(getSignalEventDate(b)).getTime() -
            new Date(getSignalEventDate(a)).getTime()
      );
    }
    return list;
  }, [rows, search, sort]);

  // Timeline groups — chronological buckets from actual event timestamps.
  const timelineGroups = useMemo(() => {
    const groups = new Map<string, SignalRecord[]>();
    for (const signal of visibleRows) {
      const label = timelineBucketLabel(getSignalEventDate(signal));
      const bucket = groups.get(label);
      if (bucket) bucket.push(signal);
      else groups.set(label, [signal]);
    }
    return [...groups.entries()];
  }, [visibleRows]);

  // ---- Render -----------------------------------------------------------------

  return (
    <div className="pt-4">
      {/* ---- Overview ------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {summary === null ? (
          <>
            <Skeleton className="h-[64px] rounded-xl" />
            <Skeleton className="h-[64px] rounded-xl" />
            <Skeleton className="h-[64px] rounded-xl" />
          </>
        ) : (
          [
            { label: "Total signals", value: summary.total },
            { label: "Fresh (7 days)", value: summary.fresh },
            { label: "High importance", value: summary.highImportance },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
            >
              <p className="text-lg font-bold tabular-nums leading-none text-slate-900">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400">{stat.label}</p>
            </div>
          ))
        )}
        <div className="col-span-2 flex items-center justify-end gap-1.5 sm:col-span-1">
          <button
            type="button"
            onClick={() => setView(view === "list" ? "timeline" : "list")}
            aria-pressed={view === "timeline"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              view === "timeline"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            )}
          >
            {view === "list" ? (
              <>
                <ListTree className="h-3.5 w-3.5" aria-hidden="true" />
                Timeline
              </>
            ) : (
              <>
                <Rows3 className="h-3.5 w-3.5" aria-hidden="true" />
                List
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => void fetchPage(0, false)}
            disabled={isLoading}
            aria-label="Refresh signals"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors duration-150 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <RefreshCcw
              className={cn("h-3.5 w-3.5", isLoading && "animate-spin")}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* ---- Toolbar: search + filters ------------------------------------- */}
      <Toolbar
        search={search}
        onSearch={setSearch}
        category={category}
        freshness={freshness}
        status={status}
        sort={sort}
        onCategory={(v) => setCategory(v as SignalCategory | "all")}
        onFreshness={(v) => setFreshness(v as FreshnessFilter)}
        onStatus={(v) => setStatus(v as StatusFilter)}
        onSort={(v) => setSort(v as SortKey)}
      />

      {/* ---- States & content ---------------------------------------------- */}
      {error !== null ? (
        <ErrorState onRetry={() => void fetchPage(0, false)} />
      ) : isLoading ? (
        <LoadingState />
      ) : visibleRows.length === 0 ? (
        <EmptyState
          hasFilters={
            category !== "all" ||
            freshness !== "all" ||
            status !== "live" ||
            search.trim() !== ""
          }
        />
      ) : view === "timeline" ? (
        <TimelineView
          groups={timelineGroups}
          onOpen={handleOpen}
          onDismiss={handleDismiss}
        />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-2.5 xl:grid-cols-2">
          {visibleRows.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onOpen={handleOpen}
              onDismiss={
                signal.status === "dismissed" ? undefined : handleDismiss
              }
            />
          ))}
        </div>
      )}

      {/* ---- Pagination ------------------------------------------------------ */}
      {canLoadMore && !isLoading && error === null && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Showing {visibleRows.length} of {total} signals
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLoadMore}
            loading={isLoadingMore}
          >
            Load more
          </Button>
        </div>
      )}

      {/* ---- Detail window (mounted; animates via shared ActionWindow) ------- */}
      <SignalDetailWindow
        signal={detailSignal}
        onClose={() => setDetailSignal(null)}
        onDismissed={(id) => {
          if (status === "live") {
            setRows((prev) => prev.filter((r) => r.id !== id));
          } else {
            setRows((prev) =>
              prev.map((r) =>
                r.id === id ? { ...r, status: "dismissed" as const } : r
              )
            );
          }
          setSummary((s) => (s ? { ...s, total: Math.max(0, s.total - 1) } : s));
        }}
      />
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  category: SignalCategory | "all";
  freshness: FreshnessFilter;
  status: StatusFilter;
  sort: SortKey;
  onCategory: (value: string) => void;
  onFreshness: (value: string) => void;
  onStatus: (value: string) => void;
  onSort: (value: string) => void;
}

function Toolbar(props: ToolbarProps) {
  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={props.search}
            onChange={(e) => props.onSearch(e.target.value)}
            placeholder="Search signals..."
            aria-label="Search signals by title, summary, or category"
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Filter by category"
            value={props.category}
            onChange={props.onCategory}
            options={[
              { value: "all", label: "All categories" },
              ...SIGNAL_CATEGORIES.map((c) => ({
                value: c,
                label: SIGNAL_CATEGORY_LABELS[c],
              })),
            ]}
          />
          <FilterSelect
            label="Filter by freshness"
            value={props.freshness}
            onChange={props.onFreshness}
            options={FRESHNESS_OPTIONS}
          />
          <FilterSelect
            label="Filter by status"
            value={props.status}
            onChange={props.onStatus}
            options={STATUS_OPTIONS}
          />
          <FilterSelect
            label="Sort signals"
            value={props.sort}
            onChange={props.onSort}
            options={SORT_OPTIONS}
          />
        </div>
      </div>
    </div>
  );
}

function TimelineView({
  groups,
  onOpen,
  onDismiss,
}: {
  groups: [string, SignalRecord[]][];
  onOpen: (signal: SignalRecord) => void;
  onDismiss: (signal: SignalRecord) => void;
}) {
  return (
    <div className="mt-4 space-y-6">
      {groups.map(([label, bucket]) => (
        <section key={label} aria-label={`Signals from ${label}`}>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            {label}
          </h4>
          <div className="space-y-2.5 border-l-2 border-slate-100 pl-4">
            {bucket.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onOpen={onOpen}
                onDismiss={
                  signal.status === "dismissed" ? undefined : onDismiss
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors duration-150 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LoadingState() {
  return (
    <div
      className="mt-4 grid grid-cols-1 gap-2.5 xl:grid-cols-2"
      role="status"
      aria-label="Loading signals"
    >
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[104px] rounded-xl" />
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
      <p className="text-sm font-semibold text-amber-900">
        Signals could not be loaded
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-amber-800">
        This looks like a temporary problem retrieving signal data — not an
        empty history. Please try again in a moment.
      </p>
      <div className="mt-3 flex justify-center">
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
      <p className="text-sm font-semibold text-slate-700">
        {hasFilters
          ? "No signals match these filters."
          : "No meaningful signals detected yet."}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        {hasFilters
          ? "Try widening the category, freshness, or status filters to see more."
          : "When supported data sources report relevant changes for this prospect or its company, Prosventa will surface them here with supporting evidence."}
      </p>
    </div>
  );
}
