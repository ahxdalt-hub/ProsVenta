import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { STEP_ACTION_CATALOG } from "../types";
import type { PlaybookExecutionView } from "@/lib/db/playbooks";
import { ExecutionControls } from "@/features/automation/orchestrator/components/ExecutionControls";

function stepLabel(actionType: string): string {
  return STEP_ACTION_CATALOG[actionType]?.label ?? actionType.replace(/_/g, " ");
}

interface StepMeta {
  mark: string;
  className: string;
  badge: "success" | "danger" | "warning" | "neutral" | "default";
}

const STATUS_META: Record<string, StepMeta> = {
  completed: { mark: "✓", className: "text-green-600 border-green-200 bg-green-50", badge: "success" },
  success: { mark: "✓", className: "text-green-600 border-green-200 bg-green-50", badge: "success" },
  failed: { mark: "✕", className: "text-red-600 border-red-200 bg-red-50", badge: "danger" },
  skipped: { mark: "○", className: "text-slate-400 border-slate-200 bg-slate-50", badge: "neutral" },
  waiting_approval: { mark: "…", className: "text-amber-600 border-amber-200 bg-amber-50", badge: "warning" },
  running: { mark: "…", className: "text-blue-600 border-blue-200 bg-blue-50", badge: "default" },
};

function executionBadge(status: string): "success" | "danger" | "warning" | "neutral" | "default" {
  switch (status) {
    case "completed":
    case "success":
      return "success";
    case "failed":
      return "danger";
    case "paused":
    case "waiting":
    case "waiting_approval":
      return "warning";
    case "cancelled":
    case "skipped":
      return "neutral";
    default:
      return "default";
  }
}

function executionLabel(status: string): string {
  return (
    {
      completed: "Completed",
      partially_completed: "Partially completed",
      failed: "Failed",
      running: "Running",
      queued: "Queued",
      waiting: "Waiting",
      paused: "Paused",
      cancelled: "Cancelled",
      skipped: "Skipped",
      success: "Completed",
    }[status] ?? status
  );
}

/** Summarizes meaningful step output into short, readable lines. */
function outputLines(output: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const skip = new Set(["reason", "notificationCreated", "notification_created"]);
  for (const [key, value] of Object.entries(output ?? {})) {
    if (skip.has(key)) continue;
    if (typeof value === "string" && value.length > 80) continue; // don't dump payloads
    if (value === true) lines.push(`${key.replace(/_/g, " ")} ✓`);
    else if (value !== undefined && value !== null && value !== "") lines.push(`${key.replace(/_/g, " ")}: ${String(value)}`);
  }
  return lines.slice(0, 4);
}
/**
 * Human-readable execution timeline. Shows the trigger, each step's real
 * outcome (completed / skipped / failed / waiting), honest errors, and live
 * controls for pause / resume / cancel.
 */
export function PlaybookExecutionHistory({ executions }: { executions: PlaybookExecutionView[] }) {
  if (executions.length === 0) {
    return <p className="text-sm text-slate-500">Never run.</p>;
  }

  return (
    <div className="space-y-4">
      {executions.map((execution) => {
        const ordered = [...execution.actions].sort(
          (a, b) => (a.step_index ?? 99) - (b.step_index ?? 99)
        );
        const lastError = ordered.find((a) => a.error)?.error ?? execution.error_message;

        return (
          <Card key={execution.id} className="overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">
                    {execution.prospect_name ?? "Unknown prospect"}
                  </span>
                  <Badge variant={executionBadge(execution.status)}>
                    {executionLabel(execution.status)}
                  </Badge>
                  {execution.playbook_version ? (
                    <span className="text-xs text-slate-400">v{execution.playbook_version}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(execution.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {execution.reason && (
                  <p className="mt-1 text-xs italic text-blue-700">
                    Triggered: {execution.reason}
                  </p>
                )}
              </div>
              <ExecutionControls executionId={execution.id} status={execution.status} />
            </div>

            {/* Steps */}
            <ol className="px-4 py-3 space-y-1.5">
              {ordered.length === 0 && (
                <li className="text-xs text-slate-400">
                  No step results recorded for this execution.
                </li>
              )}
              {ordered.map((action, i) => {
                const meta = STATUS_META[action.status] ?? {
                  mark: "·",
                  className: "text-slate-400 border-slate-200 bg-slate-50",
                  badge: "neutral" as const,
                };
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${meta.className}`}
                    >
                      {meta.mark}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">
                          {stepLabel(action.action_type)}
                        </span>
                        {action.attempt_count && action.attempt_count > 1 ? (
                          <span className="text-xs text-amber-600">attempt {action.attempt_count}</span>
                        ) : null}
                      </div>
                      {action.error ? (
                        <p className="mt-0.5 text-xs text-red-700">
                          {action.error.replace(/\s*\[[a-z_]+\]$/, "")}
                        </p>
                      ) : null}
                      {outputLines(action.output).map((line, li) => (
                        <p key={li} className="text-xs text-slate-500">{line}</p>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Honest error footer with retry guidance */}
            {execution.status === "failed" && lastError && (
              <div className="border-t border-red-100 bg-red-50/60 px-4 py-3">
                <p className="text-xs font-medium text-red-800">This automation did not complete</p>
                <p className="mt-0.5 text-xs text-red-700">{lastError}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Completed steps are preserved. Fix the underlying issue and retry — completed
                  steps will not run again.
                </p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}