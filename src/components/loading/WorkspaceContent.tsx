"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useWorkspaceLoading } from "./WorkspaceLoadingProvider";

/**
 * Signals the loading overlay that the workspace content has finished
 * mounting/hydrating. Once mounted, the overlay can fade out (after the
 * minimum duration has elapsed) to reveal the already-rendered dashboard.
 *
 * Re-signals readiness on every route change (via usePathname) so the
 * overlay fades correctly for each navigation, not just the first mount.
 */

export function WorkspaceContent({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { markReady } = useWorkspaceLoading();
  const pathname = usePathname();
  const markedRef = useRef(false);

  useEffect(() => {
    // Reset on route change
    markedRef.current = false;

    // Wait for the frame to paint, then declare ready.
    const raf = requestAnimationFrame(() => {
      markedRef.current = true;
      markReady();
    });
    return () => cancelAnimationFrame(raf);
  }, [markReady, pathname]);

  return <>{children}</>;
}
