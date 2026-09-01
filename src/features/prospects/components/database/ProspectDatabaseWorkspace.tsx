"use client";

// ============================================================================
// Prosventa Prospect Database — Workspace (Phase 4)
// ============================================================================
// The advanced database-management layer for prospects. Built ON TOP of the
// existing prospect system — no duplicated database, no second prospect
// system:
//   • Data         → the existing queryProspects server action (RLS-scoped)
//   • Search       → the existing ProspectsToolbar (URL-driven, server-side)
//   • Rows         → the existing ProspectTable, now with configurable columns
//   • Detail       → the existing ProspectDetailPanel (untouched)
//   • Bulk actions → the existing BulkActionBar / SaveToListDialog /
//                    BulkEnrichWindow (credit estimate + confirmation intact)
//
// Incremental loading: this component starts with ONE server-rendered page
// (50 rows) and appends further pages on demand via the same server action.
// The full table is never downloaded; every query runs server-side against
// indexed columns.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { SavedList } from "@/types/database";
import type { ProspectWithScore } from "../../types/prospect";
import type { ProspectSortField, SortOrder } from "../../types/query";
import { queryProspects } from "@/lib/db/prospects";
import { ProspectTable, ALL_PROSPECT_TABLE_COLUMNS } from "../ProspectTable";
import { ProspectDetailPanel } from "../ProspectDetailPanel";
import { ProspectsToolbar, type ProspectToolbarFilters } from "../ProspectsToolbar";
import { BulkActionBar } from "../BulkActionBar";
import { SaveToListDialog } from "../SaveToListDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useIntelligenceActionWindow } from "@/features/intelligence/action-window";
import { EnrichProspectWindow } from "@/features/enrichment/components/EnrichProspectWindow";
import { BulkEnrichWindow } from "@/features/enrichment/components/BulkEnrichWindow";

const COLUMN_OPTIONS: { key: ProspectSortField; label: string }[] = [
  { key: "company_name", label: "Company" },
  { key: "industry", label: "Industry" },
  { key: "location", label: "Location" },
  { key: "website", label: "Website" },
  { key: "status", label: "Status" },
  { key: "icp_score", label: "ICP Score" },
  { key: "priority", label: "Priority" },
  { key: "source", label: "Source" },
  { key: "created_at", label: "Created" },
];

const COLUMN_STORAGE_KEY = "prosventa.prospect-database.columns";

function loadVisibleColumns(): ReadonlySet<ProspectSortField> {
  if (typeof window === "undefined") return ALL_PROSPECT_TABLE_COLUMNS;
  try {
    const raw = window.localStorage.getItem(COLUMN_STORAGE_KEY);
    if (!raw) return ALL_PROSPECT_TABLE_COLUMNS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return ALL_PROSPECT_TABLE_COLUMNS;
    }
    const valid = new Set(
      parsed.filter(
        (key): key is ProspectSortField =>
          typeof key === "string" && ALL_PROSPECT_TABLE_COLUMNS.has(key as ProspectSortField)
      )
    );
    // Company is the identity column — never hideable.
    valid.add("company_name");
    return valid;
  } catch {
    return ALL_PROSPECT_TABLE_COLUMNS;
  }
}

export interface ProspectDatabaseWorkspaceProps {
  initialProspects: ProspectWithScore[];
  pageSize: number;
  total: number;
  industries: string[];
  countries: string[];
  sources: string[];
  savedLists: SavedList[];
  search: string;
  filters: ProspectToolbarFilters;
  sort: ProspectSortField | "";
  order: SortOrder;
  loadError?: string | null;
}

