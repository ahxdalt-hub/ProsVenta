// ============================================================================
// Prosventa Signals UX — Display Helpers
// Feature 3 — Phase 3: Signals User Experience, Evidence & Interaction
// ============================================================================
// Presentation-only helpers shared by Signals components. All MEANING comes
// from the canonical registry / centralized lifecycle logic — never hardcoded
// here. No fake data is produced anywhere in this module.
// ============================================================================

import {
  SIGNAL_CATEGORY_LABELS,
  SIGNAL_CONFIDENCE_LABELS,
  SIGNAL_IMPORTANCE_LABELS,
  type SignalImportance,
  type SignalRecord,
} from "../types";
import { getSignalTypeDefinition } from "../registry";
import { getSignalLifecycleFreshness } from "../lifecycle";

/** Normalizes a prospect website/domain into a company_key (normalized domain). */
export function toCompanyKey(
  domain: string | null | undefined
): string | null {
  const raw = (domain ?? "").trim().toLowerCase();
  if (!raw) return null;
  const stripped = raw
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim();
  return stripped.length > 0 ? stripped : null;
}

/** The entity a signal belongs to, per the canonical registry. */
export function getSignalEntity(
  signal: SignalRecord
): "company" | "prospect" {
  return getSignalTypeDefinition(signal.signal_type)?.supportedEntity ?? "prospect";
}

export function getSignalTypeDisplayName(signal: SignalRecord): string {
  return (
    getSignalTypeDefinition(signal.signal_type)?.displayName ??
    signal.signal_type
  );
}

export function getSignalCategoryLabel(category: SignalRecord["category"]): string {
  return SIGNAL_CATEGORY_LABELS[category];
}

/** Event date = occurred_at when known, otherwise detection time. Never invented. */
export function getSignalEventDate(signal: SignalRecord): string {
  return signal.occurred_at ?? signal.detected_at;
}

// ============================================================================
// Freshness — centralized classification, presentation labels only here
// ============================================================================

export type SignalFreshnessPresentation = "fresh" | "aging" | "expired";

export const SIGNAL_FRESHNESS_PRESENTATION_LABELS: Record<
  SignalFreshnessPresentation,
  string
> = {
  fresh: "Fresh",
  aging: "Aging",
  expired: "Expired",
};

export function getSignalFreshnessPresentation(
  signal: SignalRecord
): SignalFreshnessPresentation {
  return getSignalLifecycleFreshness(getSignalEventDate(signal));
}

const FRESHNESS_STYLES: Record<SignalFreshnessPresentation, string> = {
  fresh: "border-emerald-200 bg-emerald-50 text-emerald-700",
  aging: "border-amber-200 bg-amber-50 text-amber-700",
  expired: "border-slate-200 bg-slate-100 text-slate-500",
};

// ============================================================================
// Importance — backend classification, restrained styling (+ text, never
// color-only, for accessibility)
// ============================================================================

const IMPORTANCE_STYLES: Record<SignalImportance, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  low: "border-slate-200 bg-slate-100 text-slate-600",
};

/** Lower rank = more important. Used only within bounded client windows. */
export const IMPORTANCE_RANK: Record<SignalImportance, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ============================================================================
// Relative time — computed from REAL timestamps only
// ============================================================================

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

/** Day bucket label for the timeline view — derived from actual timestamps. */
export function timelineBucketLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export { IMPORTANCE_STYLES, FRESHNESS_STYLES, SIGNAL_IMPORTANCE_LABELS, SIGNAL_CONFIDENCE_LABELS };
