"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AuthLoadingOverlay } from "./AuthLoadingOverlay";

/**
 * Global authentication loading provider.
 *
 * Renders a fullscreen AuthLoadingOverlay at the root so the auth page can
 * render beneath it. The overlay fades only when `markReady()` is called AND
 * `minDuration` has elapsed, revealing the already-rendered auth page
 * underneath — no flash, no teleport.
 *
 * This is SEPARATE from the WorkspaceLoadingProvider (dashboard loading).
 * It is only used for unauthenticated navigation to auth routes
 * (signup / login / forgot-password). Never used for dashboard routes.
 */

interface ShowAuthOverlayOptions {
  minDuration: number;
  messages?: string[];
  fallbackMs?: number;
}

interface AuthLoadingContextValue {
  showAuthOverlay: (opts: ShowAuthOverlayOptions) => void;
  markAuthReady: () => void;
}

const AuthLoadingContext = createContext<AuthLoadingContextValue>({
  showAuthOverlay: () => {},
  markAuthReady: () => {},
});

export function useAuthLoading() {
  return useContext(AuthLoadingContext);
}

const DEFAULT_FALLBACK_MS = 3000;

export function AuthLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [minDuration, setMinDuration] = useState(1200);
  const [messages, setMessages] = useState<string[]>();
  const [overlayKey, setOverlayKey] = useState(0);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAuthOverlay = useCallback(
    ({ minDuration, messages, fallbackMs }: ShowAuthOverlayOptions) => {
      // Reduced motion: skip the overlay entirely; the caller still navigates.
      if (reduce) return;

      if (fallbackRef.current) clearTimeout(fallbackRef.current);

      setMinDuration(minDuration);
      setMessages(messages);
      setActive(true);
      setReady(false);
      // Force the overlay to restart even if it's already active
      setOverlayKey((k) => k + 1);

      // Safety net: force-ready after fallbackMs to avoid an infinite overlay
      // if the target auth page never signals readiness.
      fallbackRef.current = setTimeout(() => {
        setReady(true);
      }, fallbackMs ?? DEFAULT_FALLBACK_MS);
    },
    [reduce]
  );

  const markAuthReady = useCallback(() => {
    setReady(true);
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
  }, []);

  const handleFadeComplete = useCallback(() => {
    setActive(false);
    setReady(false);
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
  }, []);

  return (
    <AuthLoadingContext.Provider value={{ showAuthOverlay, markAuthReady }}>
      {children}
      <AuthLoadingOverlay
        key={overlayKey}
        active={active}
        ready={ready}
        messages={messages}
        minDuration={minDuration}
        onFadeComplete={handleFadeComplete}
      />
    </AuthLoadingContext.Provider>
  );
}