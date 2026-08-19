"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AutomationIcon } from "./icons";
import { TRIGGER_LABELS, ACTION_LABELS } from "../types";
import type { Workflow } from "../types";
import {
  toggleWorkflowAction,
  pauseWorkflowAction,
  resumeWorkflowAction,
  duplicateWorkflowAction,
  deleteWorkflowAction,
} from "../actions";

interface WorkflowCardProps {
  workflow: Workflow;
  onEdit?: (workflow: Workflow) => void;
}

export function WorkflowCard({ workflow, onEdit }: WorkflowCardProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isActive = workflow.is_active && !workflow.is_paused;
  const isPaused = workflow.is_paused;

  async function runAction(action: () => Promise<{ error: string | null }>) {
    setIsPending(true);
    setError(null);
    const result = await action();
    if (result.error) setError(result.error);
    setIsPending(false);
    router.refresh();
  }

  const triggerLabel = TRIGGER_LABELS[workflow.trigger_type] ?? workflow.trigger_type;
  const actionLabels = workflow.actions.map((a) => ACTION_LABELS[a.type] ?? a.type).join(" → ");

  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <AutomationIcon name="bolt" size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{workflow.name}</h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">{triggerLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isActive ? (
            <Badge variant="success">Active</Badge>
          ) : isPaused ? (
            <Badge variant="warning">Paused</Badge>
          ) : (
            <Badge variant="neutral">Inactive</Badge>
          )}
        </div>
      </div>

      {workflow.description && (
        <p className="mt-3 text-sm text-slate-500 line-clamp-2">{workflow.description}</p>
      )}

      {actionLabels && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <AutomationIcon name="action" size={14} className="text-slate-400" />
          <span className="truncate">{actionLabels}</span>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <AutomationIcon name="history" size={14} />
          {workflow.execution_count} runs
        </span>
        <span className="inline-flex items-center gap-1 text-green-600">
          {workflow.success_count} ok
        </span>
        {workflow.last_run_at && (
          <span className="inline-flex items-center gap-1">
            <AutomationIcon name="clock" size={14} />
            {new Date(workflow.last_run_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-600" role="alert">{error}</p>
      )}

      {/* Card actions */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        {onEdit && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(workflow)}
            disabled={isPending}
          >
            Edit
          </Button>
        )}

        <div className="flex items-center gap-1">
          {isPaused ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => runAction(() => resumeWorkflowAction(workflow.id))}
              disabled={isPending}
            >
              <AutomationIcon name="play" size={14} />
              Resume
            </Button>
          ) : isActive ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => runAction(() => pauseWorkflowAction(workflow.id))}
              disabled={isPending}
            >
              <AutomationIcon name="pause" size={14} />
              Pause
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => runAction(() => toggleWorkflowAction(workflow.id, true))}
              disabled={isPending}
            >
              <AutomationIcon name="play" size={14} />
              Enable
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => runAction(() => duplicateWorkflowAction(workflow.id))}
            disabled={isPending}
            aria-label={`Duplicate ${workflow.name}`}
          >
            <AutomationIcon name="duplicate" size={14} />
          </Button>

          {confirmDelete ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => runAction(() => deleteWorkflowAction(workflow.id))}
              disabled={isPending}
            >
              Confirm
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              aria-label={`Delete ${workflow.name}`}
            >
              <AutomationIcon name="trash" size={14} />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}