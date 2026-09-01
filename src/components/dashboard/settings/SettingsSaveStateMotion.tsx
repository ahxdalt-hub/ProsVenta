"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type SaveStateKind = "idle" | "saving" | "saved" | "error";

interface SettingsSaveStateMotionProps {
  state: SaveStateKind;
  label: string;
}

/**
 * Client-only animated save-state indicator. Isolated so the parent
 * SettingsPage module can remain a Server Component.
 */
export function SettingsSaveStateMotion({ state, label }: SettingsSaveStateMotionProps) {
  const prefersReducedMotion = useReducedMotion();

  const styles: Record<Exclude<SaveStateKind, "idle">, string> = {
    saving: "border-slate-200 bg-slate-50 text-slate-600",
    saved: "border-green-200 bg-green-50 text-green-700",
    error: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: DURATION.base, ease: EASE_OUT }}
      role={state === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-medium",
        styles[state as Exclude<SaveStateKind, "idle">]
      )}
    >
      {label}
    </motion.div>
  );
}