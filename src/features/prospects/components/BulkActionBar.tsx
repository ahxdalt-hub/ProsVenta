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

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";

interface BulkActionBarProps {
  selectedCount: number;
  onSaveToList: () => void;
  onEnrich: () => void;
  onResearch: () => void;
  onClear: () => void;
  /** Optional destructive context action (e.g. Remove from list). */
  onRemove?: () => void;
  removeLabel?: string;
}

export function BulkActionBar({
  selectedCount,
  onSaveToList,
  onEnrich,
  onResearch,
  onClear,
  onRemove,
  removeLabel = "Remove",
}: BulkActionBarProps) {
  const reduce = useReducedMotion();

  return (
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
  );
}
