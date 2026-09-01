"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Prospect, SavedList } from "@/types/database";
import type { ProspectSortField, SortOrder } from "../types/query";
import { ProspectTable } from "./ProspectTable";
import { ProspectPagination } from "./ProspectPagination";
import { ProspectDetailPanel } from "./ProspectDetailPanel";
import { CreateProspectDialog } from "./CreateProspectDialog";
import { ProspectsToolbar, type ProspectToolbarFilters } from "./ProspectsToolbar";
import { ProspectTableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { toggleProspectFavoriteAction } from "@/features/prospects/actions/saved-views";
import { useIntelligenceActionWindow } from "@/features/intelligence/action-window";
import { EnrichProspectWindow } from "@/features/enrichment/components/EnrichProspectWindow";
import { BulkActionBar } from "./BulkActionBar";
import { SaveToListDialog } from "./SaveToListDialog";
import { BulkEnrichWindow } from "@/features/enrichment/components/BulkEnrichWindow";

interface ProspectsWorkspaceProps {
  initialProspects: Prospect[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  industries: string[];
  countries: string[];
  tags: string[];
  owners: { id: string; full_name: string | null }[];
  sources: string[];
  savedLists: SavedList[];
  /** Active search term (URL-owned; applied server-side by queryProspects). */
  search: string;
  /** Active filters (URL-owned; applied server-side by queryProspects). */
  filters: ProspectToolbarFilters;
  /** Active sort field ("" = default ordering). */
  sort: ProspectSortField | "";
  /** Active sort direction. */
  order: SortOrder;
  /** Automatic intelligence job states keyed by prospect id (Stage 5 Task 4). */
  scoreStates?: Record<string, "pending" | "processing" | "failed">;
  /** Plain-language message when the server data load failed. */
  loadError?: string | null;
}

export function ProspectsWorkspace({
  initialProspects,
  total,
  page,
  totalPages,
  industries,
  countries,
  tags: _tags,
  owners: _owners,
  sources,
  savedLists,
  search,
  filters,
  sort,
  order,
  scoreStates,
  loadError,
}: ProspectsWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { openIntelligenceAction } = useIntelligenceActionWindow();

  // Detail panel state
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);

  // Create prospect dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Row selection (bulk actions). Selection is per-page and resets whenever
  // the underlying page data changes (search / filter / pagination).
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [showSaveToList, setShowSaveToList] = useState(false);
  // Bulk enrichment window (Phase 3) — opened from the bulk action bar.
  const [showBulkEnrich, setShowBulkEnrich] = useState(false);
  useEffect(() => {
    setSelectedIds(new Set());
    setShowSaveToList(false);
  }, [initialProspects]);

  // Recent-import indicator (arrives via ?recent_import=1 from the Import flow).
  // The server navigation already returned refreshed data; this banner just
  // confirms the just-imported prospects are now part of this workspace. It is
  // never a full-page reload and never navigates away from Prospects.
  const [recentImportBanner, setRecentImportBanner] = useState(
    () => searchParams.get("recent_import") === "1"
  );

  // Stage 5 Task 4: manual retry of failed intelligence processing.
  const handleRetryIntelligence = useCallback(
    (prospectId: string) => {
      import("@/features/prospects/actions/manage").then(({ retryIntelligenceAction }) =>
        retryIntelligenceAction(prospectId).then(() => {
          // The pipeline runs after the request; refresh once it revalidates.
          router.refresh();
        })
      );
    },
    [router]
  );

  // Deep-link support: /dashboard/prospects?prospect=<id> opens the existing
  // detail panel directly (used by the Intelligence Command Center).
  // Handled once on mount; closing the panel strips the param from the URL.
  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (deepLinkHandledRef.current) return;
    deepLinkHandledRef.current = true;
    const prospectParam = searchParams.get("prospect");
    if (prospectParam) {
      setSelectedProspectId(prospectParam);
    }
  }, [searchParams]);

  // ---- Search / filter / sort state -----------------------------------------
  // Owned by the URL and applied server-side (see prospects/page.tsx). This
  // component only renders the controls and receives the active values as
  // props; it never queries Supabase directly.

  const handleRowClick = useCallback((prospectId: string) => {
    // DEV-ONLY: trace the id handed to the detail panel (Phase 3 diagnostics).
    if (process.env.NODE_ENV === "development") {
      console.log("[WORKSPACE] selected prospect id:", JSON.stringify(prospectId));
    }
    setSelectedProspectId(prospectId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedProspectId(null);
    // Remove the deep-link param so refresh/back doesn't reopen the panel.
    if (searchParams.get("prospect")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("prospect");
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    }
  }, [searchParams, pathname, router, startTransition]);

  const handleCreateSuccess = useCallback(() => {
    setShowCreateDialog(false);
  }, []);

  const handleToggleFavorite = useCallback(
    async (prospectId: string, isFavorite: boolean) => {
      await toggleProspectFavoriteAction(prospectId, isFavorite);
      router.refresh();
    },
    [router]
  );

  const showEmptyState = initialProspects.length === 0;

  // ---- Selection / bulk actions -------------------------------------------
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
        initialProspects.length > 0 && initialProspects.every((p) => prev.has(p.id));
      return allSelected ? new Set() : new Set(initialProspects.map((p) => p.id));
    });
  }, [initialProspects]);

  const selection = useMemo(
    () => ({
      selectedIds,
      onToggle: handleToggleSelect,
      onToggleAll: handleToggleAll,
      allSelected:
        initialProspects.length > 0 && initialProspects.every((p) => selectedIds.has(p.id)),
      someSelected: initialProspects.some((p) => selectedIds.has(p.id)),
    }),
    [selectedIds, handleToggleSelect, handleToggleAll, initialProspects]
  );

  // Single-prospect enrichment uses the dedicated Phase-2 Enrich Prospect
  // window (ActionWindow architecture, provider calls only on explicit user
  // action). Research still reuses the existing Intelligence action window.
  const [enrichProspectId, setEnrichProspectId] = useState<string | null>(null);
  const handleEnrich = useCallback((prospectId: string) => {
    setEnrichProspectId(prospectId);
  }, []);
  const handleResearch = useCallback(
    (prospectId: string) => openIntelligenceAction({ type: "research_prospect", context: { targetId: prospectId } }),
    [openIntelligenceAction]
  );

  // Bulk enrichment entry point (Phase 3): opens the confirmation window for
  // the current selection. The action only exists while prospects are selected.
  const handleBulkEnrich = useCallback(() => {
    if (selectedIds.size === 0) return;
    setShowBulkEnrich(true);
  }, [selectedIds.size]);

  return (
    // ps-page-height (md+): fills exactly the space between the topbar and the
    // viewport bottom, so the page itself never scrolls — only the table area
    // below does. On mobile (<md) no height is applied and the page keeps its
    // natural document scroll.
    <div className="dashboard-enter flex min-h-0 flex-col space-y-4 ps-page-height">
      {/* Page Header */}
      <div className="flex shrink-0 flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Prospects
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-500">
          Find, evaluate, and act on prospects that match your target market.
        </p>
      </div>

      {/* Server load failure — isolated banner; the shell stays usable */}
      {loadError && (
        <div
          role="alert"
          className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {loadError}
        </div>
      )}

      {/* Recent-import confirmation (context preserved from the Import flow). */}
      {recentImportBanner && (
        <div
          role="status"
          className="flex shrink-0 items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800"
        >
          <svg className="h-5 w-5 shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="min-w-0">
            <span className="font-semibold">Recent import added.</span>{" "}
            <span className="text-green-700">
              Your imported prospects are now in this workspace — you can select
              them and save them to a list.
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setRecentImportBanner(false);
              const params = new URLSearchParams(searchParams.toString());
              params.delete("recent_import");
              const qs = params.toString();
              startTransition(() => {
                router.replace(qs ? `${pathname}?${qs}` : pathname);
              });
            }}
            aria-label="Dismiss recent import notice"
            className="ml-auto shrink-0 rounded-lg p-1.5 text-green-600 transition hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Search / Filter / Sort toolbar + Add Prospect action.
          Search, Filter and Sort are independent controls — each only mutates
          its own URL params; the server shell combines them into one query. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <ProspectsToolbar
          search={search}
          filters={filters}
          sort={sort}
          order={order}
          industries={industries}
          countries={countries}
          sources={sources}
        />
        <button
          type="button"
          onClick={() => setShowCreateDialog(true)}
          className="btn-press inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-800 hover:shadow-md transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="hidden sm:inline">Add Prospect</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Results summary — real server counts only */}
      {!isPending && !loadError && (
        <p className="shrink-0 text-xs font-medium tabular-nums text-slate-500" aria-live="polite">
          {total} {total === 1 ? "prospect" : "prospects"}
        </p>
      )}

      {/* Table / Loading / Error / Empty State */}
      <AnimatePresence mode="wait">
        {isPending ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ProspectTableSkeleton />
          </motion.div>
        ) : loadError ? (
          <motion.div
            key="load-error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="premium-card flex flex-1 items-center justify-center min-h-[400px] md:min-h-0"
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
              action={{
                label: "Retry",
                onClick: () => router.refresh(),
              }}
            />
          </motion.div>
        ) : showEmptyState ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="premium-card flex flex-1 items-center justify-center min-h-[400px] md:min-h-0"
          >
            <EmptyState
              title="No prospects yet"
              description="Start building your pipeline by adding your first prospect manually, or import a list of companies."
              icon={
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 21h18M3 7v14M21 7v14M3 7l9-4 9 4M9 21V11M15 21V11" />
                </svg>
              }
              action={{
                label: "Add Prospect",
                onClick: () => setShowCreateDialog(true),
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
            className="flex-1 flex flex-col min-h-0"
          >
            <ProspectTable
              prospects={initialProspects}
              onRowClick={handleRowClick}
              onToggleFavorite={handleToggleFavorite}
              scoreStates={scoreStates}
              onRetryIntelligence={handleRetryIntelligence}
              selection={selection}
              onEnrich={handleEnrich}
              onResearch={handleResearch}
              onSaveToList={(id) => {
                setSelectedIds(new Set([id]));
                setShowSaveToList(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination — pinned below the scroll area so it stays reachable */}
      {!isPending && initialProspects.length > 0 && (
        <div className="shrink-0">
          <ProspectPagination
            currentPage={page}
            totalPages={totalPages}
            total={total}
          />
        </div>
      )}

      {/* Detail Panel (Slide-over) */}
      <ProspectDetailPanel
        prospectId={selectedProspectId}
        onClose={handleCloseDetail}
        savedLists={savedLists}
        onDeleted={() => {
          setSelectedProspectId(null);
          router.refresh();
        }}
      />

      {/* Create Prospect Dialog */}
      <CreateProspectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />

      {/* Bulk action bar + Save-to-List dialog (no navigation away) */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onSaveToList={() => setShowSaveToList(true)}
        onEnrich={handleBulkEnrich}
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

      {/* Single-prospect enrichment window (Phase 2) — opens over this page
          without navigation; underlying search/filter state is preserved. */}
      <EnrichProspectWindow
        prospectId={enrichProspectId}
        open={enrichProspectId !== null}
        onClose={() => setEnrichProspectId(null)}
      />

      {/* Bulk enrichment window (Phase 3) — confirmation → progress → summary;
          processing runs server-side, so minimizing/closing never stops it. */}
      <BulkEnrichWindow
        open={showBulkEnrich && selectedIds.size > 0}
        prospectIds={Array.from(selectedIds)}
        onClose={() => setShowBulkEnrich(false)}
        onCompleted={() => router.refresh()}
      />
    </div>
  );
}