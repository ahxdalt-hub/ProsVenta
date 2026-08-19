"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

// ============================================================================
// Types
// ============================================================================

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
}

// ============================================================================
// Context
// ============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

const MOTION_KEY = "prosventa-reduced-motion";

// ============================================================================
// Provider
// ============================================================================
// Prosventa is currently locked to LIGHT MODE ONLY.
// Dark mode and system theme detection are disabled until the core product
// is complete. This provider only manages reduced motion preferences.
// ============================================================================

export function ThemeProvider({
  children,
  initialReducedMotion = false,
}: {
  children: React.ReactNode;
  initialReducedMotion?: boolean;
}) {
  const [reducedMotion, setReducedMotionState] = useState(initialReducedMotion);

  // Apply reduced motion class
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reducedMotion);
  }, [reducedMotion]);

  // Sync with localStorage on mount (in case it differs from server)
  useEffect(() => {
    try {
      const storedMotion = localStorage.getItem(MOTION_KEY);
      if (storedMotion === "true" && !reducedMotion) {
        setReducedMotionState(true);
      }
    } catch {
      // localStorage may be unavailable
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((_newTheme: Theme) => {
    // Theme switching is disabled. Prosventa is locked to light mode.
  }, []);

  const setReducedMotion = useCallback((value: boolean) => {
    setReducedMotionState(value);
    try {
      localStorage.setItem(MOTION_KEY, String(value));
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({ theme: "light" as Theme, setTheme, reducedMotion, setReducedMotion }),
    [setTheme, reducedMotion, setReducedMotion]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}