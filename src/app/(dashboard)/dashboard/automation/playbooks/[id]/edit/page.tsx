import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPlaybookById,
  getPlaybookSteps,
  getWorkflowForPlaybook,
} from "@/lib/db/playbooks";
import { PlaybookBuilder } from "@/features/playbooks/components/PlaybookBuilder";

export const dynamic = "force-dynamic";

export default async function PlaybookEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playbook = await getPlaybookById(id);
  if (!playbook) notFound();

  const [steps, workflow] = await Promise.all([
    getPlaybookSteps(id),
    getWorkflowForPlaybook(playbook),
  ]);

  if (playbook.status === "archived") {
    return (
      <div className="space-y-4">
        <Link href={`/dashboard/automation/playbooks/${id}`} className="text-xs text-slate-500 hover:text-slate-700">
          ← Back to Playbook
        </Link>
        <p className="text-sm text-slate-500">Archived Playbooks cannot be edited.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href={`/dashboard/automation/playbooks/${id}`} className="text-xs text-slate-500 hover:text-slate-700">
          ← Back to Playbook
        </Link>
        <p className="text-xs text-slate-400">Version {playbook.version} · saving creates version {playbook.version + 1}</p>
      </div>

      <h1 className="text-xl font-semibold text-slate-900">Edit Playbook</h1>

      <PlaybookBuilder
        playbook={playbook}
        initialTriggerType={workflow?.trigger_type ?? "workflow.manual_triggered"}
        initialConditions={((workflow?.conditions ?? []) as unknown) as never}
        initialSteps={steps.map((s) => ({
          action_type: s.action_type,
          title: s.title,
          description: s.description,
          config: s.config,
          condition: s.condition,
          requires_approval: s.requires_approval,
          enabled: s.enabled,
        }))}
      />
    </div>
  );
}
