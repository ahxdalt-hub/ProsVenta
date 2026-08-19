"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Prospect, SavedList, SavedView } from "@/types/database";
import type { ProspectFilters, ProspectSortField, SortOrder } from "@/features/prospects/types/query";
import { DEFAULT_VIEWS } from "@/features/prospects/types/query";
import { ProspectToolbar } from "./ProspectToolbar";
import { ProspectTable } from "./ProspectTable";
import { FilterChips } from "./FilterChips";
import { SavedViewBar } from "./SavedViewBar";
import { ProspectPagination } from "./ProspectPagination";
import { ProspectDetailPanel } from "./ProspectDetailPanel";
import { CreateProspectDialog } from "./CreateProspectDialog";
import { ProspectTableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { createSavedViewAction, renameSavedViewAction, deleteSavedViewAction, duplicateSavedViewAction, toggleSavedViewPinAction, toggleProspectFavoriteAction } from "@/features/prospects/actions/saved-views";

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
  savedViews: SavedView[];
  currentFilters: ProspectFilters;
  currentSort?: ProspectSortField;
  currentOrder?: SortOrder;
}

export function ProspectsWorkspace({
  initialProspects,
  total,
  page,
  totalPages,
  industries,
  countries,
  tags,
  owners,
  sources,
  savedLists,
  savedViews,
  currentFilters,
  currentSort,
  currentOrder,
}: ProspectsWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local search state for instant feedback
  const [searchTerm, setSearchTerm] = useState(currentFilters.search ?? "");
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detail panel state
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);

  // Create prospect dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Active view tracking - derived from URL for persistence
  const activeViewId = searchParams.get("view");

  // Keep local search in sync with URL
  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Show searching indicator when URL changes
  useEffect(() => {
    if (isPending) {
      setIsSearching(true);
    } else {
      const timer = setTimeout(() => setIsSearching(false), 150);
      return () => clearTimeout(timer);
    }
  }, [isPending]);

  const updateParams = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Reset to page 1 on any filter/search/sort change
      if (!("page" in changes)) {
        params.delete("page");
      }

      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [searchParams, pathname, router]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      setIsSearching(true);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        updateParams({ search: value || null });
      }, 300);
    },
    [updateParams]
  );

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    updateParams({ search: null });
  }, [updateParams]);

  const handleClearAll = useCallback(() => {
    setSearchTerm("");
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    startTransition(() => {
      router.push(pathname);
    });
  }, [pathname, router]);

  const handleFiltersChange = useCallback(
    (filters: ProspectFilters) => {
      const changes: Record<string, string | null> = {
        industry: filters.industry ?? null,
        country: filters.country ?? null,
        status: filters.status ?? null,
        source: filters.source ?? null,
        priority: filters.priority ?? null,
        search: filters.search ?? null,
        tags: filters.tags && filters.tags.length > 0 ? filters.tags.join(",") : null,
        buying_intent: filters.buying_intent ?? null,
        owner: filters.owner ?? null,
        lead_score: filters.lead_score !== undefined ? String(filters.lead_score) : null,
        ai_fit_score: filters.ai_fit_score !== undefined ? String(filters.ai_fit_score) : null,
        revenue: filters.revenue !== undefined ? String(filters.revenue) : null,
        employee_count: filters.employee_count !== undefined ? String(filters.employee_count) : null,
        created_before: filters.created_before ?? null,
        created_after: filters.created_after ?? null,
        updated_before: filters.updated_before ?? null,
        updated_after: filters.updated_after ?? null,
        favorites_only: filters.favorites_only ? "true" : null,
        quick_filter: filters.quick_filter ?? null,
        conditions: filters.conditions && filters.conditions.length > 0 ? JSON.stringify(filters.conditions) : null,
      };
      updateParams(changes);
    },
    [updateParams]
  );

  const handleSort = useCallback(
    (field: ProspectSortField) => {
      const currentSortField = currentSort ?? "created_at";
      const currentSortOrder = currentOrder ?? "desc";

      if (currentSortField === field) {
        // Toggle order
        updateParams({
          sort: field,
          order: currentSortOrder === "asc" ? "desc" : "asc",
        });
      } else {
        // New field, default to asc
        updateParams({ sort: field, order: "asc" });
      }
    },
    [currentSort, currentOrder, updateParams]
  );

  const handleRowClick = useCallback((prospectId: string) => {
    setSelectedProspectId(prospectId);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setShowCreateDialog(false);
  }, []);

  // Saved view handlers
  const handleSelectView = useCallback(
    (viewId: string | null) => {
      if (!viewId) {
        // Reset to all - clear view param
        const params = new URLSearchParams(searchParams.toString());
        params.delete("view");
        const qs = params.toString();
        startTransition(() => {
          router.push(qs ? `${pathname}?${qs}` : pathname);
        });
        return;
      }

      // Set view param for persistence
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", viewId);
      params.delete("page");

      // Default views
      const defaultView = DEFAULT_VIEWS.find((v) => v.id === viewId);
      if (defaultView) {
        if (defaultView.filters) {
          // Apply default view filters
          const defaultFilters = defaultView.filters as ProspectFilters;
          Object.entries(defaultFilters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== "") {
              params.set(key, String(value));
            }
          });
        }
        const qs = params.toString();
        startTransition(() => {
          router.push(qs ? `${pathname}?${qs}` : pathname);
        });
        return;
      }

      // Custom saved views
      const savedView = savedViews.find((v) => v.id === viewId);
      if (savedView) {
        if (savedView.search) params.set("search", savedView.search);
        if (savedView.sort_field) params.set("sort", savedView.sort_field);
        if (savedView.sort_order) params.set("order", savedView.sort_order);
        if (savedView.quick_filter) params.set("quick_filter", savedView.quick_filter);
        if (savedView.favorites_only) params.set("favorites_only", "true");

        // Apply saved filter conditions
        const savedFilters = savedView.filters as Record<string, unknown>;
        Object.entries(savedFilters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== "") {
            if (typeof value === "object") {
              params.set(key, JSON.stringify(value));
            } else {
              params.set(key, String(value));
            }
          }
        });

        const qs = params.toString();
        startTransition(() => {
          router.push(qs ? `${pathname}?${qs}` : pathname);
        });
      }
    },
    [router, pathname, startTransition, savedViews, searchParams]
  );

  const handleSaveView = useCallback(
    async (name: string) => {
      const result = await createSavedViewAction({
        name,
        filters: currentFilters as Record<string, unknown>,
        sort_field: currentSort ?? null,
        sort_order: currentOrder ?? null,
        search: currentFilters.search ?? null,
        quick_filter: currentFilters.quick_filter ?? null,
        favorites_only: currentFilters.favorites_only ?? false,
        icon: "grid",
        color: "blue",
      });
      if (!result.error && result.id) {
        router.refresh();
      }
    },
    [currentFilters, currentSort, currentOrder, router]
  );

  const handleRenameView = useCallback(
    async (viewId: string, name: string) => {
      await renameSavedViewAction(viewId, name);
      router.refresh();
    },
    [router]
  );

  const handleDeleteView = useCallback(
    async (viewId: string) => {
      await deleteSavedViewAction(viewId);
      if (activeViewId === viewId) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("view");
        const qs = params.toString();
        startTransition(() => {
          router.push(qs ? `${pathname}?${qs}` : pathname);
        });
      } else {
        router.refresh();
      }
    },
    [router, pathname, activeViewId, startTransition, searchParams]
  );

  const handleDuplicateView = useCallback(
    async (viewId: string) => {
      await duplicateSavedViewAction(viewId);
      router.refresh();
    },
    [router]
  );

  const handleTogglePin = useCallback(
    async (viewId: string, isPinned: boolean) => {
      await toggleSavedViewPinAction(viewId, isPinned);
      router.refresh();
    },
    [router]
  );

  const handleToggleFavorite = useCallback(
    async (prospectId: string, isFavorite: boolean) => {
      await toggleProspectFavoriteAction(prospectId, isFavorite);
      router.refresh();
    },
    [router]
  );

  const hasFilters = useMemo(() => {
    const f = currentFilters;
    return Boolean(
      f.search ||
      f.industry ||
      f.country ||
      f.status ||
      f.source ||
      f.priority ||
      f.tags?.length ||
      f.buying_intent ||
      f.lead_score !== undefined ||
      f.ai_fit_score !== undefined ||
      f.revenue !== undefined ||
      f.employee_count !== undefined ||
      f.owner ||
      f.favorites_only ||
      f.quick_filter ||
      f.conditions?.length
    );
  }, [currentFilters]);

  // Determine if current state differs from the active saved view
  const hasUnsavedChanges = useMemo(() => {
    if (!activeViewId) return hasFilters;
    return true; // When a view is active, any change is unsaved
  }, [activeViewId, hasFilters]);

  const showEmptyState = initialProspects.length === 0 && !hasFilters;
  const showNoResults = initialProspects.length === 0 && hasFilters;

  return (
    <div className="dashboard-enter flex flex-col space-y-4 min-h-[calc(100vh-9rem)]">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Prospects
        </h1>
        <p className="text-sm text-slate-500">
          {total > 0
            ? `${total} ${total === 1 ? "prospect" : "prospects"} in this view`
            : "Find, organize, and manage your target prospects."}
        </p>
      </div>

      {/* Saved Views Bar */}
      <div className="premium-card px-3 py-2">
        <SavedViewBar
          views={savedViews}
          defaultViews={DEFAULT_VIEWS}
          activeViewId={activeViewId}
          onSelectView={handleSelectView}
          onSaveView={handleSaveView}
          onRenameView={handleRenameView}
          onDeleteView={handleDeleteView}
          onDuplicateView={handleDuplicateView}
          onTogglePin={handleTogglePin}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </div>

      {/* Premium Toolbar */}
      <ProspectToolbar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        isSearching={isSearching}
        industries={industries}
        countries={countries}
        tags={tags}
        owners={owners}
        sources={sources}
        currentFilters={currentFilters}
        onFilterChange={updateParams}
        onFiltersChange={handleFiltersChange}
        onClearAll={handleClearAll}
        hasFilters={hasFilters}
        currentSort={currentSort}
        currentOrder={currentOrder}
        onSort={handleSort}
        onCreateClick={() => setShowCreateDialog(true)}
      />

      {/* Active Filter Chips */}
      <AnimatePresence>
        {hasFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <FilterChips
              filters={currentFilters}
              onRemove={updateParams}
              onClearAll={handleClearAll}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table / Loading / Empty State */}
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
        ) : showEmptyState ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="premium-card flex-1 flex items-center justify-center min-h-[400px]"
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
        ) : showNoResults ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="premium-card flex-1 flex items-center justify-center min-h-[400px]"
          >
            <EmptyState
              title="No prospects found"
              description="Try adjusting your filters, clearing conditions, or creating a new view to find what you're looking for."
              icon={
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              }
              action={{
                label: "Clear filters",
                onClick: handleClearAll,
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
              currentSort={currentSort}
              currentOrder={currentOrder}
              onSort={handleSort}
              onToggleFavorite={handleToggleFavorite}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {!isPending && initialProspects.length > 0 && (
        <ProspectPagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
        />
      )}

      {/* Detail Panel (Slide-over) */}
      <ProspectDetailPanel
        prospectId={selectedProspectId}
        onClose={() => setSelectedProspectId(null)}
        savedLists={savedLists}
      />

      {/* Create Prospect Dialog */}
      <CreateProspectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}