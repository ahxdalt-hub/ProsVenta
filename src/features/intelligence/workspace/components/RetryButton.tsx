"use client";

import { useRouter } from "next/navigation";

/**
 * Section-scoped retry. Re-renders the current route so ONLY the failed
 * Suspense boundary refetches — the rest of the page stays intact.
 */
export function RetryButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      Retry
    </button>
  );
}
