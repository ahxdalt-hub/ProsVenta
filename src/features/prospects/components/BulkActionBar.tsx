"use client";

// ============================================================================
// Prosventa Prospects — Bulk Action Bar (Phase 1 rebuild)
// ============================================================================
// Contextual toolbar shown while prospects are selected. Appears with a
// subtle 200ms rise (no page shift), exposes only REAL operations:
//   • Save to list   → existing saved-list actions (RLS-scoped)
//   • Enrich/Research→ existing Intelligence action window (credit-aware,
//                      server-enforced billing)
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast";

interface BulkActionBarProps {
  selectedCount: number;
  onSaveToList: () => void;
  onEnrich: () => void;
  onResearch: () => void;
  onClear: () => void;
  /** Optional destructive context action (e.g. Remove from list). */
  onRemove?: () => void;
  removeLabel?: string;
  /**
   * Optional permanent delete action for the selected prospects. When
   * provided, a red Delete button appears; clicking it opens the animated
   * warning confirmation before calling this handler. Returning
   * `{ error }` surfaces a toast; returning nothing shows the success toast.
   */
  onDelete?: () => Promise<{ error: string | null } | void>;
  deleteLabel?: string;
}

export function BulkActionBar({
  selectedCount,
  onSaveToList,
  onEnrich,
  onResearch,
  onClear,
  onRemove,
  removeLabel = "Remove",
  onDelete,
  deleteLabel = "Delete",
}: BulkActionBarProps) {
  const reduce = useReducedMotion();
  const { success, error: toastError } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Escape closes the confirmation; Cancel receives focus when it opens.
  useEffect(() => {
    if (!showDeleteConfirm) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) setShowDeleteConfirm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDeleteConfirm, deleting]);

  const handleConfirmDelete = async () => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    try {
      const result = await onDelete();
      if (result && result.error) {
        toastError("Couldn't delete prospects", result.error);
      } else {
        success(
          `${selectedCount} ${selectedCount === 1 ? "prospect" : "prospects"} deleted`
        );
        setShowDeleteConfirm(false);
      }
    } catch {
      toastError("Couldn't delete prospects", "Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
          aria-live="polite"
        >
          <div
            role="toolbar"
            aria-label="Bulk actions"
            className="pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg shadow-slate-900/10 backdrop-blur-md sm:gap-3 sm:px-4"
          >
            <span className="whitespace-nowrap text-sm font-semibold text-slate-700">
              {selectedCount} selected
            </span>
            <span className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <Button variant="secondary" size="sm" onClick={onSaveToList}>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save to list
            </Button>
            <Button variant="secondary" size="sm" onClick={onEnrich}>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Enrich selected
            </Button>
            <Button variant="secondary" size="sm" onClick={onResearch}>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Research
            </Button>
            {onRemove && (
              <Button variant="danger" size="sm" onClick={onRemove}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                {removeLabel}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                {deleteLabel}
              </Button>
            )}
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Clear selection"
            >
              Clear
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Delete confirmation — animated warning sign + rise/scale entrance */}
    <AnimatePresence>
      {showDeleteConfirm && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
          role="presentation"
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm delete"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 16 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-6 text-center shadow-xl shadow-red-900/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated warning sign — pulsing red badge with shaking icon */}
            <motion.div
              initial={reduce ? { scale: 1 } : { scale: 0, rotate: -30 }}
              animate={reduce ? { scale: 1 } : { scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.05 }}
              className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100"
            >
              <motion.svg
                className="h-7 w-7 text-red-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                animate={reduce ? undefined : { rotate: [0, -6, 6, -4, 4, 0] }}
                transition={{ duration: 0.6, delay: 0.25 }}
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </motion.svg>
              <motion.span
                className="absolute h-14 w-14 rounded-full bg-red-400"
                aria-hidden="true"
                animate={reduce ? undefined : { scale: [1, 1.5], opacity: [0.4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                style={{ position: "absolute" }}
              />
            </motion.div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Delete {selectedCount} {selectedCount === 1 ? "prospect" : "prospects"}?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This permanently removes the selected prospects and their data
              from your workspace. This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                ref={cancelRef}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete} loading={deleting}>
                Yes, delete
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
