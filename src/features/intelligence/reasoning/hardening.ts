// ============================================================================
// Prosventa Intelligence — Production Hardening Primitives (Feature 4 Phase 4)
// ============================================================================
// Small, PURE helpers used by the reasoning service for reliability, cost
// protection and input validation. Kept dependency-free so they are trivially
// unit-testable and usable from both server modules and tests.
//
//   * isStuckGeneration      — stuck-job recovery decision (§21)
//   * isValidUuid            — reject malformed ids BEFORE they reach the DB (§7)
//   * isValidCompanyKey      — normalized-domain sanity bound (§7)
//   * GenerationThrottle     — per-organization cost protection (§23, §26):
//                              min interval between generation starts + bounded
//                              concurrent generations. Complements the DB-level
//                              partial unique index (same-subject dedupe).
// ============================================================================

/** A generation stuck longer than this is considered abandoned (crash/deploy). */
export const STUCK_GENERATION_THRESHOLD_MS = 10 * 60_000;

/**
 * True when an active (pending/processing) generation row has not progressed
 * within the threshold — i.e. the process died before completing it. Such rows
 * must be recovered (marked failed) so the subject is never locked forever.
 */
export function isStuckGeneration(
  lastActivityAt: string | null,
  now: number,
  thresholdMs: number = STUCK_GENERATION_THRESHOLD_MS
): boolean {
  if (!lastActivityAt) return true; // no timestamp → cannot be trusted as live
  const t = Date.parse(lastActivityAt);
  if (Number.isNaN(t)) return true;
  return now - t > thresholdMs;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Strict UUID validation — malformed ids are rejected before any DB call. */
export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Company keys are normalized hostnames produced server-side. Client-supplied
 * values must still be sane: non-empty, hostname-shaped, bounded length.
 */
export function isValidCompanyKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 253 &&
    /^[a-z0-9.-]+$/.test(value) &&
    value.includes(".")
  );
}

// ============================================================================
// Per-organization generation cost protection
// ============================================================================

export interface ThrottleDecision {
  allowed: boolean;
  /** Machine-readable reason when not allowed. */
  reason: "interval" | "concurrency" | null;
  /** Ms until the request would be allowed again (interval case). */
  retryInMs: number;
}

/**
 * In-memory per-org generation throttle (same architecture as the external
 * signal detection cooldown in features/intelligence/signals/service.ts).
 *
 * Protects against accidental runaway AI spend: a browser cannot trigger
 * unlimited generation work even across DIFFERENT subjects (the DB unique
 * index only dedupes concurrent generation for the SAME subject).
 */
export class GenerationThrottle {
  private readonly lastStartAt = new Map<string, number>();
  private readonly active = new Map<string, number>();

  constructor(
    private readonly minIntervalMs: number = 2_000,
    private readonly maxConcurrentPerOrg: number = 3,
    private readonly nowFn: () => number = () => Date.now()
  ) {}

  /**
   * Attempts to reserve a generation slot for the organization.
   * Returns false (with reason) when throttled — callers must NOT start work.
   */
  tryAcquire(organizationId: string): ThrottleDecision {
    const now = this.nowFn();

    const activeCount = this.active.get(organizationId) ?? 0;
    if (activeCount >= this.maxConcurrentPerOrg) {
      return { allowed: false, reason: "concurrency", retryInMs: 0 };
    }

    const last = this.lastStartAt.get(organizationId);
    if (typeof last === "number" && now - last < this.minIntervalMs) {
      return {
        allowed: false,
        reason: "interval",
        retryInMs: this.minIntervalMs - (now - last),
      };
    }

    this.lastStartAt.set(organizationId, now);
    this.active.set(organizationId, activeCount + 1);
    this.trim(this.lastStartAt);
    return { allowed: true, reason: null, retryInMs: 0 };
  }

  /** Releases a reserved slot. Must be called in finally. */
  release(organizationId: string): void {
    const current = this.active.get(organizationId) ?? 0;
    if (current <= 1) this.active.delete(organizationId);
    else this.active.set(organizationId, current - 1);
  }

  /** Keeps memory bounded under abusive traffic (mirrors signal cooldown). */
  private trim(map: Map<string, number>, max = 1000): void {
    if (map.size <= max) return;
    const oldest = Array.from(map.entries()).sort((a, b) => a[1] - b[1])[0];
    if (oldest) map.delete(oldest[0]);
  }
}