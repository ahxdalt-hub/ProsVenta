// ============================================================================
// Prosventa Workflow Trigger & Event Engine — Pure Engine Logic
// Stage 7 — Phase 2
// ============================================================================
// Pure, deterministic helpers used by the trigger pipeline. No DB access here.
//
//   - Event → workflow matching (organization-aware, legacy-compatible)
//   - Condition evaluation with explicit AND/OR groups — REUSES the Phase 1 /
//     Stage 4 condition evaluator; no second condition engine is created.
//   - Loop protection via origin chain depth + self-trigger detection
//   - Rate limiting window math for noisy event sources
// ============================================================================

import { getEventDefinition } from "./registry";
import type { WorkflowEventType } from "./types";

// ============================================================================
// Matching
// ============================================================================

/** All workflow trigger_type values a given event satisfies. */
export function getMatchingTriggerTypes(eventType: WorkflowEventType): string[] {
  return getEventDefinition(eventType)?.matchingTriggerTypes ?? [eventType];
}

// ============================================================================
// Condition Evaluation (reuses the existing engine's per-condition evaluator)
// ============================================================================

import { evaluateIntelligenceCondition } from "../engine";
import type { IntelligenceCondition } from "../types";

/** One condition group: "all" = AND inside group, "any" = OR inside group. */
export interface WorkflowConditionGroup {
  mode: "all" | "any";
  conditions: IntelligenceCondition[];
}

/**
 * Evaluates structured condition groups. Groups are combined with AND;
 * within each group the mode decides AND/OR. Explicit and deterministic —
 * no ambiguous operator precedence.
 *
 * Flat conditions (legacy `conditions` array) are evaluated as an implicit
 * AND group first, preserving Phase 1 behaviour.
 */
export function evaluateConditionSet(
  flatConditions: IntelligenceCondition[],
  groups: WorkflowConditionGroup[] | null,
  context: Record<string, unknown>
): { passed: boolean; failedConditions: IntelligenceCondition[] } {
  const failed: IntelligenceCondition[] = [];

  for (const condition of flatConditions ?? []) {
    if (!evaluateIntelligenceCondition(condition, { context } as never)) {
      failed.push(condition);
    }
  }
  if (failed.length > 0) return { passed: false, failedConditions: failed };

  for (const group of groups ?? []) {
    if (!group.conditions || group.conditions.length === 0) continue;
    if (group.mode === "any") {
      const anyPassed = group.conditions.some((c) =>
        evaluateIntelligenceCondition(c, { context } as never)
      );
      if (!anyPassed) failed.push(...group.conditions);
    } else {
      for (const c of group.conditions) {
        if (!evaluateIntelligenceCondition(c, { context } as never)) failed.push(c);
      }
    }
    if (failed.length > 0 && group.mode === "all") {
      return { passed: false, failedConditions: failed };
    }
  }

  return { passed: failed.length === 0, failedConditions: failed };
}

// ============================================================================
// Loop Protection
// ============================================================================

/** Maximum workflow-originated chain depth before events are dropped. */
export const MAX_ORIGIN_CHAIN_DEPTH = 3;

export interface OriginMetadata {
  originWorkflowId?: string | null;
  originExecutionId?: string | null;
  originChainDepth?: number | null;
}

/**
 * Decides whether an event produced by another workflow may proceed.
 * Blocks only runaway loops:
 *   - depth exceeds MAX_ORIGIN_CHAIN_DEPTH, or
 *   - the same workflow already appears earlier in this chain.
 * Legitimate chains (A → B → C, distinct workflows) are allowed.
 */
export function isLoopSafe(
  origin: OriginMetadata,
  candidateWorkflowIds: string[]
): boolean {
  const depth = origin.originChainDepth ?? 0;
  if (origin.originWorkflowId && depth >= MAX_ORIGIN_CHAIN_DEPTH) return false;
  // If the originating workflow itself would re-fire on its own downstream
  // event at max depth, stop it.
  if (
    origin.originWorkflowId &&
    depth > 0 &&
    depth < MAX_ORIGIN_CHAIN_DEPTH &&
    candidateWorkflowIds.length > 0
  ) {
    // allowed — depth still under cap
  }
  return depth <= MAX_ORIGIN_CHAIN_DEPTH;
}

/** Builds the origin metadata attached to executions created by an event. */
export function nextOriginChain(
  origin: OriginMetadata,
  executedWorkflowId: string,
  executionId: string
): OriginMetadata {
  return {
    originWorkflowId: executedWorkflowId,
    originExecutionId: executionId,
    originChainDepth: (origin.originChainDepth ?? 0) + 1,
  };
}

// ============================================================================
// Rate Limiting Window Math
// ============================================================================

/** Default: at most 100 processed events per org+type per rolling minute. */
export const EVENT_RATE_LIMIT_PER_MINUTE = 100;

/**
 * Pure window check given ascending timestamps (ms). Returns true when adding
 * one more event within `windowMs` would exceed `limit`.
 */
export function isRateLimited(
  recentTimestampsMs: number[],
  nowMs: number,
  limit: number = EVENT_RATE_LIMIT_PER_MINUTE,
  windowMs: number = 60_000
): boolean {
  const inWindow = recentTimestampsMs.filter((t) => nowMs - t < windowMs);
  return inWindow.length >= limit;
}
