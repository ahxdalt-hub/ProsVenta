"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Caches dashboard shell data (workspace name, user email) on the client
 * so the shell doesn't re-fetch on every route change.
 * The server layout still validates auth, but the shell data persists.
 */

interface ShellData {
  workspaceName: string;
  userEmail: string;
}

interface ShellDataContextValue {
  data: ShellData;
  setData: (data: ShellData) => void;
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

  const value = useMemo(() => ({ data, setData }), [data]);

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