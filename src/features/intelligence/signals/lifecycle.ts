// ============================================================================
// Prosventa Signals — Lifecycle & Freshness
// Feature 3 — Phase 1: Signal Foundation & Data Architecture
// ============================================================================
// A signal moves through a small, explicit lifecycle. The distinction between
// detected and verified is important: a DETECTED event may still require
// validation; only VERIFIED signals are treated as strong evidence.
//
//   detected ──▶ verifying ──▶ verified ──▶ expired
//       │            │
//       ▼            ▼
//   dismissed    dismissed
//
// Freshness is CENTRALIZED here so UI components never hardcode expiration
// rules. Thresholds are configurable and can be refined in later phases.
// ============================================================================

import type { SignalStatus } from "./types";

// ----------------------------------------------------------------------------
// Lifecycle transitions
// ----------------------------------------------------------------------------

/** States a signal can legally move to from its current state. */
const SIGNAL_LIFECYCLE_TRANSITIONS: Record<SignalStatus, SignalStatus[]> = {
  detected: ["verifying", "verified", "dismissed", "expired"],
  verifying: ["verified", "dismissed", "expired"],
  // Legacy/compat states kept for existing records:
  unverified: ["verifying", "verified", "dismissed", "expired"],
  active: ["dismissed", "archived", "expired"],
  verified: ["dismissed", "archived", "expired"],
  expired: [],
  dismissed: [],
  archived: [],
};

/** Terminal states — no further transitions allowed. */
export const TERMINAL_SIGNAL_STATUSES: SignalStatus[] = [
  "expired",
  "dismissed",
  "archived",
];

export function isTerminalSignalStatus(status: SignalStatus): boolean {
  return TERMINAL_SIGNAL_STATUSES.includes(status);
}

/** Whether moving a signal from one status to another is legal. */
export function canTransitionSignalStatus(
  from: SignalStatus,
  to: SignalStatus
): boolean {
  if (from === to) return false;
  return SIGNAL_LIFECYCLE_TRANSITIONS[from].includes(to);
}

/** Allowed next statuses for the current status. */
export function getAllowedSignalTransitions(status: SignalStatus): SignalStatus[] {
  return [...SIGNAL_LIFECYCLE_TRANSITIONS[status]];
}

/** Statuses that represent an actionable/live signal in the workspace feed. */
export const LIVE_SIGNAL_STATUSES: SignalStatus[] = [
  "active",
  "detected",
  "unverified",
  "verifying",
  "verified",
];

export function isLiveSignalStatus(status: SignalStatus): boolean {
  return LIVE_SIGNAL_STATUSES.includes(status);
}

// ----------------------------------------------------------------------------
// Freshness (centralized — never hardcoded in UI components)
// ----------------------------------------------------------------------------

export type SignalLifecycleFreshness = "fresh" | "aging" | "expired";

function readDaysEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Centralized freshness thresholds in days. Injectable for tests; overridable
 * via env for deployment-level tuning. Exact thresholds are refined later.
 */
export function getSignalFreshnessThresholds(): {
  freshDays: number;
  agingDays: number;
} {
  return {
    freshDays: readDaysEnv("SIGNAL_FRESH_FRESH_DAYS", 7),
    agingDays: readDaysEnv("SIGNAL_FRESH_AGING_DAYS", 30),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Classifies a signal's freshness from its event date (occurred_at when known,
 * otherwise detected_at). Future dates are treated as fresh (clock-skew).
 */
export function getSignalLifecycleFreshness(
  eventDateIso: string,
  now: number = Date.now()
): SignalLifecycleFreshness {
  const { freshDays, agingDays } = getSignalFreshnessThresholds();
  const ageDays = Math.max(0, (now - new Date(eventDateIso).getTime()) / DAY_MS);

  if (!Number.isFinite(ageDays)) return "expired";
  if (ageDays <= freshDays) return "fresh";
  if (ageDays <= agingDays) return "aging";
  return "expired";
}

/** Converts a freshness band into a date-range filter usable by queries. */
export function freshnessToDateRange(
  freshness: "fresh" | "aging" | "historical" | SignalLifecycleFreshness,
  now: number = Date.now()
): { from: string; to: string } | null {
  if (freshness === "historical") return null;
  const { freshDays, agingDays } = getSignalFreshnessThresholds();
  const nowMs = now;
  if (freshness === "fresh") {
    return { from: new Date(nowMs - freshDays * DAY_MS).toISOString(), to: new Date(nowMs).toISOString() };
  }
  return { from: new Date(nowMs - agingDays * DAY_MS).toISOString(), to: new Date(nowMs).toISOString() };
}