"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthLoading } from "./AuthLoadingProvider";

/**
 * Signals the AuthLoadingOverlay that the auth page content has finished
 * mounting/hydrating. Once mounted, the overlay can fade out (after the
 * minimum duration has elapsed) to reveal the already-rendered auth page.
 *
 * Re-signals readiness on every route change (via usePathname) so the
 * overlay fades correctly for each navigation, not just the first mount.
 *
 * This is the auth-page counterpart of WorkspaceContent. It is only used
 * inside the (auth) route group layout.
 */
export function AuthContent({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { markAuthReady } = useAuthLoading();
  const pathname = usePathname();
  const markedRef = useRef(false);

  useEffect(() => {
    // Reset on route change
    markedRef.current = false;

    // Wait for the frame to paint, then declare ready.
    const raf = requestAnimationFrame(() => {
      markedRef.current = true;
      markAuthReady();
    });
    return () => cancelAnimationFrame(raf);
  }, [markAuthReady, pathname]);

  return <>{children}</>;
}