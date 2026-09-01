"use client";

// ============================================================================
// Prosventa Saved Lists — Lists workspace (Phase 2 rebuild)
// ============================================================================
// Client workspace over REAL organization-scoped data. Search filters the
// already-loaded lists locally (debounced — never a query per keystroke),
// summary metrics come from the same real rows, and create/delete go through
// the existing server actions with animated action windows.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { SavedList } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { deleteSavedListAction } from "@/features/prospects/actions/lists";
import { CreateListModal } from "./CreateListModal";

type SavedListWithCount = SavedList & { prospect_count: number };

interface SavedListsWorkspaceProps {
  initialLists: SavedListWithCount[];
  loadError: string | null;
}

function ListIcon() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

export function SavedListsWorkspace({ initialLists, loadError }: SavedListsWorkspaceProps) {
  const router = useRouter();
  const { success } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [listToDelete, setListToDelete] = useState<SavedListWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Debounced search — filters the loaded list data client-side (no per-keystroke
  // database queries), and preserves the rest of the page state.
  useEffect(() => {
    if (searchTerm === debouncedSearch) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
      setIsSearching(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, debouncedSearch]);

  const filteredLists = useMemo(() => {
    if (!debouncedSearch) return initialLists;
    return initialLists.filter(
      (list) =>
        list.name.toLowerCase().includes(debouncedSearch) ||
        (list.description ?? "").toLowerCase().includes(debouncedSearch)
    );
  }, [initialLists, debouncedSearch]);

  // Real summary metrics computed from the loaded rows only.
  const totalProspects = useMemo(
    () => initialLists.reduce((sum, list) => sum + list.prospect_count, 0),
    [initialLists]
  );
  const recentlyUpdatedCount = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return initialLists.filter((list) => new Date(list.updated_at).getTime() >= cutoff).length;
  }, [initialLists]);

  const handleDelete = async () => {
    if (!listToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteSavedListAction(listToDelete.id);
    if (result.error) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }
    setDeleting(false);
    success("List deleted", "Prospects were kept — only the list was removed.");
    setListToDelete(null);
    router.refresh();
  };

  return (
    <section className="dashboard-enter flex flex-1 flex-col p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Saved Lists
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Organize prospects into focused lists for research, enrichment, and outreach.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0 self-start">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create List
        </Button>
      </div>

      {loadError && (
        <p role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {!loadError && (
        <>
          {/* Summary — real numbers only */}
          {initialLists.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="premium-card px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total lists</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{initialLists.length}</p>
              </div>
              <div className="premium-card px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Prospects organized</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{totalProspects}</p>
              </div>
              <div className="premium-card px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Updated this week</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{recentlyUpdatedCount}</p>
              </div>
            </div>
          )}

          {/* Search */}
          {initialLists.length > 0 && (
            <div className="relative mt-6 max-w-md">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search lists by name or description…"
                aria-label="Search saved lists"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300"
              />
              {isSearching ? (
                <span
                  className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500"
                  aria-hidden="true"
                />
              ) : (
                searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )
              )}
            </div>
          )}

          {/* Body */}
          {initialLists.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="premium-card mt-6 flex flex-1 items-center justify-center min-h-[320px]"
            >
              <EmptyState
                title="No saved lists yet"
                description="Keep your best prospects organized in focused lists for research and outreach."
                icon={<ListIcon />}
                action={{ label: "Create your first list", onClick: () => setShowCreate(true) }}
              />
            </motion.div>
          ) : filteredLists.length === 0 ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="premium-card mt-6 flex flex-1 items-center justify-center min-h-[280px]"
            >
              <EmptyState
                title="No lists match your search."
                description={`Nothing matches "${searchTerm}". Try a different term or clear the search.`}
                icon={
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                }
                action={{ label: "Clear search", onClick: () => setSearchTerm("") }}
              />
            </motion.div>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredLists.map((list, index) => (
                <motion.li
                  key={list.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.03, 0.15) }}
                >
                  <Link
                    href={`/dashboard/saved-lists/${list.id}`}
                    className="group premium-card flex h-full flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-900/[0.06] text-navy-900 transition-colors duration-150 group-hover:bg-navy-900 group-hover:text-white">
                          <ListIcon />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-900 transition-colors group-hover:text-navy-800">
                            {list.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            Updated {formatDate(list.updated_at)}
                          </span>
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600 transition-colors duration-150 group-hover:bg-blue-50 group-hover:text-blue-700">
                        {list.prospect_count}
                      </span>
                    </div>

                    {list.description && (
                      <p className="mt-3 line-clamp-2 text-sm text-slate-500">{list.description}</p>
                    )}

                    <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-medium text-blue-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      Open list
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Create list window */}
      <CreateListModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          success("List created");
          router.refresh();
        }}
      />

      {/* Delete confirmation window — list only; prospects are protected */}
      <Modal
        open={listToDelete !== null}
        onClose={() => {
          if (!deleting) {
            setListToDelete(null);
            setDeleteError(null);
          }
        }}
        title={`Delete "${listToDelete?.name ?? ""}"?`}
        description="This permanently removes the list. The prospects inside it are NOT deleted."
        tone="alert"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setListToDelete(null);
                setDeleteError(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="success" onClick={handleDelete} loading={deleting}>
              Delete list only
            </Button>
          </>
        }
      >
        {deleteError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {deleteError}
          </p>
        )}
        <p className="text-sm text-slate-600">
          This list currently holds{" "}
          <span className="font-semibold text-slate-900">{listToDelete?.prospect_count ?? 0}</span>{" "}
          prospect{listToDelete?.prospect_count === 1 ? "" : "s"}. They will remain in Prospects after
          the list is removed.
        </p>
      </Modal>
    </section>
  );
}
