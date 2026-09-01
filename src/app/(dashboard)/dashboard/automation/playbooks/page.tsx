import Link from "next/link";
import { ensureOrganization } from "@/lib/db/organizations";
import { ensureStarterPlaybooks, getPlaybooks } from "@/lib/db/playbooks";
import { PlaybookList } from "@/features/playbooks/components/PlaybookList";
import { CreatePlaybookButton } from "@/features/playbooks/components/CreatePlaybookButton";

export const dynamic = "force-dynamic";

export const metadata = { title: "Playbooks — Prosventa" };

export default async function PlaybooksPage() {
  await ensureOrganization();
  // Seed genuine starter playbooks (Draft) once per organization.
  await ensureStarterPlaybooks();
  const playbooks = await getPlaybooks();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Playbooks</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Repeatable processes for what to do next. Each Playbook bundles a trigger,
            conditions and steps into something you can preview, run manually, or let
            run automatically.
          </p>
        </div>
        <CreatePlaybookButton />
      </div>

      <p className="text-xs text-slate-400">
        Part of{" "}
        <Link href="/dashboard/automation" className="underline hover:text-slate-600">
          Automation
        </Link>{" "}
        → Playbooks
      </p>

      <PlaybookList playbooks={playbooks} />
    </div>
  );
}
