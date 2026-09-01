"use client";

// ============================================================================
// Prosventa Saved Lists — List detail workspace (Phase 2 rebuild)
// ============================================================================
// Opens a single list inside the standard dashboard shell. Reuses the shared
// ProspectTable / ProspectDetailPanel / SaveToListDialog / BulkActionBar and
// the EXISTING Intelligence action window — no duplicate table implementation.
// All mutations go through existing server actions (RLS-scoped); membership
// changes never delete the underlying prospects.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SavedList } from "@/types/database";
import type { ProspectWithScore } from "@/features/prospects/types/prospect";
import type { ProspectSortField, SortOrder } from "@/features/prospects/types/query";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { ActionWindow } from "@/components/action-window";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { ProspectTable } from "@/features/prospects/components/ProspectTable";
import { ProspectDetailPanel } from "@/features/prospects/components/ProspectDetailPanel";
import { SaveToListDialog } from "@/features/prospects/components/SaveToListDialog";
import { BulkActionBar } from "@/features/prospects/components/BulkActionBar";
import { useIntelligenceActionWindow } from "@/features/intelligence/action-window";
import {
  updateSavedListAction,
  deleteSavedListAction,
  removeProspectsFromListAction,
} from "@/features/prospects/actions/lists";
import { AddProspectsModal } from "./AddProspectsModal";

interface ListDetailWorkspaceProps {
  list: SavedList;
  members: ProspectWithScore[];
  allLists: SavedList[];
}

