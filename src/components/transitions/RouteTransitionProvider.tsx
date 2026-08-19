"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { NavigationProgress } from "./NavigationProgress";
import { useWorkspaceLoading } from "@/components/loading/WorkspaceLoadingProvider";
import { getLoadingMessages } from "@/components/loading/loading-messages";

interface RouteTransitionContextValue {
  navigate: (href: string) => void;
  isTransitioning: boolean;
}

const RouteTransitionContext = createContext<RouteTransitionContextValue>({
  navigate: () => {},
  isTransitioning: false,
});

export function useRouteTransition() {
  return useContext(RouteTransitionContext);
}

/**
 * Client-side navigation with a fullscreen loading overlay for workspace routes.
 * Navigation is issued immediately; the overlay covers any in-progress render.
 * The dashboard's WorkspaceContent signals readiness, letting the overlay fade
 * out and reveal the already-rendered page — no flash, no secondary loading.
 *
 * Public routes (homepage, /explore, auth, legal, etc.) navigate directly so
 * they never inherit the authenticated workspace loading experience.
 */

const NAV_MIN_DURATION = 450;

/** Routes that mount WorkspaceContent and use the fullscreen workspace overlay. */
const WORKSPACE_ROUTE_PREFIXES = ["/dashboard", "/onboarding"];

function isWorkspaceRoute(href: string): boolean {
  return WORKSPACE_ROUTE_PREFIXES.some(
    (prefix) => href === prefix || href.startsWith(`${prefix}/`)
  );
}

export function RouteTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { showOverlay } = useWorkspaceLoading();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingHref = useRef<string | null>(null);

  const navigate = useCallback(
    (href: string) => {
      if (reduce) {
        router.push(href);
        return;
      }

      if (isTransitioning) return;

      pendingHref.current = href;
      setIsTransitioning(true);

      // Navigate immediately — the overlay masks the transition.
      router.push(href);

      // The fullscreen workspace overlay is only used for routes that mount
      // WorkspaceContent (dashboard + onboarding) to signal readiness.
      // Public routes like /explore navigate directly — no dashboard loading.
      if (isWorkspaceRoute(href)) {
        showOverlay({
          minDuration: NAV_MIN_DURATION,
          messages: getLoadingMessages(href),
          fallbackMs: 3500,
        });
      }

      // Keep the top progress bar in sync for the navigation lifecycle.
      // It completes when the overlay fades (i.e. the page is ready).
      // We extend it just slightly past the overlay to avoid a gap.
      setTimeout(() => {
        setIsTransitioning(false);
        pendingHref.current = null;
      }, NAV_MIN_DURATION + 300);
    },
    [router, isTransitioning, reduce, showOverlay]
  );

  return (
    <RouteTransitionContext.Provider value={{ navigate, isTransitioning }}>
      {children}

      <NavigationProgress active={isTransitioning} />
    </RouteTransitionContext.Provider>
  );
}