// ============================================================================
// Prosventa Automation Orchestrator — Execution Context (Pure Logic)
// Stage 7 — Phase 4
// ============================================================================
// The normalized context passed between steps. Later steps may consume valid
// outputs of earlier steps via previous_step_results — but never huge raw
// provider payloads: large data lives in domain tables and is passed by
// reference (result_reference).
// ============================================================================

import type {
  AutomationContext,
  StepOutputSummary,
} from "./context-types";

export type {
  AutomationContext,
  StepOutputSummary,
} from "./context-types";

/** Hard cap per serialized value — guards against context bloat. */
const MAX_VALUE_CHARS = 2_000;

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.slice(0, MAX_VALUE_CHARS);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    // Oversized arrays are reduced to a reference-shaped summary.
    return value.length <= 20 ? value.map(sanitizeValue) : { truncated: true, length: value.length };
  }
  try {
    const json = JSON.stringify(value);
    if (json && json.length <= MAX_VALUE_CHARS) return value;
  } catch {
    return String(value).slice(0, MAX_VALUE_CHARS);
  }
  // Too large → keep a reference-shaped summary, not the payload.
  return { truncated: true };
}

/**
 * Builds the initial normalized execution context from an event + target.
 * Only small scalar payload values are copied — raw provider responses are
 * never embedded.
 */
export function buildAutomationContext(input: {
  organizationId: string;
  playbookId: string;
  executionId: string;
  eventId: string | null;
  eventType: string;
  reason?: string | null;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  payload?: Record<string, unknown> | null;
}): AutomationContext {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input.payload ?? {})) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      payload[key] = value;
    }
  }
  return {
    organization_id: input.organizationId,
    playbook_id: input.playbookId,
    execution_id: input.executionId,
    trigger_event: input.eventId
      ? { event_id: input.eventId, event_type: input.eventType, reason: input.reason ?? null }
      : null,
    trigger_payload: payload,
    target: { type: input.targetType, id: input.targetId, name: input.targetName },
    previous_step_results: {},
  };
}

// ----------------------------------------------------------------------------
// Output references — keep executions lightweight
// ----------------------------------------------------------------------------

/** Keys that are genuine cross-table references (IDs), safe to promote. */
const REFERENCE_KEYS = new Set([
  "task_id",
  "taskid",
  "list_id",
  "listid",
  "note_id",
  "recommendation_id",
  "recommendationid",
  "signal_id",
  "signalid",
  "score_id",
  "prospect_id",
  "prospectid",
]);

function normalizeRefKey(key: string): string {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

/**
 * Extracts reference-style IDs from a step output so executions stay light.
 * e.g. `{ taskId: "…" }` → result_reference `{ task_id: "…" }`.
 */
export function extractResultReference(
  output: Record<string, unknown>
): Record<string, string> | null {
  const refs: Record<string, string> = {};
  for (const [key, value] of Object.entries(output ?? {})) {
    const normalizedKey = normalizeRefKey(key);
    if (REFERENCE_KEYS.has(normalizedKey)) {
      if (typeof value === "string" || typeof value === "number") {
        refs[normalizedKey] = String(value);
      }
    }
  }
  return Object.keys(refs).length > 0 ? refs : null;
}

/** Summarizes a step output for the shared context (bounded size). */
export function summarizeStepOutput(
  result: StepOutputSummary["result"],
  output: Record<string, unknown>
): StepOutputSummary {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(output ?? {})) {
    sanitized[key] = sanitizeValue(value);
  }
  return {
    result,
    output: sanitized,
    result_reference: extractResultReference(output),
  };
}

/** Merges a completed step's summary into the running context (immutably). */
export function recordStepInContext(
  context: AutomationContext,
  stepIndex: number,
  summary: StepOutputSummary
): AutomationContext {
  return {
    ...context,
    previous_step_results: {
      ...context.previous_step_results,
      [`step_${stepIndex}`]: summary,
    },
  };
}

/**
 * Resolves a value a later step may consume from earlier outputs.
 * Lookup order: explicit reference ids first, then raw output keys.
 * Accepts camelCase or snake_case lookups (taskId | task_id).
 * e.g. getReferencedValue(context, "task_id").
 */
export function getReferencedValue(
  context: AutomationContext,
  key: string
): string | number | null {
  const normalizedKey = normalizeRefKey(key);
  for (const summary of Object.values(context.previous_step_results)) {
    if (summary.result !== "success") continue;
    if (summary.result_reference && normalizedKey in summary.result_reference) {
      return summary.result_reference[normalizedKey];
    }
    // Raw output keys are matched by normalized key too.
    for (const [outKey, value] of Object.entries(summary.output ?? {})) {
      if (normalizeRefKey(outKey) === normalizedKey) {
        if (typeof value === "string" || typeof value === "number") return value;
      }
    }
  }
  // Trigger payload fallback (e.g. icp_score conditions at later checkpoints)
  for (const [payloadKey, value] of Object.entries(context.trigger_payload ?? {})) {
    if (normalizeRefKey(payloadKey) === normalizedKey) {
      if (typeof value === "string" || typeof value === "number") return value;
    }
  }
  return null;
}
