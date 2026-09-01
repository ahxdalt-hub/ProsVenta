"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { transitions } from "@/lib/motion";

// ============================================================================
// SettingsPageHeaderMotion
// ============================================================================
// Client-only wrapper that owns the subtle entrance animation for the
// Settings page header. Isolated here so the parent SettingsPage module can
// stay a Server Component while still rendering animated content.
// Only serializable props cross the Server → Client boundary.
// ============================================================================

interface SettingsPageHeaderMotionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function SettingsPageHeaderMotion({
  title,
  description,
  actions,
}: SettingsPageHeaderMotionProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : transitions.base}
      className="mb-6 flex flex-wrap items-start justify-between gap-4"
    >
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 leading-snug">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </motion.div>
  );
}