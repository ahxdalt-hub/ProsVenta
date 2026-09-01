import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  getPlaybookById,
  getPlaybookSteps,
  getPlaybookExecutions,
  getWorkflowForPlaybook,
} from "@/lib/db/playbooks";
import { buildPreview } from "@/features/playbooks/engine";
import { PLAYBOOK_CATEGORY_LABELS, PLAYBOOK_STATUS_LABELS, STEP_ACTION_CATALOG } from "@/features/playbooks/types";
import { PlaybookRunPanel } from "@/features/playbooks/components/PlaybookRunPanel";
import { PlaybookExecutionHistory } from "@/features/playbooks/components/PlaybookExecutionHistory";
import { PlaybookStatusActions } from "@/features/playbooks/components/PlaybookStatusActions";

export const dynamic = "force-dynamic";

export default async function PlaybookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playbook = await getPlaybookById(id);
  if (!playbook) notFound();

  const [steps, workflow, executions] = await Promise.all([
    getPlaybookSteps(id),
    getWorkflowForPlaybook(playbook),
    getPlaybookExecutions(id, 20),
  ]);

  const preview = buildPreview({
    name: playbook.name,
    description: playbook.description,
    trigger_type: workflow?.trigger_type ?? "",
    conditions: ((workflow?.conditions ?? []) as unknown) as never,
    steps,
  });

  // Org-scoped prospect options for manual runs.
  const supabase = await createClient();
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, name, company_name")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard/automation/playbooks" className="text-xs text-slate-500 hover:text-slate-700">
          ← All Playbooks
        </Link>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              playbook.status === "active" ? "success" : playbook.status === "paused" ? "warning" : "neutral"
            }
          >
            {PLAYBOOK_STATUS_LABELS[playbook.status]}
          </Badge>
          <PlaybookStatusActions playbookId={playbook.id} status={playbook.status} />
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-3">
          <span className="text-3xl" aria-hidden>{playbook.icon ?? "📘"}</span>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {playbook.name}
              {playbook.is_starter && (
                <Badge variant="neutral" className="ml-2">Starter Playbook</Badge>
              )}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{playbook.description}</p>
            <p className="mt-2 text-xs text-slate-400">
              {PLAYBOOK_CATEGORY_LABELS[playbook.category]} · Version {playbook.version}
            </p>
          </div>
        </div>
      </Card>

      {/* Preview — WHAT will happen */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900">What this Playbook does</h2>
        <p className="mt-3 text-sm">
          <span className="font-medium text-blue-700">When</span>{" "}
          <span className="text-slate-700">{preview.triggerLabel}</span>
        </p>
        <p className="mt-1 text-sm">
          <span className="font-medium text-blue-700">If</span>{" "}
          <span className="text-slate-700">{preview.conditionText}</span>
        </p>
        <p className="mt-1 text-sm">
          <span className="font-medium text-blue-700">Then</span>
        </p>
        <ol className="mt-2 space-y-2 list-decimal list-inside">
          {preview.steps.map((step, i) => (
            <li key={i} className="text-sm text-slate-700">
              <span className="font-medium">{step.title}</span>
              <span className="block pl-4 text-xs text-slate-500">{step.description}</span>
              {step.conditionText && (
                <span className="block pl-4 text-xs text-amber-700">Only if: {step.conditionText}</span>
              )}
            </li>
          ))}
          {preview.steps.length === 0 && (
            <li className="text-sm text-slate-500">No enabled steps.</li>
          )}
        </ol>
        {preview.steps.some((s) => s.providerBacked) && (
          <p className="mt-3 text-xs text-amber-700">
            Steps marked provider-backed may use external providers in the future.
          </p>
        )}
      </Card>

      {/* Run / dry run */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900">Run this Playbook</h2>
        <p className="mt-1 mb-3 text-xs text-slate-500">
          Runs use the existing workflow engine. Preview first to see exactly what would happen.
        </p>
        <PlaybookRunPanel
          playbookId={playbook.id}
          prospects={(prospects ?? []) as Array<{ id: string; name: string; company_name: string | null }>}
        />
      </Card>

      {/* Execution history */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Execution history</h2>
        <PlaybookExecutionHistory executions={executions} />
      </div>

      {/* Technical reference (secondary) */}
      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer">Underlying workflow details</summary>
        <p className="mt-1">
          Workflow ID: {playbook.workflow_id}
          {workflow ? ` · Trigger type: ${workflow.trigger_type}` : ""}
        </p>
        <p>Steps use these actions: {steps.map((s) => s.action_type in STEP_ACTION_CATALOG ? s.action_type : `${s.action_type} (unsupported)`).join(", ") || "none"}</p>
      </details>
    </div>
  );
}
