"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceLoading } from "@/components/loading/WorkspaceLoadingProvider";
import { AUTH_MESSAGES } from "@/components/loading/loading-messages";

/**
 * Auth success → immediately navigate to /dashboard and show the fullscreen
 * overlay. The overlay covers the screen while the dashboard renders beneath it.
 * The dashboard's WorkspaceContent signals readiness; the overlay fades out
 * after the 1.3s minimum duration, revealing the already-rendered dashboard.
 *
 * No flash, no separate loading page, no artificial delay on the auth page.
 */

const AUTH_MIN_DURATION = 1300;

export default function AuthSuccessTransition({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const { showOverlay } = useWorkspaceLoading();
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || navigatedRef.current) return;

    navigatedRef.current = true;

    // Navigate immediately — the overlay masks the transition.
    router.push("/dashboard");

    // Show the fullscreen overlay (auth context, 1.3s minimum duration).
    // It will stay visible until the dashboard's WorkspaceContent marks ready.
    showOverlay({
      minDuration: AUTH_MIN_DURATION,
      messages: AUTH_MESSAGES,
    });
  }, [isAuthenticated, router, showOverlay]);

  return null;
}