export function ListDetailWorkspace({ list, members, allLists }: ListDetailWorkspaceProps) {
  const router = useRouter();
  const { success } = useToast();
  const { openIntelligenceAction } = useIntelligenceActionWindow();

  // Search within THIS list's members only (client-side over loaded rows).
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sortField, setSortField] = useState<ProspectSortField | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Selection state (same interaction language as Prospects).
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => setSelectedIds(new Set()), [members]);

  // Detail panel + action windows.
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showSaveToList, setShowSaveToList] = useState(false);

  // Mutation state.
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    if (searchTerm === debouncedSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, debouncedSearch]);

  const visibleMembers = useMemo(() => {
    let rows = members;
    if (debouncedSearch) {
      rows = rows.filter((p) =>
        [p.company_name, p.name, p.industry, p.contact_name, p.contact_email]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(debouncedSearch))
      );
    }
    if (sortField) {
      const dir = sortOrder === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const av =
          sortField === "icp_score"
            ? a.prospect_scores?.score ?? -1
            : (a[sortField as keyof ProspectWithScore] as string | number | null) ?? "";
        const bv =
          sortField === "icp_score"
            ? b.prospect_scores?.score ?? -1
            : (b[sortField as keyof ProspectWithScore] as string | number | null) ?? "";
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }
    return rows;
  }, [members, debouncedSearch, sortField, sortOrder]);

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);

  const selection = useMemo(

    () => ({
      selectedIds,
      onToggle: (id: string) =>
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      onToggleAll: () =>
        setSelectedIds((prev) =>
          prev.size === visibleMembers.length
            ? new Set()
            : new Set(visibleMembers.map((p) => p.id))
        ),
      allSelected: visibleMembers.length > 0 && selectedIds.size === visibleMembers.length,
      someSelected: selectedIds.size > 0,
    }),
    [selectedIds, visibleMembers]
  );

  const handleSort = (field: ProspectSortField) => {
    if (field === sortField) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleRename = async (name: string, description: string) => {
    setRenaming(true);
    setRenameError(null);
    const result = await updateSavedListAction(list.id, name, description || undefined);
    if (result.error) {
      setRenameError(result.error);
      setRenaming(false);
      return false;
    }
    setRenaming(false);
    success("List updated");
    setShowRename(false);
    router.refresh();
    return true;
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteSavedListAction(list.id);
    if (result.error) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }
    success("List deleted", "Prospects were kept — only the list was removed.");
    router.push("/dashboard/saved-lists");
  };

  const handleRemoveSelected = async () => {
    setRemoving(true);
    setRemoveError(null);
    const ids = Array.from(selectedIds);
    const result = await removeProspectsFromListAction(list.id, ids);
    if (result.error) {
      setRemoveError(result.error);
      setRemoving(false);
      return;
    }
    setRemoving(false);
    setShowRemoveConfirm(false);
    setSelectedIds(new Set());
    success(`${result.removed} prospect${result.removed === 1 ? "" : "s"} removed from list`);
    router.refresh();
  };

  return (
    // ps-page-height (md+): fills exactly the space between the dashboard
    // topbar and the viewport bottom (canvas padding already accounted for),
    // so ONLY the ProspectTable's internal ps-scroll area scrolls — same
    // fixed-height + slim-scrollbar behavior as the Prospects page. Below md
    // the class does nothing and the page keeps its natural document scroll.
    <section className="dashboard-enter flex min-h-0 flex-col ps-page-height">
      {/* Back */}
      <Link
        href="/dashboard/saved-lists"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Saved Lists
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900/[0.06] text-navy-900">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 6h13" />
              <path d="M8 12h13" />
              <path d="M8 18h13" />
              <path d="M3 6h.01" />
              <path d="M3 12h.01" />
              <path d="M3 18h.01" />
            </svg>
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {list.name}
            </h1>
            {list.description && (
              <p className="mt-0.5 text-sm text-slate-500">{list.description}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              {members.length} prospect{members.length === 1 ? "" : "s"} · Updated{" "}
              {formatDate(list.updated_at)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
          <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add prospects
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowRename(true)}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
            Rename
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete
          </Button>
        </div>
      </div>

      {/* Member search — scoped to THIS list's members only */}
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
          placeholder="Search prospects in this list…"
          aria-label="Search prospects in this list"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300"
        />
        {searchTerm && (
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
        )}
      </div>

      {/* Members table (shared component) / empty states */}
      {members.length === 0 ? (
        <div className="premium-card mt-4 flex flex-1 items-center justify-center min-h-[320px]">
          <EmptyState
            title="This list is empty"
            description="Add prospects to keep them organized for research and outreach."
            icon={
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
            action={{ label: "Add prospects", onClick: () => setShowAdd(true) }}
          />
        </div>
      ) : visibleMembers.length === 0 ? (
        <div className="premium-card mt-4 flex flex-1 items-center justify-center min-h-[280px]">
          <EmptyState
            title="No prospects match your search."
            description={`Nothing in this list matches "${searchTerm}".`}
            icon={
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
            action={{ label: "Clear search", onClick: () => setSearchTerm("") }}
          />
        </div>
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <ProspectTable
            prospects={visibleMembers}
            onRowClick={(id) => setDetailId(id)}
            currentSort={sortField}
            currentOrder={sortOrder}
            onSort={handleSort}
            selection={selection}
            onEnrich={(id) => openIntelligenceAction({ type: "enrich_prospect", context: { targetId: id } })}
            onResearch={(id) => openIntelligenceAction({ type: "research_prospect", context: { targetId: id } })}
          />
        </div>
      )}

      {/* Bulk actions — same bar as Prospects, plus membership Remove */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onSaveToList={() => setShowSaveToList(true)}
        onEnrich={() => openIntelligenceAction({ type: "enrich_prospect" })}
        onResearch={() => openIntelligenceAction({ type: "research_prospect" })}
        onRemove={() => {
          setRemoveError(null);
          setShowRemoveConfirm(true);
        }}
        removeLabel="Remove from list"
        onClear={() => setSelectedIds(new Set())}
      />

      {/* Detail panel slide-over */}
      <ProspectDetailPanel
        prospectId={detailId}
        onClose={() => setDetailId(null)}
        savedLists={allLists}
        onDeleted={() => {
          setDetailId(null);
          router.refresh();
        }}
      />

      {/* Add prospects window */}
      <AddProspectsModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        listId={list.id}
        memberIds={memberIds}
      />

      {/* Rename window */}
      <RenameListModal
        open={showRename}
        onClose={() => setShowRename(false)}
        list={list}
        saving={renaming}
        error={renameError}
        onSubmit={handleRename}
      />

      {/* Delete confirmation — the container only; prospects are protected */}
      <Modal
        open={showDelete}
        onClose={() => {
          if (!deleting) setShowDelete(false);
        }}
        title={`Delete "${list.name}"?`}
        description="This permanently removes the list. The prospects inside it are NOT deleted."
        tone="alert"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDelete(false)} disabled={deleting}>
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
          <span className="font-semibold text-slate-900">{members.length}</span> prospect
          {members.length === 1 ? "" : "s"}. They will remain in Prospects after the list is removed.
        </p>
      </Modal>

      {/* Remove-from-list confirmation */}
      <Modal
        open={showRemoveConfirm}
        onClose={() => {
          if (!removing) setShowRemoveConfirm(false);
        }}
        title={`Remove ${selectedIds.size} prospect${selectedIds.size === 1 ? "" : "s"}?`}
        description="They will be removed from this list but stay safely in your Prospects workspace."
        tone="alert"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRemoveConfirm(false)} disabled={removing}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemoveSelected} loading={removing}>
              Remove from list
            </Button>
          </>
        }
      >
        {removeError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {removeError}
          </p>
        )}
        <p className="text-sm text-slate-600">Only list membership changes. No prospect data is deleted.</p>
      </Modal>

      {/* Save/move selected prospects to another list */}
      <SaveToListDialog
        open={showSaveToList && selectedIds.size > 0}
        onClose={() => setShowSaveToList(false)}
        prospectIds={Array.from(selectedIds)}
        savedLists={allLists.filter((l) => l.id !== list.id)}
        onComplete={() => setSelectedIds(new Set())}
      />
    </section>
  );
}

// ============================================================================
// Rename window — small animated action form for name + description.
// ============================================================================
interface RenameListModalProps {
  open: boolean;
  onClose: () => void;
  list: SavedList;
  saving: boolean;
  error: string | null;
  onSubmit: (name: string, description: string) => Promise<boolean>;
}

function RenameListModal({ open, onClose, list, saving, error, onSubmit }: RenameListModalProps) {
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description ?? "");

  // Re-sync when a different list is opened.
  useEffect(() => {
    if (open) {
      setName(list.name);
      setDescription(list.description ?? "");
    }
  }, [open, list]);

  return (
    <ActionWindow
      open={open}
      onClose={onClose}
      title="Rename list"
      description="Update the list name or description."
      // Minimize preserves the draft; closing asks when anything changed.
      dirty={name !== list.name || description !== (list.description ?? "")}
      busy={saving}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(name.trim(), description.trim())} loading={saving} disabled={!name.trim()}>
            Save changes
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!saving) onSubmit(name.trim(), description.trim());
        }}
        className="space-y-4"
      >
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Input
          id="rename-list-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          disabled={saving}
          required
        />
        <Textarea
          id="rename-list-description"
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={280}
          disabled={saving}
        />
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          Submit
        </button>
      </form>
    </ActionWindow>
  );
}
