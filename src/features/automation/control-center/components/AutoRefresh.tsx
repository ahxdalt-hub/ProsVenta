"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Restrained auto-refresh: polls router.refresh() ONLY while something is
 * actually running/waiting, at a 20s cadence — never per-second polling.
 * Next.js refresh preserves scroll position and re-renders server components.
 */
export function AutoRefresh({ enabled, intervalMs = 20000 }: { enabled: boolean; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      // Skip the refresh while the tab is hidden — no background request spam.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, router]);

  return null;
}
