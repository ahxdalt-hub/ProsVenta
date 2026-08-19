"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "prosventa:sidebar-collapsed";

/**
 * Manages the sidebar collapse state with localStorage persistence.
 *
 * SSR-safe: defaults to expanded on the server, hydrates from localStorage
 * after mount to avoid hydration mismatches.
 *
 * @returns { collapsed, toggle, setCollapsed, hydrated }
 */
export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {
      // localStorage might be unavailable (private mode, etc.)
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever the state changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignore quota / availability errors
    }
  }, [collapsed, hydrated]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return { collapsed, toggle, setCollapsed, hydrated };
}