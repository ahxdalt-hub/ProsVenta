"use client";

// ============================================================================
// Prosventa Saved Lists — Add prospects window (Phase 2 rebuild)
// ============================================================================
// Searches REAL organization prospects through the EXISTING RLS-scoped
// queryProspects server action (debounced — never per keystroke) and adds the
// selection via the EXISTING saveProspectToList action. No navigation away.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionWindow, SearchField } from "@/components/action-window";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { queryProspects } from "@/lib/db/prospects";
import { saveProspectsToListAction } from "@/features/prospects/actions/manage";
import type { ProspectWithScore } from "@/features/prospects/types/prospect";

interface AddProspectsModalProps {
  open: boolean;
  onClose: () => void;
  listId: string;
  /** Prospect ids already in this list (shown as already-members). */
  memberIds: string[];
}

function getLocation(prospect: ProspectWithScore): string {
  const parts = [prospect.city, prospect.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return prospect.location ?? "—";
}

export function AddProspectsModal({ open, onClose, listId, memberIds }: AddProspectsModalProps) {
  const router = useRouter();
  const { success } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<ProspectWithScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset whenever the window opens.
  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setResults([]);
      setSelectedIds(new Set());
      setError(null);
      setAdding(false);
      setLoading(true);
    }
  }, [open]);

  // Debounced real search over the organization's prospects (RLS-scoped).
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const page = await queryProspects({
          search: searchTerm.trim() || undefined,
          page: 1,
          pageSize: 25,
        });
        setResults(page.prospects);
      } catch {
        setResults([]);
        setError("Could not load prospects. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, open]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setAdding(true);
    setError(null);
    const ids = Array.from(selectedIds);
    const result = await saveProspectsToListAction(listId, ids);
    if (result.error) {
      setError(result.error);
      setAdding(false);
      return;
    }
    setAdding(false);
    success(`${ids.length} prospect${ids.length === 1 ? "" : "s"} added to list.`);
    onClose();
    router.refresh();
  };

  return (
    <ActionWindow
      open={open}
      onClose={onClose}
      title="Add prospects"
      description="Search your prospects and add them to this list."
      // Minimize preserves the selection; closing asks before discarding it.
      dirty={selectedIds.size > 0}
      busy={adding}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={adding}>
            Cancel
          </Button>
          <Button onClick={handleAdd} loading={adding} disabled={selectedIds.size === 0}>
            Add{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <SearchField
        value={searchTerm}
        onChange={setSearchTerm}
        loading={loading}
        placeholder="Search by company, contact, or industry…"
        label="Search prospects"
        disabled={adding}
      />

      <div className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1" role="group" aria-label="Search results">
        {loading ? (
          <div className="space-y-2 py-2" aria-live="polite">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="premium-skeleton h-11 w-full rounded-lg" aria-hidden="true" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No prospects match your search.</p>
        ) : (
          results.map((prospect) => {
            const isMember = memberIds.includes(prospect.id);
            const isSelected = selectedIds.has(prospect.id);
            return (
              <button
                key={prospect.id}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                disabled={isMember || adding}
                onClick={() => toggle(prospect.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  isSelected ? "border-blue-300 bg-blue-50/60" : "border-slate-200 hover:bg-slate-50",
                  isMember && "cursor-default opacity-60"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {prospect.company_name || prospect.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {[prospect.industry, getLocation(prospect)].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                {isMember ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    In list
                  </span>
                ) : (
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors duration-150",
                      isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 bg-white"
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </ActionWindow>
  );
}
