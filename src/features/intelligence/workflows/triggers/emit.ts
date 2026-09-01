// ============================================================================
// Prosventa Workflow Trigger & Event Engine — Emission
// Stage 7 — Phase 2
// ============================================================================
// The ONLY entry point producers use to emit workflow events.
//
// Guarantees:
//   - Validates against the registry BEFORE persistence (invalid events are
//     never processed).
//   - Deduplicates at the DB level via (organization_id, event_key).
//   - NEVER throws and NEVER blocks the producer path beyond the event insert.
//     Processing is dispatched via `after()` so HTTP requests respond first.
// ============================================================================

import "server-only";
import { after } from "next/server";

import {
  insertWorkflowEvent,
  updateWorkflowEventStatus,
} from "@/lib/db/workflow-events";
import { validateWorkflowEventInput, buildDefaultDedupeKey } from "./validate";
import { isRegisteredEventType } from "./registry";
import { processWorkflowEvent } from "./process";
import type { EmitResult, WorkflowEventInput } from "./types";

export async function emitWorkflowEvent(input: WorkflowEventInput): Promise<EmitResult> {
  try {
    if (!isRegisteredEventType(input.eventType)) {
      return { ok: false, outcome: "rejected", reason: `Unregistered event type: ${input.eventType}` };
    }

    const occurredAt = input.occurredAt ?? new Date().toISOString();
    const validation = validateWorkflowEventInput({ ...input, occurredAt });
    if (!validation.valid) {
      // Record as invalid when we can (org known), so audit trails keep the
      // original reason. Never process invalid events.
      if (input.organizationId) {
        try {
          const { record } = await insertWorkflowEvent({
            organizationId: input.organizationId,
            eventType: input.eventType,
            targetType: input.targetType ?? null,
            targetId: input.targetId ?? null,
            payload: input.payload ?? {},
            occurredAt,
            eventKey: buildDefaultDedupeKey(input.eventType, input.targetId, occurredAt),
            metadata: { ...(input.metadata ?? {}), invalid_reasons: validation.errors },
          });
          if (record) {
            await updateWorkflowEventStatus(record.id, "invalid", {
              processingError: validation.errors.join("; ").slice(0, 500),
            });
          }
        } catch {
          // RLS or connection issue — swallow; producers must not break.
        }
      }
      return { ok: false, outcome: "rejected", reason: validation.errors.join("; ") };
    }

    const dedupeKey = input.dedupeKey ?? buildDefaultDedupeKey(input.eventType, input.targetId, occurredAt);

    const { record, duplicate, error } = await insertWorkflowEvent({
      organizationId: input.organizationId,
      eventType: input.eventType,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      payload: input.payload,
      occurredAt,
      eventKey: dedupeKey,
      metadata: input.metadata ?? {},
    });

    if (error) {
      console.error(`[trigger-engine] Failed to persist event ${input.eventType}:`, error);
      return { ok: false, outcome: "error", reason: error };
    }

    if (duplicate || !record) {
      return { ok: true, outcome: "duplicate", eventId: record?.id };
    }

    // Process asynchronously AFTER the response — prospect creation / imports /
    // scoring stay responsive. Errors inside processing are contained there.
    after(async () => {
      try {
        await processWorkflowEvent(record.id);
      } catch (err) {
        console.error(`[trigger-engine] Processing failed for event ${record.id}:`, err);
      }
    });

    return { ok: true, outcome: "emitted", eventId: record.id };
  } catch (err) {
    console.error("[trigger-engine] emitWorkflowEvent unexpected error:", err);
    return { ok: false, outcome: "error", reason: "unexpected_error" };
  }
}

/**
 * Fire-and-forget wrapper for hot paths (prospect creation, imports, scoring).
 * Never throws, never blocks on failures.
 */
export function safeEmitWorkflowEvent(input: WorkflowEventInput): void {
  void emitWorkflowEvent(input).catch((err) =>
    console.error("[trigger-engine] safeEmit failed:", err)
  );
}
