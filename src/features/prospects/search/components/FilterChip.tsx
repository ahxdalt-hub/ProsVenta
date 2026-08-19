// ============================================================================
// Prosventa AI Search Filter Chip
// Stage 3 — Phase 4: AI-Powered Prospect Search
// ============================================================================
// Displays an active filter as an elegant, removable chip.
// ============================================================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { XIcon } from "./icons";

interface FilterChipProps {
  label: string;
  value?: string;
  onRemove: () => void;
  tone?: "blue" | "slate";
}

export const FilterChip = memo(function FilterChip({
  label,
  value,
  onRemove,
  tone = "blue",
}: FilterChipProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -4 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150",
        tone === "blue"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      )}
    >
      {label && (
        <span className={cn("font-medium", tone === "blue" ? "text-blue-400" : "text-slate-400")}>
          {label}
        </span>
      )}
      {value && <span className="max-w-[140px] truncate">{value}</span>}
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          "flex items-center justify-center w-4 h-4 rounded-full transition-colors duration-150",
          tone === "blue"
            ? "text-blue-400 hover:text-blue-700 hover:bg-blue-100"
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
        )}
        aria-label={`Remove ${label || "filter"}`}
      >
        <XIcon className="w-3 h-3" />
      </button>
    </motion.span>
  );
});