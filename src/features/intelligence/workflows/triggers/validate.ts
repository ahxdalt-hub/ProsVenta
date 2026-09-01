// ============================================================================
// Prosventa Workflow Trigger & Event Engine — Validation
// Stage 7 — Phase 2
// ============================================================================
// Pure validation of emitted events against the registry. Invalid events are
// rejected BEFORE persistence — malformed events never execute workflows.
// Organization/target existence is verified asynchronously in emit.ts.
// ============================================================================

import { getEventDefinition } from "./registry";
import type { WorkflowEventInput } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isValidIsoTimestamp(value: string): boolean {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function validateWorkflowEventInput(input: WorkflowEventInput): ValidationResult {
  const errors: string[] = [];

  const def = getEventDefinition(input.eventType);
  if (!def || !def.enabled) {
    errors.push(`Unknown or disabled event type: ${input.eventType}`);
    return { valid: false, errors };
  }

  if (!input.organizationId) {
    errors.push("organization_id is required.");
  }

  if (!input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) {
    errors.push("payload must be an object.");
  } else {
    for (const field of def.payloadFields) {
      const value = input.payload[field];
      if (value === undefined) {
        // prospect.deleted intentionally carries a minimal payload; producers
        // must still include declared fields (null allowed, undefined not).
        errors.push(`payload missing required field: ${field}`);
      }
    }
  }

  if (def.targetType !== "organization") {
    if (!input.targetId) {
      errors.push(`target_id is required for ${input.eventType}.`);
    }
  }

  const occurredAt = input.occurredAt ?? new Date().toISOString();
  if (!isValidIsoTimestamp(occurredAt)) {
    errors.push("occurred_at must be a valid timestamp.");
  } else if (new Date(occurredAt).getTime() > Date.now() + 5 * 60_000) {
    errors.push("occurred_at cannot be more than 5 minutes in the future.");
  }

  // Never allow secrets to sneak into payloads — structural guard only.
  const forbiddenKeys = /api[_-]?key|token|secret|password|authorization/i;
  for (const key of Object.keys(input.payload ?? {})) {
    if (forbiddenKeys.test(key)) {
      errors.push(`payload field rejected for security review: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Deterministic default event identity when a producer doesn't supply one. */
export function buildDefaultDedupeKey(
  eventType: string,
  targetId: string | null | undefined,
  occurredAt: string
): string {
  return `${eventType}:${targetId ?? "org"}:${occurredAt.slice(0, 19)}`;
}
