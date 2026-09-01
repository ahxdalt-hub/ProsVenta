// ============================================================================
// Prosventa Automation Control Center — Shared Labels & Formatting
// Stage 7 — Phase 5
// ============================================================================
// Reuses the Phase 4 execution state vocabulary (EXECUTION_STATE_LABELS) —
// no second status vocabulary is created here.
// ============================================================================

import { EXECUTION_STATE_LABELS, type ExecutionState } from "@/features/automation/orchestrator/state-machine";

export type { ExecutionState };
export { EXECUTION_STATE_LABELS };

/** Technical trigger identifiers → human-readable text ("Why it ran"). */
export const TRIGGER_LABELS: Record<string, string> = {
  "prospect.created": "New prospect added",
  "prospect.imported": "Prospect imported",
  "prospect.updated": "Prospect updated",
  "prospect.deleted": "Prospect removed",
  "prospect.score.updated": "Prospect score changed",
  "signal.detected": "New signal detected",
  "recommendation.generated": "Recommendation generated",
  "intelligence.completed": "Intelligence processing completed",
  "intelligence.partially_completed": "Intelligence processing partially completed",
  "intelligence.failed": "Intelligence processing failed",
  "workflow.manual_triggered": "Started manually",
};

export function triggerLabel(triggerType: string | null): string {
  if (!triggerType) return "Unknown trigger";
  return TRIGGER_LABELS[triggerType] ?? triggerType.replace(/[._]/g, " ");
}

/** Deterministic failure-category explanation (mirrors the Phase 4 taxonomy). */
export function failureExplanation(category: string | null, message: string | null): string {
  switch (category) {
    case "provider_unavailable":
      return message ?? "A required provider is not available or not configured yet.";
    case "validation_error":
      return message ?? "This step cannot run until its configuration is corrected.";
    case "not_found":
      return message ?? "This step could not run because its target no longer exists.";
    case "permission_denied":
      return message ?? "This step was not allowed to run with the current permissions.";
    case "capability_unsupported":
      return message ?? "The configured provider does not support this step.";
    case "limit_exceeded":
      return message ?? "A safety limit was reached.";
    case "loop_protection":
      return message ?? "This automation chain was stopped to prevent an endless loop.";
    case "cancelled":
      return message ?? "This automation was cancelled before it could finish.";
    default:
      return message ?? "Something went wrong while running this automation.";
  }
}

/** Failure categories a user retry may legitimately fix (server re-validates). */
export const USER_RETRYABLE_CATEGORIES = new Set([
  "transient_error",
  "provider_unavailable",
  "internal_error",
]);

export function isUserRetryable(failureCategory: string | null): boolean {
  return USER_RETRYABLE_CATEGORIES.has(failureCategory ?? "");
}

/** Relative time — honest, server-neutral phrasing ("2m ago"). */
export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return "—";
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const secs = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function formatClock(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
