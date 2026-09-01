// ============================================================================
// Prosventa External Business Signals — Freshness
// Stage 6 — Phase 5: External Business Signal Engine
// ============================================================================
// Signals are time-sensitive. Age is represented as Recent / Aging /
// Historical based on the EVENT's actual published date and CONFIGURABLE
// rules — not a hardcoded "hot for 30 days" product assumption.
//
// Configuration (server env, optional):
//   SIGNAL_FRESHNESS_RECENT_DAYS  (default 7)
//   SIGNAL_FRESHNESS_AGING_DAYS   (default 30)
// ============================================================================

export type SignalFreshnessState = "recent" | "aging" | "historical";

export const SIGNAL_FRESHNESS_LABELS: Record<SignalFreshnessState, string> = {
  recent: "Recent",
  aging: "Aging",
  historical: "Historical",
};

function readDaysEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Configurable freshness thresholds in days. Injectable for tests. */
export function getFreshnessThresholds(now?: number): {
  recentDays: number;
  agingDays: number;
} {
  void now;
  return {
    recentDays: readDaysEnv("SIGNAL_FRESHNESS_RECENT_DAYS", 7),
    agingDays: readDaysEnv("SIGNAL_FRESHNESS_AGING_DAYS", 30),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Classifies an external signal's freshness from its event date.
 * Future-dated events are treated as recent (clock-skew tolerance).
 */
export function getExternalSignalFreshness(
  eventDateIso: string,
  now: number = Date.now()
): SignalFreshnessState {
  const { recentDays, agingDays } = getFreshnessThresholds();
  const ageDays = Math.max(0, (now - new Date(eventDateIso).getTime()) / DAY_MS);

  if (ageDays <= recentDays) return "recent";
  if (ageDays <= agingDays) return "aging";
  return "historical";
}

/** Human-readable relative age label (e.g. "4 days ago"). */
export function formatEventAge(eventDateIso: string, now: number = Date.now()): string {
  const ageMs = Math.max(0, now - new Date(eventDateIso).getTime());
  const days = Math.floor(ageMs / DAY_MS);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
