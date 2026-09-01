"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  PLAYBOOK_CATEGORY_LABELS,
  PLAYBOOK_STATUS_LABELS,
  type PlaybookWithStats,
} from "../types";
import { archivePlaybookAction, duplicatePlaybookAction } from "../actions";

function formatLastRun(lastRunAt: string | null): string {
  if (!lastRunAt) return "Never run";
  const date = new Date(lastRunAt);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Last run: Today";
  return `Last run: ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/** Execution health is derived ONLY from real execution counts — no fake stats. */
function healthBadge(playbook: PlaybookWithStats) {
  if (playbook.execution_count === 0) return <span className="text-xs text-slate-400">No runs yet</span>;
  const failureRate = playbook.failure_count / playbook.execution_count;
  if (playbook.failure_count === 0) return <Badge variant="success">Healthy</Badge>;
  if (failureRate > 0.5) return <Badge variant="danger">Failing</Badge>;
  return <Badge variant="warning">Some failures</Badge>;
}

export function PlaybookList({ playbooks }: { playbooks: PlaybookWithStats[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(playbookId: string, action: () => Promise<{ error: string | null; playbookId?: string }>) {
    setPendingId(playbookId);
    setError(null);
    const result = await action();
    if (result.error) setError(result.error);
    setPendingId(null);
    router.refresh();
  }

  if (playbooks.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-slate-500">
          No Playbooks yet. Create one to turn a repeating sales process into a single click.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {playbooks.map((playbook) => (
        <Card key={playbook.id} hover className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="text-2xl shrink-0" aria-hidden>{playbook.icon ?? "📘"}</div>
              <div className="min-w-0">
                <Link
                  href={`/dashboard/automation/playbooks/${playbook.id}`}
                  className="text-sm font-semibold text-slate-900 hover:text-blue-600"
                >
                  {playbook.name}
                </Link>
                {playbook.is_starter && (
                  <Badge variant="neutral" className="ml-2">Starter Playbook</Badge>
                )}
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{playbook.description}</p>
              </div>
            </div>
            <Badge
              variant={
                playbook.status === "active" ? "success" : playbook.status === "paused" ? "warning" : "neutral"
              }
            >
              {PLAYBOOK_STATUS_LABELS[playbook.status]}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{PLAYBOOK_CATEGORY_LABELS[playbook.category]}</span>
            <span>v{playbook.version}</span>
            <span>{playbook.step_count} {playbook.step_count === 1 ? "step" : "steps"}</span>
            <span>{formatLastRun(playbook.last_run_at)}</span>
            {healthBadge(playbook)}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
            <Link href={`/dashboard/automation/playbooks/${playbook.id}`}>
              <Button size="sm" variant="secondary">View</Button>
            </Link>
            <Link href={`/dashboard/automation/playbooks/${playbook.id}/edit`}>
              <Button size="sm" variant="ghost">Edit</Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              disabled={pendingId === playbook.id}
              onClick={() => runAction(playbook.id, () => duplicatePlaybookAction(playbook.id))}
            >
              Duplicate
            </Button>
            {playbook.status !== "archived" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pendingId === playbook.id}
                onClick={() => runAction(playbook.id, () => archivePlaybookAction(playbook.id))}
              >
                Archive
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
