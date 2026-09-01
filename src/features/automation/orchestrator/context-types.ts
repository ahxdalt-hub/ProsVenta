// ============================================================================
// Prosventa Automation Orchestrator — Context Types
// Stage 7 — Phase 4
// ============================================================================

export interface AutomationContext {
  organization_id: string;
  playbook_id: string;
  execution_id: string;
  trigger_event: {
    event_id: string;
    event_type: string;
    reason?: string | null;
  } | null;
  /** Trigger payload values (e.g. previous_score / new_score) — small scalars. */
  trigger_payload: Record<string, unknown>;
  target: {
    type: string;
    id: string | null;
    name: string | null;
  };
  previous_step_results: Record<string, StepOutputSummary>;
}

export interface StepOutputSummary {
  result: "success" | "skipped" | "failed" | "waiting";
  output: Record<string, unknown>;
  /** Reference into the owning table instead of a raw payload, where possible. */
  result_reference: Record<string, string> | null;
}
