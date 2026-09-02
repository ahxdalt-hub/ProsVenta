// ============================================================================
// Prosventa Intelligence Workspace — Feed Logic
// ============================================================================
// Phase 3: pure, presentation-safe mapping over EXISTING signal records. This
// module invents nothing: filters are derived from the real SignalCategory
// taxonomy, trust labels come from real stored fields (status / signal_origin),
// and "why it matters" is ONLY the stored interpretation written at detection
// time — it is never generated here.
// ============================================================================

import type { SignalRecord, SignalCategory } from "@/features/intelligence/signals/types";
import { getSignalTypeDefinition } from "@/features/intelligence/signals/registry";

// ============================================================================
// Lightweight intelligence filters — only categories backed by real data.
// ============================================================================

export type FeedFilterId = "all" | "signals" | "company" | "prospect" | "activity";

export interface FeedFilter {
  id: FeedFilterId;
  label: string;
  count: number;
}

function matchesFilter(signal: SignalRecord, filter: FeedFilterId): boolean {
  if (filter === "all") return true;
  const category: SignalCategory = signal.category;
  switch (filter) {
    // "Signals" = real external events reported by a data source.
    case "signals":
      return category === "external_event";
    case "company":
      return category === "company_change";
    case "prospect":
      return category === "professional_change";
    case "activity":
      return category === "prosventa_activity";
    default:
      return false;
  }
}

/**
 * Builds the filter row from the ACTUAL loaded records. A filter is only
 * offered when at least one real record supports it — never a dead filter.
 */
export function buildFeedFilters(signals: SignalRecord[]): FeedFilter[] {
  const counts: Record<FeedFilterId, number> = {
    all: signals.length,
    signals: 0,
    company: 0,
    prospect: 0,
    activity: 0,
  };
  for (const signal of signals) {
    if (matchesFilter(signal, "signals")) counts.signals += 1;
    if (matchesFilter(signal, "company")) counts.company += 1;
    if (matchesFilter(signal, "prospect")) counts.prospect += 1;
    if (matchesFilter(signal, "activity")) counts.activity += 1;
  }

  const filters: FeedFilter[] = [{ id: "all", label: "All", count: counts.all }];
  if (counts.signals > 0) filters.push({ id: "signals", label: "Signals", count: counts.signals });
  if (counts.company > 0) filters.push({ id: "company", label: "Company changes", count: counts.company });
  if (counts.prospect > 0) filters.push({ id: "prospect", label: "Prospect changes", count: counts.prospect });
  if (counts.activity > 0) filters.push({ id: "activity", label: "Prosventa activity", count: counts.activity });
  return filters;
}

export function filterFeedSignals(signals: SignalRecord[], filter: FeedFilterId): SignalRecord[] {
  return signals.filter((signal) => matchesFilter(signal, filter));
}

// ============================================================================
// Trust model — labels the existing architecture can support RELIABLY.
//   Verified  → the signal status is 'verified' (verification is never automatic)
//   Detected  → an external provider reported the event, not yet reviewed
//   Derived   → Prosventa recorded the event from its own product activity
// No confidence percentages — the stored confidence stays a High/Medium/Low
// word from the existing taxonomy, shown only as secondary context.
// ============================================================================

export type TrustLabel = "Verified" | "Detected" | "Derived";

export function getTrustLabel(signal: SignalRecord): TrustLabel {
  if (signal.status === "verified") return "Verified";
  if (signal.signal_origin === "external") return "Detected";
  return "Derived";
}

// ============================================================================
// Item presentation helpers — everything from real record fields.
// ============================================================================

/** Human-readable event type from the canonical registry — never invented. */
export function getFeedItemTypeLabel(signal: SignalRecord): string {
  return getSignalTypeDefinition(signal.signal_type)?.displayName ?? String(signal.signal_type).replace(/_/g, " ");
}

/** WHO: the company and/or prospect context actually present on the record. */
export function getFeedItemWho(signal: SignalRecord): string | null {
  return signal.company_key?.trim() || null;
}

/**
 * WHY IT MATTERS — the stored interpretation ONLY. Interpretations are written
 * at detection time with cautious language and are never generated or expanded
 * here. If none exists, the item simply has no "why it matters" section.
 */
export function getFeedItemInterpretation(signal: SignalRecord): string | null {
  const text = signal.interpretation?.trim();
  return text && text.length > 0 ? text : null;
}

/** Secondary evidence: the stored evidence note, when one exists. */
export function getFeedItemEvidenceNote(signal: SignalRecord): string | null {
  const text = signal.evidence?.trim();
  return text && text.length > 0 ? text : null;
}
