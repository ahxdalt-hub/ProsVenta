// ============================================================================
// Prosventa Workflow Trigger & Event Engine — Types
// Stage 7 — Phase 2: Trigger & Event Engine
// ============================================================================
// Normalized internal event representation. Extends the existing workflow
// infrastructure — this is NOT a second event bus or a second condition engine.
//
// Event lifecycle:
//   received → processing → matched → executed
//                        ↘ skipped   (valid event, no workflow needed)
//                        ↘ failed    (processing problem, retryable)
//                        ↘ invalid   (rejected at validation)
// ============================================================================

/** Registered event types (see registry.ts for definitions). */
export type WorkflowEventType =
  | "prospect.created"
  | "prospect.imported"
  | "prospect.updated"
  | "prospect.deleted"
  | "prospect.score.updated"
  | "signal.detected"
  | "recommendation.generated"
  | "intelligence.completed"
  | "intelligence.partially_completed"
  | "intelligence.failed"
  | "workflow.manual_triggered";

export type WorkflowEventTargetType =
  | "prospect"
  | "signal"
  | "recommendation"
  | "intelligence_run"
  | "workflow"
  | "organization";

export type WorkflowEventStatus =
  | "received"
  | "processing"
  | "matched"
  | "skipped"
  | "executed"
  | "failed"
  | "invalid";

/** Input used by producers to emit an event. */
export interface WorkflowEventInput {
  eventType: WorkflowEventType;
  organizationId: string;
  targetType?: WorkflowEventTargetType | null;
  targetId?: string | null;
  payload: Record<string, unknown>;
  occurredAt?: string;
  /**
   * Deterministic identity of the underlying occurrence. The same key is never
   * processed twice per organization (deduplication). Defaults to
   * `${eventType}:${targetId}` when omitted.
   */
  dedupeKey?: string;
  /** Origin metadata for loop protection and explainability. */
  metadata?: {
    source?: string;
    originWorkflowId?: string;
    originExecutionId?: string;
    originChainDepth?: number;
  };
}

/** Persisted normalized event record. */
export interface WorkflowEventRecord {
  id: string;
  organization_id: string;
  event_type: WorkflowEventType;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
  event_key: string;
  status: WorkflowEventStatus;
  skip_reason: string | null;
  processing_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
}

/** Result returned to producers. Producers must never be blocked or thrown at. */
export interface EmitResult {
  ok: boolean;
  /** "duplicate" means the same occurrence was already recorded/processed. */
  outcome: "emitted" | "duplicate" | "rejected" | "error";
  eventId?: string;
  reason?: string;
}
