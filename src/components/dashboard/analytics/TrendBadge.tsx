"use client";

import { motion } from "framer-motion";
import { EASE_OUT, DURATION } from "@/lib/motion";

export type TrendDirection = "up" | "down" | "flat";

interface TrendBadgeProps {
  direction: TrendDirection;
  value?: number;
  label?: string;
  className?: string;
}

const STYLES: Record<TrendDirection, { text: string; bg: string; icon: "sparkles" | "x" | "analytics" }> = {
  up: { text: "text-emerald-600", bg: "bg-emerald-50", icon: "sparkles" },
  down: { text: "text-red-600", bg: "bg-red-50", icon: "x" },
  flat: { text: "text-slate-500", bg: "bg-slate-100", icon: "analytics" },
};

/**
 * Premium trend indicator badge.
 * Shows ↑ / ↓ / = with an optional percentage value.
 * Uses only opacity + transform for GPU-accelerated animation.
 */
export function TrendBadge({ direction, value, label, className = "" }: TrendBadgeProps) {
  const style = STYLES[direction];
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "=";

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${style.bg} ${style.text} ${className}`}
    >
      <span aria-hidden="true">{arrow}</span>
      {value !== undefined && <span>{value > 0 ? `+${value}%` : `${value}%`}</span>}
      {label && <span className="font-medium opacity-70">{label}</span>}
    </motion.span>
  );
}

/**
 * Determines trend direction from a percentage change.
 * Positive → up, negative → down, near-zero → flat.
 */
export function getTrendDirection(change: number | null | undefined): TrendDirection {
  if (change === null || change === undefined || Math.abs(change) < 0.5) return "flat";
  return change > 0 ? "up" : "down";
}