export function ProspectDatabaseWorkspace({
  initialProspects,
  pageSize,
  total: initialTotal,
  industries,
  countries,
  sources,
  savedLists,
  search,
  filters,
  sort,
  order,
  loadError,
}: ProspectDatabaseWorkspaceProps) {
  const router = useRouter();
  const { openIntelligenceAction } = useIntelligenceActionWindow();

  // ---- Data (incremental) ----------------------------------------------------
  // `prospects` accumulates server-fetched pages. Whenever the server shell
  // re-renders (search / filter / sort / refresh), the fresh page 1 replaces
  // everything and selection resets — the query changed, so old rows and old
  // selections are no longer meaningful.
  const [prospects, setProspects] = useState<ProspectWithScore[]>(initialProspects);
  const [total, setTotal] = useState(initialTotal);
  const [nextPage, setNextPage] = useState(2);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    setProspects(initialProspects);
    setTotal(initialTotal);
    setNextPage(2);
    setLoadingMore(false);
    setLoadMoreError(null);
    setSelectedIds(new Set());
  }, [initialProspects, initialTotal]);

  const hasMore = prospects.length < total;

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await queryProspects({
        page: nextPage,
        pageSize,
        search: search || undefined,
        status: filters.status,
        priority: filters.priority,
        source: filters.source,
        industry: filters.industry,
        country: filters.country,
        employee_count: filters.minEmployees,
        sort: sort || undefined,
        order,
      });
      setProspects((prev) => {
        // Guard against duplicates if the server data shifted between pages.
        const seen = new Set(prev.map((p) => p.id));
        const fresh = page.prospects.filter((p) => !seen.has(p.id));
        return [...prev, ...fresh];
      });
      setTotal(page.total);
      setNextPage((p) => p + 1);
    } catch {
      setLoadMoreError("Could not load more prospects. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, nextPage, pageSize, search, filters, sort, order]);

  // ---- Detail panel ------------------------------------------------------------
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const handleRowClick = useCallback((prospectId: string) => {
    setSelectedProspectId(prospectId);
  }, []);

  // ---- Bulk selection & actions ------------------------------------------------
  const [showSaveToList, setShowSaveToList] = useState(false);
  const [showBulkEnrich, setShowBulkEnrich] = useState(false);
  const [enrichProspectId, setEnrichProspectId] = useState<string | null>(null);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected =
        prospects.length > 0 && prospects.every((p) => prev.has(p.id));
      return allSelected ? new Set() : new Set(prospects.map((p) => p.id));
    });
  }, [prospects]);

  const allSelected = prospects.length > 0 && prospects.every((p) => selectedIds.has(p.id));
  const someSelected = prospects.some((p) => selectedIds.has(p.id));

  // ---- Column configuration -----------------------------------------------------
  const [visibleColumns, setVisibleColumns] = useState<ReadonlySet<ProspectSortField>>(
    () => loadVisibleColumns()
  );
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showColumnsMenu) return;
    const onDown = (e: MouseEvent) => {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target as Node)) {
        setShowColumnsMenu(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowColumnsMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showColumnsMenu]);

  const toggleColumn = useCallback((key: ProspectSortField) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (key === "company_name") return prev; // identity column — always visible
        next.delete(key);
      } else {
        next.add(key);
      }
      try {
        window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* storage unavailable — session-only configuration */
      }
      return next;
    });
  }, []);

  const isEmpty = prospects.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 px-4 py-5 md:px-6 lg:px-8">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/prospects"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Prospects
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Prospect Database</h1>
            <p className="text-xs text-slate-400">
              Advanced view of your entire prospect database
            </p>
          </div>
        </div>

        {/* Column configuration */}
        <div className="relative" ref={columnsMenuRef}>
          <button
            type="button"
            onClick={() => setShowColumnsMenu((v) => !v)}
            aria-expanded={showColumnsMenu}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
            Columns
            <span className="rounded bg-slate-100 px-1.5 text-xs tabular-nums text-slate-500">
              {visibleColumns.size}
            </span>
          </button>

          {showColumnsMenu && (
            <div
              className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
              role="menu"
              aria-label="Configure table columns"
            >
              {COLUMN_OPTIONS.map((col) => {
                const checked = visibleColumns.has(col.key);
                const locked = col.key === "company_name";
                return (
                  <button
                    key={col.key}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    disabled={locked}
                    onClick={() => toggleColumn(col.key)}
                    className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition-colors duration-150 ${
                      checked ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-50"
                    } ${locked ? "cursor-default opacity-70" : ""}`}
                  >
                    {col.label}
                    {checked && (
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
              <p className="px-3.5 pb-1 pt-2 text-[11px] leading-snug text-slate-400">
                Company is always shown. Your column set is remembered on this device.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Search / filter / sort — the SAME toolbar the Prospects page uses.
          Each control stays a separate concept (search text, filter popover,
          sort menu) and every change is applied server-side via the URL. */}
      <ProspectsToolbar
        search={search}
        filters={filters}
        sort={sort}
        order={order}
        industries={industries}
        countries={countries}
        sources={sources}
      />

      {/* Results summary — real server counts only */}
      <p className="shrink-0 text-xs font-medium tabular-nums text-slate-500" aria-live="polite">
        Showing {prospects.length} of {total} {total === 1 ? "prospect" : "prospects"}
      </p>

      {/* Table / Error / Empty State */}
      <AnimatePresence mode="wait">
        {loadError ? (
          <motion.div
            key="load-error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="premium-card flex min-h-[400px] flex-1 items-center justify-center md:min-h-0"
          >
            <EmptyState
              title="Something went wrong"
              description={loadError}
              icon={
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              }
              action={{ label: "Retry", onClick: () => router.refresh() }}
            />
          </motion.div>
        ) : isEmpty ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="premium-card flex min-h-[400px] flex-1 items-center justify-center md:min-h-0"
          >
            <EmptyState
              title="No prospects match"
              description={
                search || Object.values(filters).some((v) => v !== undefined)
                  ? "No prospects match the current search and filters. Try adjusting them."
                  : "Add prospects from the Prospects page, import a CSV, or run a lead search."
              }
              icon={
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 21h18M3 7v14M21 7v14M3 7l9-4 9 4M9 21V11M15 21V11" />
                </svg>
              }
              action={{
                label: "Go to Prospects",
                onClick: () => {
                  window.location.href = "/dashboard/prospects";
                },
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <ProspectTable
              prospects={prospects}
              onRowClick={handleRowClick}
              visibleColumns={visibleColumns}
              selection={{
                selectedIds,
                onToggle: handleToggleSelect,
                onToggleAll: handleToggleAll,
                allSelected,
                someSelected,
              }}
              onEnrich={(id) => setEnrichProspectId(id)}
              onResearch={() => openIntelligenceAction({ type: "research_prospect" })}
              onSaveToList={(id) => {
                setSelectedIds(new Set([id]));
                setShowSaveToList(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incremental loading — appends the next server page; the full table is
          never downloaded at once. */}
      {!loadError && !isEmpty && (
        <div className="flex shrink-0 flex-col items-center gap-1.5 pb-2">
          {hasMore ? (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? (
                <>
                  <Spinner size="sm" /> Loading…
                </>
              ) : (
                <>
                  Load more
                  <span className="text-xs text-slate-400">
                    ({prospects.length} / {total})
                  </span>
                </>
              )}
            </button>
          ) : (
            <span className="text-xs text-slate-400">
              All {total} {total === 1 ? "prospect" : "prospects"} loaded
            </span>
          )}
          {loadMoreError && (
            <p className="text-xs text-red-600" role="alert">
              {loadMoreError}
            </p>
          )}
        </div>
      )}

      {/* Detail Panel — the EXISTING slide-over, unchanged */}
      <ProspectDetailPanel
        prospectId={selectedProspectId}
        onClose={() => setSelectedProspectId(null)}
        savedLists={savedLists}
        onDeleted={() => {
          setSelectedProspectId(null);
          router.refresh();
        }}
      />

      {/* Bulk action bar + Save-to-List dialog */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onSaveToList={() => setShowSaveToList(true)}
        onEnrich={() => setShowBulkEnrich(true)}
        onResearch={() => openIntelligenceAction({ type: "research_prospect" })}
        onClear={() => setSelectedIds(new Set())}
      />
      <SaveToListDialog
        open={showSaveToList && selectedIds.size > 0}
        onClose={() => setShowSaveToList(false)}
        prospectIds={Array.from(selectedIds)}
        savedLists={savedLists}
        onComplete={() => setSelectedIds(new Set())}
      />

      {/* Bulk enrichment — the EXISTING credit-aware window: the confirm step
          shows selected count, estimated cost, available and remaining credits
          before anything is charged. */}
      <BulkEnrichWindow
        open={showBulkEnrich && selectedIds.size > 0}
        prospectIds={Array.from(selectedIds)}
        onClose={() => setShowBulkEnrich(false)}
        onCompleted={() => router.refresh()}
      />

      {/* Single-prospect enrichment window */}
      <EnrichProspectWindow
        prospectId={enrichProspectId}
        open={enrichProspectId !== null}
        onClose={() => setEnrichProspectId(null)}
      />
    </div>
  );
}
