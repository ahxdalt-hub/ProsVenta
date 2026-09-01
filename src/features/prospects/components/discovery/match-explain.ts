"use client";

// ============================================================================
// Prosventa Find Matching Leads — Match Explanation Helpers
// ============================================================================
// Pure helpers that translate the ACTUAL MatchFactor[] produced by
// scoreLeadAgainstIcp into human-readable explanation content. Every string
// shown to the user is derived from real matching output — reasons are never
// fabricated, and internal weights/formulas stay server-side.
// ============================================================================

import type {
  LeadMatchScore,
  MatchFactor,
} from "@/features/prospects/types/discovery";

/** Human label + styling per factor status. Never relies on color alone. */
export const MATCH_STATUS_META: Record<
  MatchFactor["status"],
  { label: string; icon: string; color: string }
> = {
  match: { label: "Match", icon: "✓", color: "text-green-700" },
  partial: { label: "Partial", icon: "△", color: "text-amber-600" },
  unavailable: { label: "Unknown", icon: "?", color: "text-slate-400" },
};

const CATEGORY_LABELS: Record<LeadMatchScore["category"], string> = {
  excellent: "Excellent match",
  strong: "High match",
  moderate: "Moderate match",
  weak: "Low match",
  poor: "Weak match",
};

export function getMatchQualityLabel(category: LeadMatchScore["category"]): string {
  return CATEGORY_LABELS[category] ?? "Low match";
}

/**
 * Short "why this matches" bullets derived strictly from factors that actually
 * matched. Detail text comes from the scoring logic itself.
 */
export function buildMatchReasons(match: LeadMatchScore): string[] {
  return match.factors
    .filter((f) => f.status === "match")
    .map((f) => `${f.label} matches${f.detail ? ` — ${f.detail}` : ""}`);
}

/** Top reasons for compact card display (icon + label only). */
export function topMatchFactors(match: LeadMatchScore, count = 3): MatchFactor[] {
  return match.factors.filter((f) => f.status === "match").slice(0, count);
}

/** Threshold at which a lead counts as a "strong match" for summaries. */
export const STRONG_MATCH_THRESHOLD = 70;

export function isStrongMatch(score: number): boolean {
  return score >= STRONG_MATCH_THRESHOLD;
}
