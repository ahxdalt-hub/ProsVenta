// ============================================================================
// Prosventa Signals — Background Discovery Job Interface
// Feature 3 — Phase 1: Signal Foundation & Data Architecture
// ============================================================================
// Clean interfaces for FUTURE background execution. This phase does NOT build
// a scheduler or any automation — it only establishes the contract so Phase 2+
// can plug in real providers and periodic runs without redesign.
//
// Conceptual pipeline:
//
//   Signal discovery job → Provider query → Normalize → Deduplicate
//                        → Verify        → Persist
//
// All implementations are server-side only. The browser never calls providers.
// ============================================================================

import type { SignalType } from "../types";

/** What a discovery run is asked to scan for one organization. */
export interface SignalDiscoveryRequest {
  organizationId: string;
  /** Prospect ids to include; empty = all org prospects (bounded by batchSize) */
  prospectIds?: string[];
  /** Restrict the run to specific signal types */
  signalTypes?: SignalType[];
  /** Max prospects processed per run (protects provider quotas) */
  batchSize?: number;
}

export type SignalDiscoveryRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

/** Outcome of ONE discovery run (never fabricates success). */
export interface SignalDiscoveryRunResult {
  status: SignalDiscoveryRunStatus;
  startedAt: string;
  finishedAt: string | null;
  prospectsProcessed: number;
  signalsCreated: number;
  duplicatesSkipped: number;
  invalidEventsDropped: number;
  /** Controlled failure reason when status === "failed" */
  reason?:
    | "not_configured"
    | "provider_error"
    | "rate_limited"
    | "timeout"
    | "malformed_data";
}

/**
 * Contract every future discovery executor must satisfy. Implementations are
 * registered server-side and invoked by an external scheduler/cron in a later
 * phase — never from the browser.
 */
export interface SignalDiscoveryJob {
  id: string;
  description: string;

  /**
   * Executes one bounded discovery run. Must be idempotent: re-running over
   * the same entities must not create duplicate signals (dedupe layer owns
   * that guarantee).
   */
  run(request: SignalDiscoveryRequest): Promise<SignalDiscoveryRunResult>;
}

/**
 * Plans a batch of prospect ids into bounded chunks. Pure helper so future
 * schedulers can chunk deterministically without embedding limits everywhere.
 */
export function planDiscoveryBatches(
  prospectIds: string[],
  batchSize: number
): string[][] {
  const size = Math.max(1, Math.floor(batchSize));
  const batches: string[][] = [];
  for (let i = 0; i < prospectIds.length; i += size) {
    batches.push(prospectIds.slice(i, i + size));
  }
  return batches;
}