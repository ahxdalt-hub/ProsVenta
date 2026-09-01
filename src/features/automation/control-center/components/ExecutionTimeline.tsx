"use client";

// ============================================================================
// Prosventa Automation Control Center — Execution Timeline
// ============================================================================
// Distinguishes completed / running / skipped / failed / waiting steps purely
// from RECORDED action rows (history is never rewritten). Upcoming steps come
// from the playbook's current definition and are labeled as such. Steps are
// expandable to show honest result/error details — never raw credentials.
// ============================================================================

import { useState } from "react";
import type { ExecutionDetail, ExecutionStepView } from "@/lib/db/automation-control-center";
import { formatClock, failureExplanation } from "../labels";
import { Badge } from "@/components/ui/Badge";

const STEP_ICONS: Record<string, string> = {
  completed: "✓",
  success: "✓",
  running: "●",
  failed: "✕",
  cancelled: "✕",
  skipped: "○",
  pending: "○",
  waiting: "◔",
};

function stepBadgeVariant(status: string) {
  if (status === "completed" || status === "success") return "success" as const;
  if (status === "failed" || status === "cancelled") return "danger" as const;
  if (status === "skipped") return "neutral" as const;
  return "default" as const;
}

function StepDetails({ step }: { step: ExecutionStepView }) {
  const failed = step.status === "failed" || step.status === "cancelled";
  const outputEntries = Object.entries(step.output ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && typeof v !== "object"
  );
  return (
    <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <span className="font-medium text-slate-500">Status</span>
        <span className="capitalize">{step.status}</span>
        {step.started_at && (
          <>
            <span className="font-medium text-slate-500">Started</span>
            <span>{formatClock(step.started_at)}</span>
          </>
        )}
        {step.executed_at && (
          <>
            <span className="font-medium text-slate-500">Completed</span>
            <span>{formatClock(step.executed_at)}</span>
          </>
        )}
        <span className="font-medium text-slate-500">Attempts</span>
        <span>{step.attempt_count}</span>
      </div>

      {failed ? (
        <div>
          <p className="font-medium text-slate-700">Reason</p>
          <p>{failureExplanation(step.error_category, step.error)}</p>
          <p className="mt-1 font-medium text-slate-700">What you can do</p>
          <p>
            {step.error_category === "provider_unavailable"
              ? "Configure or reconnect the provider this step needs, then retry."
              : step.error_category === "validation_error"
                ? "Fix the step's configuration in the Playbook, then run it again."
                : "Retry the execution once the underlying issue is addressed."}
          </p>
        </div>
      ) : outputEntries.length > 0 ? (
        <div>
          <p className="font-medium text-slate-700">Result</p>
          <ul className="list-inside list-disc">
            {outputEntries.slice(0, 6).map(([key, value]) => (
              <li key={key}>
                <span className="capitalize">{key.replace(/_/g, " ")}</span>: {String(value)}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-slate-400">Source: Prosventa internal automation engine.</p>
        </div>
      ) : null}
    </div>
  );
}

export function ExecutionTimeline({ detail }: { detail: ExecutionDetail }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const recorded = [...detail.steps].sort((a, b) => (a.step_index ?? 999) - (b.step_index ?? 999));

  return (
    <ol className="space-y-0" aria-label="Execution timeline">
      {recorded.map((step, i) => {
        const isOpen = openId === step.id;
        const icon = STEP_ICONS[step.status] ?? "•";
        return (
          <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Timeline rail */}
            {i > 0 && <span aria-hidden className="absolute left-[11px] top-0 h-full w-px bg-slate-200" />}
            <span
              aria-hidden
              className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                step.status === "completed" || step.status === "success"
                  ? "border-green-200 bg-green-50 text-green-600"
                  : step.status === "failed" || step.status === "cancelled"
                    ? "border-red-200 bg-red-50 text-red-600"
                    : step.status === "running"
                      ? "animate-pulse border-blue-200 bg-blue-50 text-blue-600"
                      : "border-slate-200 bg-white text-slate-400"
              }`}
            >
              {icon}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : step.id)}
                aria-expanded={isOpen}
                className="flex w-full flex-wrap items-center gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
              >
                <span className="text-sm font-medium text-slate-900">
                  {step.action_type.replace(/_/g, " ")}
                </span>
                <Badge variant={stepBadgeVariant(step.status)}>
                  {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                </Badge>
                {step.attempt_count > 1 && (
                  <span className="text-xs text-slate-400">Attempt {step.attempt_count}</span>
                )}
                <span className="ml-auto text-xs text-slate-400">
                  {step.executed_at ? formatClock(step.executed_at) : "in progress…"}
                </span>
              </button>
              {isOpen ? (
                <StepDetails step={step} />
              ) : step.status === "failed" && step.error ? (
                <p className="mt-1 truncate text-xs text-red-600">
                  {failureExplanation(step.error_category, step.error)}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}

      {/* Upcoming steps — from the CURRENT playbook definition */}
      {detail.upcoming_steps.map((s, i) => (
        <li key={`upcoming-${s.position}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
          {i > 0 && <span aria-hidden className="absolute left-[11px] top-0 h-full w-px bg-slate-100" />}
          <span
            aria-hidden
            className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-xs text-slate-300"
          >
            ○
          </span>
          <div className="pt-1">
            <span className="text-sm text-slate-400">{s.title || s.action_type.replace(/_/g, " ")}</span>
            <span className="ml-2 text-xs text-slate-300">Upcoming</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

