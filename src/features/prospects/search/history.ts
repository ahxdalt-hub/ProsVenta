// ============================================================================
// Prosventa AI Search History
// Stage 3 — Phase 4: AI-Powered Prospect Search
// ============================================================================
// Client-side search history persistence using localStorage.
// Future-ready: can be swapped for server-managed history with syncing.
// ============================================================================

import { useCallback, useMemo, useState } from "react";
import type { ProspectFilters } from "@/features/prospects/types/query";
import type { SearchHistoryEntry } from "./types";

const STORAGE_KEY = "prosventa:search-history";
const MAX_ENTRIES = 12;

/**
 * Load search history from localStorage.
 */
function loadHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as { entries?: SearchHistoryEntry[] };
    return parsed.entries ?? [];
  } catch {
    return [];
  }
}

/**
 * Persist search history to localStorage.
 */
function saveHistory(entries: SearchHistoryEntry[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ entries } satisfies { entries: SearchHistoryEntry[] })
    );
  } catch {
    // localStorage might be unavailable (private mode, etc.)
  }
}

/**
 * Hook for managing search history state.
 * Provides add/remove/pin/clear operations with automatic persistence.
 */
export function useSearchHistory() {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>(() => loadHistory());

  /**
   * Add a new search to history.
   * Deduplicates by query and moves existing entry to the top.
   */
  const addSearch = useCallback((query: string, filters: ProspectFilters, resultCount?: number) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const entry: SearchHistoryEntry = {
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      query: trimmed,
      filters,
      timestamp: Date.now(),
      pinned: false,
      ...(resultCount !== undefined ? { resultCount } : {}),
    };

    setEntries((prev) => {
      // Remove any existing entry with the same query
      const filtered = prev.filter(
        (e) => e.query.toLowerCase() !== trimmed.toLowerCase()
      );

      const next = [entry, ...filtered].slice(0, MAX_ENTRIES);
      saveHistory(next);
      return next;
    });
  }, []);

  /**
   * Remove a specific search from history.
   */
  const removeSearch = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  /**
   * Toggle pin/unpin state for a search.
   */
  const togglePin = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.map((e) =>
        e.id === id ? { ...e, pinned: !e.pinned } : e
      );
      saveHistory(next);
      return next;
    });
  }, []);

  /**
   * Clear all search history.
   */
  const clearHistory = useCallback(() => {
    setEntries([]);
    saveHistory([]);
  }, []);

  /**
   * Get recently used queries for suggestions.
   */
  const recentQueries = useMemo(
    () => entries.slice(0, 5).map((e) => e.query),
    [entries]
  );

  return {
    entries,
    addSearch,
    removeSearch,
    togglePin,
    clearHistory,
    recentQueries,
  };
}