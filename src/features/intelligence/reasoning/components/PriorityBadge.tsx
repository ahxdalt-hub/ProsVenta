"use client";

// ============================================================================
// Prosventa Intelligence — Priority Badge
// Feature 4 — Phase 3. Color + dot + text label: never color-only (a11y).
// ============================================================================

import { cn } from "@/lib/utils";
import {
  PRIORITY_DOT_STYLES,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  type PriorityCategory,
} from "./presentation";

export function PriorityBadge({
  category,
  score,
  size = "md",
  className,
}: {
  category: PriorityCategory;
  /** Optional 0–100 overall priority shown next to the label. */
  score?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const label = PRIORITY_LABELS[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-semibold",
        PRIORITY_STYLES[category],
        size === "lg" && "px-3.5 py-1.5 text-sm",
        size === "md" && "px-3 py-1 text-xs",
        size === "sm" && "px-2 py-0.5 text-[11px]",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", PRIORITY_DOT_STYLES[category])}
      />
      {label}
      {typeof score === "number" && (
        <span className="font-medium opacity-70">{score}/100</span>
      )}
      <span className="sr-only">{`Priority: ${label}`}</span>
    </span>
  );
}
