"use client";

// ============================================================================
// Prosventa Intelligence — Action Window Host / Provider (Phase 2)
// ============================================================================
// Mounted once (Intelligence page). Provides the single
// `useIntelligenceActionWindow()` surface any Intelligence trigger calls:
//   openIntelligenceAction({ type, context })
// Owns the one reusable window instance and drives its open/close lifecycle.
// Closing animates out (request retained during exit) then clears the session.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { IntelligenceActionRequest } from "./types";
import { IntelligenceActionWindow } from "./IntelligenceActionWindow";

export interface IntelligenceActionHostApi {
  openIntelligenceAction: (request: IntelligenceActionRequest) => void;
}

const HostContext = createContext<IntelligenceActionHostApi | null>(null);

export function useIntelligenceActionWindow(): IntelligenceActionHostApi {
  const ctx = useContext(HostContext);
  if (!ctx) {
    throw new Error(
      "useIntelligenceActionWindow must be used within IntelligenceActionHostProvider"
    );
  }
  return ctx;
}

export function IntelligenceActionHostProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [request, setRequest] = useState<IntelligenceActionRequest | null>(
    null
  );
  const [open, setOpen] = useState(false);
  // Kept across the provider's children renders; used to hand focus back on
  // close without forcing end-users to re-locate their trigger.
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const openIntelligenceAction = useCallback(
    (next: IntelligenceActionRequest) => {
      lastTriggerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setRequest(next);
      setOpen(true);
    },
    []
  );

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleExitComplete = useCallback(() => {
    setRequest(null);
    lastTriggerRef.current?.focus?.();
    lastTriggerRef.current = null;
  }, []);

  const api = useMemo<IntelligenceActionHostApi>(
    () => ({ openIntelligenceAction }),
    [openIntelligenceAction]
  );

  return (
    <HostContext.Provider value={api}>
      {children}
      <IntelligenceActionWindow
        request={request}
        open={open}
        onClose={handleClose}
        onExitComplete={handleExitComplete}
      />
    </HostContext.Provider>
  );
}