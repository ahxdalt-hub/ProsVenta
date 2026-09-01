// ============================================================================
// Prosventa Intelligence — Presentation Tokens
// Feature 4 — Phase 3: shared labels/styles for the Intelligence experience.
// Priority and confidence are presented SEPARATELY and never conflated.
// Not color-only: every state carries a text label (+ shape/icon).
// ============================================================================

import { cn } from "@/lib/utils";

export type PriorityCategory =
  | "very_high"
  | "high"
  | "medium"
  | "low"
  | "very_low"
  | "unknown";

export const PRIORITY_LABELS: Record<PriorityCategory, string> = {
  very_high: "Very High",
  high: "High",
  medium: "Medium",
  low: "Low",
  very_low: "Very Low",
  unknown: "Unknown",
};

/** Border + soft background + text; always paired with an explicit label. */
export const PRIORITY_STYLES: Record<PriorityCategory, string> = {
  very_high: "border-red-200 bg-red-50 text-red-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  low: "border-slate-200 bg-slate-100 text-slate-600",
  very_low: "border-slate-200 bg-slate-50 text-slate-400",
  unknown: "border-slate-200 bg-slate-50 text-slate-400",
};

/** Dot fill used next to the label (secondary cue — never the only cue). */
export const PRIORITY_DOT_STYLES: Record<PriorityCategory, string> = {
  very_high: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-blue-500",
  low: "bg-slate-400",
  very_low: "bg-slate-300",
  unknown: "bg-slate-300",
};

export function scoreTone(score: number): string {
  if (score >= 80) return "text-green-700";
  if (score >= 60) return "text-blue-700";
  if (score >= 40) return "text-amber-700";
  return "text-slate-500";
}

export function scoreBarTone(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-400";
  return "bg-slate-300";
}

export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  unknown: "Unknown",
};

export const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = {
  high: "border-green-200 bg-green-50 text-green-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-slate-200 bg-slate-100 text-slate-600",
  unknown: "border-slate-200 bg-slate-50 text-slate-400",
};

export const CONFIDENCE_EXPLANATIONS: Record<ConfidenceLevel, string> = {
  high: "Based on multiple recent verified signals and strong company data.",
  medium: "Based on a moderate amount of evidence — some information could not be verified.",
  low: "Based on limited or older evidence — treat this assessment with care.",
  unknown: "Confidence could not be assessed with the available data.",
};

export function cnFactorStatus(status: string): string {
  switch (status) {
    case "match":
      return cn("text-slate-700");
    case "mismatch":
      return cn("text-red-700");
    default:
      // Unknown is deliberately neutral — visually distinct from mismatch.
      return cn("text-slate-500 italic");
  }
}

/** Relative freshness label for a stored timestamp ("Updated 2 days ago"). */
export function formatWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

export type ConfidenceLevelLike = "high" | "medium" | "low" | "unknown";