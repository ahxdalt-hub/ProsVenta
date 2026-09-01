// ============================================================================
// Prosventa Automation Control Center — Playbook Operations Section
// ============================================================================
// Operational view of Playbooks: real execution/failure counts from actual
// execution records and simple deterministic health (no invented AI scores).
// ============================================================================

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PlaybookWithStats } from "@/features/playbooks/types";

export function PlaybookOperations({ playbooks }: { playbooks: PlaybookWithStats[] }) {
  if (playbooks.length === 0) {
    return (
      <EmptyState
        title="No active Playbooks yet."
        description="Create a Playbook to start automating repeatable work."
        action={{ label: "Create a Playbook", href: "/dashboard/automation/playbooks" }}
      />
    );
  }
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {playbooks.map((pb) => {
        const failingRate = pb.execution_count > 0 ? pb.failure_count / pb.execution_count : 0;
        // Deterministic health: paused → Paused; ≥50% failures → Failing;
        // any failure → Attention needed; otherwise Healthy.
        const health =
          pb.status === "paused"
            ? { label: "Paused", variant: "warning" as const }
            : pb.status === "draft" || pb.status === "archived"
              ? { label: pb.status === "draft" ? "Draft" : "Archived", variant: "neutral" as const }
              : pb.failure_count > 0 && failingRate >= 0.5
                ? { label: "Failing", variant: "danger" as const }
                : pb.failure_count > 0
                  ? { label: "Attention needed", variant: "warning" as const }
                  : { label: "Healthy", variant: "success" as const };
        return (
          <li key={pb.id}>
            <Link
              href={`/dashboard/automation/playbooks/${pb.id}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm transition hover:bg-slate-50/80 focus-visible:bg-slate-50 focus-visible:outline-none"
            >
              <span className="font-medium text-slate-900">{pb.name}</span>
              <Badge variant={health.variant}>{health.label}</Badge>
              <span className="ml-auto text-xs text-slate-500">
                {pb.execution_count > 0
                  ? `${pb.execution_count} execution${pb.execution_count === 1 ? "" : "s"} · ${pb.failure_count} failure${pb.failure_count === 1 ? "" : "s"}`
                  : "No executions yet"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
