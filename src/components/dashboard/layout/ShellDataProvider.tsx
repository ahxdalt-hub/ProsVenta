"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Caches dashboard shell data (workspace name, user email) on the client
 * so the shell doesn't re-fetch on every route change.
 * The server layout still validates auth, but the shell data persists.
 *
 * Also holds the authenticated user's identity (name + signed avatar URL).
 * This is the SINGLE shared source consumed by Topbar, ProfileMenu and any
 * other authenticated-user avatar; Settings writes propagate here instantly
 * (no reload / logout needed). Avatar URLs are short-lived signed Storage
 * URLs — they are refreshed on every server render and replaced in-memory
 * after uploads, never persisted long-term.
 */

interface ShellData {
  workspaceName: string;
  userEmail: string;
  userName: string | null;
  /** Short-lived signed avatar URL (private bucket); null = show initials. */
  avatarUrl: string | null;
}

interface ShellDataContextValue {
  data: ShellData;
  setData: (data: ShellData) => void;
  /** Patch identity fields after an upload/remove/name change. */
  setIdentity: (
    identity: Partial<Pick<ShellData, "userName" | "avatarUrl">>
  ) => void;
}

const ShellDataContext = createContext<ShellDataContextValue | null>(null);

export function ShellDataProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData: ShellData;
}) {
  const [data, setData] = useState<ShellData>(initialData);

  const setIdentity = useCallback(
    (identity: Partial<Pick<ShellData, "userName" | "avatarUrl">>) => {
      setData((prev) => ({ ...prev, ...identity }));
    },
    []
  );

  const value = useMemo(
    () => ({ data, setData, setIdentity }),
    [data, setIdentity]
  );

  return (
    <ShellDataContext.Provider value={value}>
      {children}
    </ShellDataContext.Provider>
  );
}

export function useShellData() {
  const ctx = useContext(ShellDataContext);
  if (!ctx) {
    throw new Error("useShellData must be used within a ShellDataProvider");
  }
  return ctx;
}