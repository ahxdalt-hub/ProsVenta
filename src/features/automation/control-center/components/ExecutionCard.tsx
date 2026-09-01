// ============================================================================
// Prosventa Automation Control Center — Execution Card
// ============================================================================
// One card per execution used across Running / Needs Attention / Recent.
// Links to the execution detail, the playbook, and the prospect experience.
// ============================================================================

import Link from "next/link";
import type { ExecutionSummary } from "@/lib/db/automation-control-center";
import { formatDuration, relativeTime } from "../labels";
import { StatusBadge } from "./StatusBadge";

interface Props {
  execution: ExecutionSummary;
  /** Extra context line (e.g. failure explanation). */
  detailLine?: string | null;
}

export function ExecutionCard({ execution, detailLine }: Props) {
  const isActive = ["queued", "running", "waiting"].includes(execution.status);
  // Step progress is only shown when the total is actually known — never faked.
  const showProgress =
    isActive && execution.total_steps !== null && execution.total_steps > 0;

  return (
    <Link
      href={`/dashboard/automation/executions/${execution.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-navy-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {execution.playbook_name ?? "Automation"}
            {execution.playbook_version !== null && (
              <span className="ml-1.5 text-xs font-normal text-slate-400">
                v{execution.playbook_version}
              </span>
            )}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {execution.prospect_name ?? "No linked prospect"}
          </p>
        </div>
        <StatusBadge status={execution.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        {showProgress && (
          <span className="font-medium text-slate-600">
            Step {Math.min(execution.current_step_index + 1, execution.total_steps ?? 0)} of{" "}
            {execution.total_steps}
          </span>
        )}
        <span>Started {relativeTime(execution.started_at ?? execution.created_at)}</span>
        {isActive && (
          <span>
            Running for {formatDuration(execution.started_at ?? execution.created_at, null)}
          </span>
        )}
        {!isActive && execution.completed_at && (
          <span>
            Finished {relativeTime(execution.completed_at)} · Took{" "}
            {formatDuration(execution.started_at ?? execution.created_at, execution.completed_at)}
          </span>
        )}
      </div>

      {detailLine && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{detailLine}</p>
      )}

      <span className="mt-2 inline-block text-xs font-medium text-blue-700 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        View execution →
      </span>
    </Link>
  );
}
