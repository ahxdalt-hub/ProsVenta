// ============================================================================
// Prosventa AI Search Empty State
// Stage 3 — Phase 4: AI-Powered Prospect Search
// ============================================================================
// No-result state displayed when a search yields no prospects.
// Offers clear actions to refine or clear filters.
// ============================================================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { SearchIcon, FilterIcon, XIcon } from "./icons";

interface EmptySearchStateProps {
  query?: string;
  onClearFilters: () => void;
  onNewSearch: () => void;
  onAdjustCriteria: () => void;
}

export const EmptySearchState = memo(function EmptySearchState({
  query,
  onClearFilters,
  onNewSearch,
  onAdjustCriteria,
}: EmptySearchStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center text-center px-6 py-12"
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mb-5">
        <SearchIcon className="w-6 h-6" />
      </div>

      <h3 className="text-base font-semibold text-slate-900">
        No matching prospects
      </h3>

      {query && (
        <p className="mt-1.5 text-sm text-slate-500 max-w-sm">
          We couldn't find any prospects matching{" "}
          <span className="font-medium text-slate-700">"{query}"</span>.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-150"
        >
          <XIcon className="w-3.5 h-3.5" />
          Clear filters
        </button>
        <button
          type="button"
          onClick={onAdjustCriteria}
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors duration-150"
        >
          <FilterIcon className="w-3.5 h-3.5" />
          Adjust criteria
        </button>
        <button
          type="button"
          onClick={onNewSearch}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors duration-150"
        >
          <SearchIcon className="w-3.5 h-3.5" />
          Try another search
        </button>
      </div>
    </motion.div>
  );
});