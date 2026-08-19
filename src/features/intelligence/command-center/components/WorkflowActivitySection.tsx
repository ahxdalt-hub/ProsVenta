// ============================================================================
// Prosventa Intelligence Command Center — Workflow Activity Section
// Stage 4 — Phase 10: Intelligence Command Center
// ============================================================================

"use client";

import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import { INTELLIGENCE_EXECUTION_STATUS_LABELS } from "@/features/intelligence/workflows/types";
import type { WorkflowActivity } from "../types";

interface WorkflowActivitySectionProps {
  status: "loading" | "success" | "error";
  data: WorkflowActivity[] | null;
  onRetry: () => void;
}

function getStatusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "completed":
      return "success";
    case "waiting_approval":
    case "pending":
    case "running":
      return "warning";
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function WorkflowActivitySection({ status, data, onRetry }: WorkflowActivitySectionProps) {
  if (status === "loading") {
    return (
      <Card>
        <CardHeader title="Workflow Activity" description="Recent automation runs" />
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader title="Workflow Activity" description="Recent automation runs" />
        <div className="p-6">
          <Alert variant="error" title="Workflow activity unavailable" onRetry={onRetry}>
            We couldn{"'"}t load recent workflow activity.
          </Alert>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader title="Workflow Activity" description="Recent automation runs" />
        <EmptyState
          title="No workflow activity"
          description="Workflow executions will appear here when your intelligence workflows run."
          icon={<DashboardIcon name="automation" size={20} />}
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Workflow Activity" description="Recent automation runs" />
      <div className="p-6 space-y-3">
        {data.map(({ execution, workflowName }) => (
          <div
            key={execution.id}
            className="rounded-lg border border-slate-100 p-3.5 hover:border-slate-200 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {workflowName || "Workflow"}
              </p>
              <Badge variant={getStatusVariant(execution.status)} className="shrink-0">
                {INTELLIGENCE_EXECUTION_STATUS_LABELS[execution.status as keyof typeof INTELLIGENCE_EXECUTION_STATUS_LABELS] ?? execution.status}
              </Badge>
            </div>
            {execution.prospect_name && (
              <p className="text-xs text-slate-500 mt-1 truncate">
                {execution.prospect_name}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
              <span>{formatTime(execution.created_at)}</span>
              {execution.prospect_id && (
                <>
                  <span aria-hidden="true">·</span>
                  <Link
                    href={`/dashboard/prospects?prospect=${execution.prospect_id}`}
                    className="hover:text-slate-600 hover:underline"
                  >
                    View prospect
                  </Link>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}