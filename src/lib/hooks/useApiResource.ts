"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// useApiResource — minimal data-fetching hook (Prosventa pattern)
// Stage 8 — Phase 5
// ============================================================================
// The project deliberately has NO react-query/global store dependency; existing
// pages fetch via route handlers + local state. This tiny hook centralizes the
// loading/error/refresh tri-state so financial UIs never confuse "request
// failed" with "value is zero/null".
// ============================================================================

export interface ApiResource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** A refetch is currently in flight while previous data remains shown. */
  refreshing: boolean;
  refresh: () => Promise<void>;
}

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
}

export function useApiResource<T>(url: string, options?: { immediate?: boolean }): ApiResource<T> {
  const immediate = options?.immediate ?? true;
  const [state, setState] = useState<State<T>>({
    data: null,
    error: null,
    loading: immediate,
    refreshing: false,
  });
  const mounted = useRef(true);
  const hasData = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: !hasData.current,
      refreshing: hasData.current,
      error: null,
    }));
    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) {
        // Surface the server's safe customer-facing message when present.
        let message = `Request failed (${res.status})`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) message = body.error;
        } catch {
          /* non-JSON error body — keep generic message */
        }
        throw new Error(message);
      }
      const data = (await res.json()) as T;
      hasData.current = true;
      if (mounted.current) {
        setState({ data, error: null, loading: false, refreshing: false });
      }
    } catch (error) {
      if (mounted.current) {
        setState((prev) => ({
          // STALE-DATA PROTECTION: keep previously CONFIRMED data on screen
          // alongside the error — never overwrite it with null.
          data: prev.data,
          error: error instanceof Error ? error.message : "Something went wrong.",
          loading: false,
          refreshing: false,
        }));
      }
    }
  }, [url]);

  useEffect(() => {
    if (immediate) void refresh();
  }, [immediate, refresh]);

  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    refreshing: state.refreshing,
    refresh,
  };
}
