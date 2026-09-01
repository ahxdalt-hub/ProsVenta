// ============================================================================
// Prosventa Automation Orchestrator — Feature Barrel
// Stage 7 — Phase 4
// ============================================================================
export * from "./state-machine";
export * from "./context-types";
export { buildAutomationContext, summarizeStepOutput, recordStepInContext, getReferencedValue } from "./context";
export { buildExecutionIdempotencyKey, buildStepIdempotencyKey } from "./idempotency";
export {
  STUCK_EXECUTION_MS,
  STUCK_EXECUTION_MESSAGE,
  computeLastActivityAt,
  isExecutionStuck,
} from "./stale";
export { dispatchPlaybookExecution, dispatchManualPlaybookExecution } from "./runner";
export { pauseExecution, resumeExecution, cancelExecution, notifyAndRecordLifecycle } from "./control";
export type { DispatchOutcome, PlaybookDispatchInput } from "./runner";