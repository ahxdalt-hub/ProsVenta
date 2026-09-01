"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import { Avatar } from "@/components/ui/Avatar";
import { EASE_OUT } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ProfileMenuProps {
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  jobRole: string | null;
  organizationName: string | null;
}

/**
 * Dropdown animation variants.
 * Uses only opacity + transform (scale + translateY) for 60 FPS GPU-accelerated animation.
 * - Opening: fade in + scale 0.97 → 1 + slight translate down (200ms)
 * - Closing: smooth fade out (150ms)
 * Both durations fall within the 150–250ms premium range.
 */
const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.97, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -4,
    transition: { duration: 0.15, ease: EASE_OUT },
  },
};

/**
 * Profile menu — premium B2B SaaS user account dropdown.
 *
 * Renders a clickable profile button (avatar + name + chevron) that opens
 * a polished dropdown with profile details and account actions.
 *
 * Design references: Linear, Stripe, Vercel.
 *
 * Features:
 * - Hover / active / open visual states with smooth transitions
 * - Animated open/close (opacity + scale + translate, 150–250ms)
 * - Click-outside and Escape-to-close behavior
 * - Sign out uses the existing Supabase auth system (browser client)
 * - Loading state during sign out with smooth transition
 */
export function ProfileMenu({
  userName,
  userEmail,
  avatarUrl,
  jobRole,
  organizationName,
}: ProfileMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Derive display name — fall back to email local part if no full name
  const displayName = userName || userEmail.split("@")[0] || "User";

  // ------------------------------------------------------------------------
  // Close on outside click
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ------------------------------------------------------------------------
  // Close on Escape key
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // ------------------------------------------------------------------------
  // Navigation handler — closes dropdown then navigates
  // ------------------------------------------------------------------------
  const handleNavigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // ------------------------------------------------------------------------
  // Sign out — uses the existing Supabase auth system (browser client)
  // ------------------------------------------------------------------------
  const handleSignOut = useCallback(async () => {
    setError(null);
    setSigningOut(true);
    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
        setSigningOut(false);
        return;
      }
      // Full page navigation to login — clears all client-side state
      window.location.href = "/login";
    } catch {
      setError("Failed to sign out. Please try again.");
      setSigningOut(false);
    }
  }, []);

  return (
    <div ref={ref} className="relative isolate">
      {/* ================================================================
          Profile Button
          ================================================================ */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${displayName}`}
        className={cn(
          "btn-press inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 pl-1 pr-2 shadow-sm transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          open && "border-slate-300 bg-slate-50"
        )}
      >
        {/* Avatar */}
        <div className="h-7 w-7 shrink-0">
          <Avatar
            src={avatarUrl}
            name={displayName}
            size="sm"
            className="h-full w-full"
          />
        </div>

        {/* Name — hidden on mobile to keep topbar compact */}
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-700 sm:inline">
          {displayName}
        </span>

        {/* Chevron — rotates when open */}
        <DashboardIcon
          name="chevron-down"
          size={14}
          className={cn(
            "text-slate-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* ================================================================
          Dropdown Menu
          ================================================================ */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5"
          >
            {/* ----------------------------------------------------------
                Profile Section — avatar, name, job role, org
                ---------------------------------------------------------- */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
              <div className="h-11 w-11 shrink-0">
                <Avatar
                  src={avatarUrl}
                  name={displayName}
                  size="lg"
                  className="ring-2 ring-slate-100"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-semibold leading-tight text-slate-900">
                  {displayName}
                </p>
                {jobRole && (
                  <p className="truncate text-xs font-medium leading-tight text-slate-500">
                    {jobRole}
                  </p>
                )}
                {organizationName && (
                  <p className="truncate text-xs leading-tight text-slate-400">
                    {organizationName}
                  </p>
                )}
              </div>
            </div>

            {/* ----------------------------------------------------------
                Menu Actions
                ---------------------------------------------------------- */}
            <div className="p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => handleNavigate("/dashboard/organization")}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition-colors duration-150 group-hover:bg-slate-200/70 group-hover:text-slate-600">
                  <DashboardIcon name="organization" size={14} />
                </span>
                <span className="text-sm font-medium text-slate-700">
                  Organization
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleNavigate("/dashboard/settings")}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition-colors duration-150 group-hover:bg-slate-200/70 group-hover:text-slate-600">
                  <DashboardIcon name="settings" size={14} />
                </span>
                <span className="text-sm font-medium text-slate-700">
                  Account Settings
                </span>
              </button>
            </div>

            {/* Divider before danger zone */}
            <div className="border-t border-slate-100" />

            {/* ----------------------------------------------------------
                Sign Out — danger action
                ---------------------------------------------------------- */}
            <div className="p-1.5">
              {error && (
                <p
                  className="mb-1 px-3 py-1.5 text-xs text-red-600"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                disabled={signingOut}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 focus:outline-none focus-visible:bg-red-50",
                  signingOut
                    ? "cursor-wait bg-red-50 text-red-500"
                    : "text-red-600 hover:bg-red-50"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
                    signingOut
                      ? "bg-red-100 text-red-500"
                      : "bg-red-50 text-red-600 group-hover:bg-red-100"
                  )}
                >
                  {signingOut ? (
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <DashboardIcon name="logout" size={14} />
                  )}
                </span>
                <span className="text-sm font-medium">
                  {signingOut ? "Signing out…" : "Sign Out"}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}