"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { LoadingOverlay } from "./LoadingOverlay";

/**
 * Global workspace loading provider.
 * Renders a fullscreen overlay at the root so the dashboard can render beneath it.
 * The overlay fades only when `markReady()` is called AND `minDuration` has elapsed,
 * revealing the already-rendered dashboard underneath — no flash, no teleport.
 */

interface ShowOverlayOptions {
  minDuration: number;
  messages?: string[];
  fallbackMs?: number;
}

interface WorkspaceLoadingContextValue {
  showOverlay: (opts: ShowOverlayOptions) => void;
  markReady: () => void;
}

const WorkspaceLoadingContext = createContext<WorkspaceLoadingContextValue>({
  showOverlay: () => {},
  markReady: () => {},
});

export function useWorkspaceLoading() {
  return useContext(WorkspaceLoadingContext);
}

const DEFAULT_FALLBACK_MS = 3000;

export function WorkspaceLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [minDuration, setMinDuration] = useState(450);
  const [messages, setMessages] = useState<string[]>();
  const [overlayKey, setOverlayKey] = useState(0);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showOverlay = useCallback(
    ({ minDuration, messages, fallbackMs }: ShowOverlayOptions) => {
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
      // if the target page never signals readiness (e.g. non-dashboard routes).
      fallbackRef.current = setTimeout(() => {
        setReady(true);
      }, fallbackMs ?? DEFAULT_FALLBACK_MS);
    },
    [reduce]
  );

  const markReady = useCallback(() => {
    setReady(true);
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
  }, []);

  const handleFadeComplete = useCallback(() => {
    setActive(false);
    setReady(false);
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
  }, []);

  return (
    <WorkspaceLoadingContext.Provider value={{ showOverlay, markReady }}>
      {children}
      <LoadingOverlay
        key={overlayKey}
        active={active}
        ready={ready}
        messages={messages}
        minDuration={minDuration}
        onFadeComplete={handleFadeComplete}
      />
    </WorkspaceLoadingContext.Provider>
  );
}