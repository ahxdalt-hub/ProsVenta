"use client";

// ============================================================================
// Prosventa Intelligence Workspace — Refresh control
// ============================================================================
// Phase 1: triggers a server re-render of the Intelligence page via the Next
// router. Deliberately does NOT refetch datasets client-side — the page's
// server component remains the single data-loading path.
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

export function IntelligenceRefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [announced, setAnnounced] = useState(false);

  function handleRefresh() {
    setAnnounced(false);
    startTransition(() => {
      router.refresh();
      setAnnounced(true);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isPending}
        aria-busy={isPending || undefined}
        className="btn-press inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all duration-150 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Spinner size="sm" className="shrink-0" />
        ) : (
          <svg
            className="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        )}
        {isPending ? "Refreshing…" : "Refresh"}
      </button>
      {/* Screen-reader status: refresh outcome without visual noise. */}
      <span role="status" aria-live="polite" className="sr-only">
        {announced && !isPending ? "Intelligence refreshed" : ""}
      </span>
    </>
  );
}
