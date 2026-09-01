"use client";

// ============================================================================
// Prosventa Prospects — Save to List action window (Phase 1 rebuild → Phase 4)
// ============================================================================
// Uses the SHARED reusable ActionWindow system (minimize/restore, dirty-close
// confirmation) + EXISTING server actions (saveProspectToList /
// createSavedListAction). No second modal system, no navigation away:
// prospects stay visible after confirming. Server-side plan limits & RLS stay
// authoritative; client errors are shown as plain-language messages only.
// ============================================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionWindow } from "@/components/action-window";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { SavedList } from "@/types/database";
import { createSavedListAction } from "../actions/lists";
import { saveProspectsToListAction } from "../actions/manage";

interface SaveToListDialogProps {
  open: boolean;
  onClose: () => void;
  prospectIds: string[];
  savedLists: SavedList[];
  /** Clears the selection; the page refreshes via router.refresh. */
  onComplete: () => void;
}

export function SaveToListDialog({
  open,
  onClose,
  prospectIds,
  savedLists,
  onComplete,
}: SaveToListDialogProps) {
  const router = useRouter();
  const { success } = useToast();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [creatingNew, setCreatingNew] = useState(savedLists.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset local state whenever the dialog opens for a fresh selection.
  useEffect(() => {
    if (open) {
      setSelectedListId(null);
      setNewListName("");
      setCreatingNew(savedLists.length === 0);
      setError(null);
      setSaving(false);
    }
  }, [open, savedLists.length]);

  const handleConfirm = async () => {
    if (prospectIds.length === 0) return;
    setError(null);

    // Resolve target list — create one first when requested.
    let listId = selectedListId;
    if (creatingNew) {
      if (!newListName.trim()) {
        setError("Enter a name for the new list.");
        return;
      }
      setSaving(true);
      const created = await createSavedListAction(newListName.trim());
      setSaving(false);
      if (created.error || !created.id) {
        setError(created.error ?? "The list could not be created.");
        return;
      }
      listId = created.id;
    }

    if (!listId) {
      setError("Choose a list to save these prospects to.");
      return;
    }

    setSaving(true);
    const result = await saveProspectsToListAction(listId, prospectIds);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    success(
      `${prospectIds.length} ${prospectIds.length === 1 ? "prospect" : "prospects"} saved to the list.`
    );

    router.refresh(); // keep list counts accurate without navigation
    onComplete();
    onClose();
  };

  return (
    <ActionWindow
      open={open && prospectIds.length > 0}
      onClose={onClose}
      title="Save to list"
      description={
        prospectIds.length === 1
          ? "Choose where to save this prospect."
          : `Choose where to save these ${prospectIds.length} prospects.`
      }
      // Minimize vs close: minimize preserves the selection; close asks before
      // discarding anything the user has chosen.
      dirty={selectedListId !== null || newListName.trim().length > 0}
      busy={saving}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={saving}>
            {creatingNew && newListName.trim() ? "Create & save" : "Save"}
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!creatingNew && (
        <div className="max-h-56 space-y-1 overflow-y-auto pr-1" role="radiogroup" aria-label="Existing lists">
          {savedLists.map((list) => (
            <button
              key={list.id}
              type="button"
              role="radio"
              aria-checked={selectedListId === list.id}
              disabled={saving}
              onClick={() => setSelectedListId(list.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                selectedListId === list.id
                  ? "border-blue-300 bg-blue-50/60"
                  : "border-slate-200 hover:bg-slate-50"
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900">{list.name}</span>
                {list.description && (
                  <span className="block truncate text-xs text-slate-500">{list.description}</span>
                )}
              </span>
              {selectedListId === list.id && (
                <svg className="h-4 w-4 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      {creatingNew ? (
        <div className={savedLists.length > 0 ? "mt-4" : ""}>
          <label htmlFor="new-list-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            New list
          </label>
          <Input
            id="new-list-name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="e.g. Q3 outreach"
            maxLength={80}
            disabled={saving}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreatingNew(true)}
          disabled={saving}
          className="mt-3 inline-flex items-center gap-1.5 rounded text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create new list
        </button>
      )}

    </ActionWindow>
  );
}
