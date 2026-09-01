"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { SettingsNavigation } from "./SettingsNav";

// ============================================================================
// SettingsShell
// ============================================================================
// Layout shell for the entire Settings area. Renders the page heading and
// the navigation (persistent sidebar on desktop, collapsible picker on
// mobile) around whatever settings page the route provides as children.
// Content transitions are handled per-page via SettingsPageTransition.
// ============================================================================

interface SettingsShellProps {
  children: ReactNode;
}

export function SettingsShell({ children }: SettingsShellProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {/* Page title */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-tight">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
          Manage your account, preferences, and workspace configuration.
        </p>
      </motion.div>

      {/* Navigation + content */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-10 items-start">
        <SettingsNavigation />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================
// SettingsPageTransition — subtle page enter animation (reduced-motion safe)
// ============================================================================

export function SettingsPageTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  return (
    <motion.div
      key={routeKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
