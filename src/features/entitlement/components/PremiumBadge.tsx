"use client";

import { cn } from "@/lib/utils";

// ============================================================================
// Premium Badge
// Stage 5 — Feature Access, Plan Entitlements & Curiosity-Driven Upgrade UX
// ============================================================================
// Subtle plan indicator for navigation items and feature labels.
// Uses a restrained, premium look — NOT a giant lock icon.
// ============================================================================

type BadgeTone = "pro" | "business" | "credits" | "default";

interface PremiumBadgeProps {
  label?: string;
  tone?: BadgeTone;
  className?: string;
}

const TONES: Record<BadgeTone, string> = {
  pro: "bg-blue-50 text-blue-700 border-blue-200",
  business: "bg-violet-50 text-violet-700 border-violet-200",
  credits: "bg-amber-50 text-amber-700 border-amber-200",
  default: "bg-slate-100 text-slate-600 border-slate-200",
};

export function PremiumBadge({ label = "PRO", tone = "pro", className }: PremiumBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider",
        TONES[tone],
        className
      )}
    >
      {label}
    </span>
  );
}