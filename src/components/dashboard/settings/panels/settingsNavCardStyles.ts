import { cn } from "@/lib/utils";

// ============================================================================
// Shared class strings for Settings landing navigation cards.
// ============================================================================
// Extracted from SettingsLanding so the detail-panel trigger cards (client)
// render with EXACTLY the same surface treatment as the plain link cards.
// The landing page layout itself is unchanged.
// ============================================================================

export interface SettingsNavCardVisual {
  emphasized?: boolean;
  compact?: boolean;
}

export function settingsNavCardClassName({ emphasized = false, compact = false }: SettingsNavCardVisual): string {
  return cn(
    "group relative flex items-start text-left",
    compact ? "gap-3 p-4" : "gap-4 p-5 sm:p-6",
    "rounded-xl border transition-all duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
    emphasized
      ? [
          "border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-white",
          "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
          "hover:border-blue-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]",
        ].join(" ")
      : [
          "border-slate-200 bg-white",
          "shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
          "hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-[0_3px_10px_rgba(15,23,42,0.06)]",
        ].join(" ")
  );
}

export function settingsNavIconClassName({ emphasized = false, compact = false }: SettingsNavCardVisual): string {
  return cn(
    "flex shrink-0 items-center justify-center rounded-lg border transition-colors duration-150",
    compact ? "h-9 w-9" : "h-11 w-11",
    emphasized
      ? "border-blue-200 bg-blue-100/70 text-blue-700 group-hover:border-blue-300 group-hover:bg-blue-100"
      : "border-slate-200 bg-slate-50 text-slate-600 group-hover:border-slate-300 group-hover:text-slate-900"
  );
}
