// ============================================================================
// Prosventa AI Search History List
// Stage 3 — Phase 4: AI-Powered Prospect Search
// ============================================================================
// Displays recent and pinned searches in the search dropdown.
// ============================================================================

"use client";

import { memo, useCallback, useMemo } from "react";
import type { SearchHistoryEntry } from "../types";
import { HistoryIcon, PinIcon, XIcon } from "./icons";

interface SearchHistoryProps {
  entries: SearchHistoryEntry[];
  onSelect: (entry: SearchHistoryEntry) => void;
  onRemove: (id: string) => void;
  onTogglePin: (id: string) => void;
  onClear: () => void;
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

export const SearchHistory = memo(function SearchHistory({
  entries,
  onSelect,
  onRemove,
  onTogglePin,
  onClear,
}: SearchHistoryProps) {
  const pinned = useMemo(() => entries.filter((e) => e.pinned), [entries]);
  const recent = useMemo(() => entries.filter((e) => !e.pinned).slice(0, 5), [entries]);

  const handleSelect = useCallback(
    (entry: SearchHistoryEntry) => () => onSelect(entry),
    [onSelect]
  );

  const handleRemove = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove(id);
    },
    [onRemove]
  );

  const handleTogglePin = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      onTogglePin(id);
    },
    [onTogglePin]
  );

  if (entries.length === 0) return null;

  return (
    <div className="border-t border-slate-100">
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Recent Searches
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors duration-150"
        >
          Clear all
        </button>
      </div>

      <div className="py-1">
        {pinned.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={handleSelect(entry)}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-left hover:bg-slate-50 transition-colors duration-100 group"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-amber-500 shrink-0">
              <PinIcon className="w-4 h-4" filled />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm text-slate-700 truncate">{entry.query}</span>
              <span className="block text-xs text-slate-400">
                {formatTime(entry.timestamp)}
                {entry.resultCount !== undefined && ` · ${entry.resultCount} results`}
              </span>
            </span>
            <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
              <span
                role="button"
                tabIndex={0}
                onClick={handleTogglePin(entry.id)}
                className="p-1 text-slate-400 hover:text-amber-500 transition-colors duration-100"
                aria-label="Unpin search"
              >
                <PinIcon className="w-3.5 h-3.5" />
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={handleRemove(entry.id)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors duration-100"
                aria-label="Delete search"
              >
                <XIcon className="w-3.5 h-3.5" />
              </span>
            </span>
          </button>
        ))}

        {recent.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={handleSelect(entry)}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-left hover:bg-slate-50 transition-colors duration-100 group"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-400 shrink-0">
              <HistoryIcon className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm text-slate-700 truncate">{entry.query}</span>
              <span className="block text-xs text-slate-400">
                {formatTime(entry.timestamp)}
                {entry.resultCount !== undefined && ` · ${entry.resultCount} results`}
              </span>
            </span>
            <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
              <span
                role="button"
                tabIndex={0}
                onClick={handleTogglePin(entry.id)}
                className="p-1 text-slate-400 hover:text-amber-500 transition-colors duration-100"
                aria-label="Pin search"
              >
                <PinIcon className="w-3.5 h-3.5" />
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={handleRemove(entry.id)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors duration-100"
                aria-label="Delete search"
              >
                <XIcon className="w-3.5 h-3.5" />
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});