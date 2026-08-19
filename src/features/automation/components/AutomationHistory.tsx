"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AutomationIcon } from "./icons";
import type { WorkflowExecution } from "../types";

interface AutomationHistoryProps {
  executions: WorkflowExecution[];
  limit?: number;
}

const STATUS_STYLES: Record<string, { label: string; variant: "success" | "danger" | "warning" | "neutral" }> = {
  success: { label: "Success", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
  running: { label: "Running", variant: "warning" },
  pending: { label: "Pending", variant: "neutral" },
  skipped: { label: "Skipped", variant: "neutral" },
};

export function AutomationHistory({ executions, limit = 20 }: AutomationHistoryProps) {
  const visible = executions.slice(0, limit);

  if (visible.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-3">
            <AutomationIcon name="history" size={24} />
          </div>
          <p className="text-sm font-medium text-slate-900">No automation history yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Workflow executions will appear here once your automations run.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6 pt-4">
        <div className="space-y-2">
          {visible.map((execution) => {
            const status = STATUS_STYLES[execution.status] ?? STATUS_STYLES.pending;
            return (
              <div
                key={execution.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3 hover:border-slate-200 transition-colors duration-150"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-500 shrink-0">
                    <AutomationIcon name="workflow" size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {execution.workflow?.name ?? "Workflow"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {execution.prospect_name ?? "No prospect"}
                      {execution.duration_ms != null && ` · ${execution.duration_ms}ms`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-400">
                    {new Date(execution.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}