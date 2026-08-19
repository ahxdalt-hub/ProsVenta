"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthState = "loading" | "authenticated" | "unauthenticated";

/**
 * Client-side authentication state hook.
 *
 * Returns one of:
 *  - "loading"        — still determining auth state (initial mount)
 *  - "authenticated"  — a Supabase user session exists
 *  - "unauthenticated" — no user session
 *
 * Used by RouteTransitionProvider to choose the correct loading overlay:
 *  - authenticated  + dashboard route → dashboard LoadingOverlay
 *  - authenticated  + auth route      → (server redirects to /dashboard)
 *  - unauthenticated + auth route     → AuthLoadingOverlay
 *  - unauthenticated + dashboard route → (server redirects to /login)
 */
export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    let mounted = true;

    const supabase = createClient();

    // Check the current session synchronously first.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setState(session ? "authenticated" : "unauthenticated");
    });

    // Subscribe to auth state changes so the value stays current.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState(session ? "authenticated" : "unauthenticated");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}