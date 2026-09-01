"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  pausePlaybookAction,
  resumePlaybookAction,
  archivePlaybookAction,
  activatePlaybookAction,
  type PlaybookActionResult,
} from "../actions";

/** Status controls for the detail view. Activation always validates first. */
export function PlaybookStatusActions({
  playbookId,
  status,
}: {
  playbookId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[] | null>(null);

  async function run(action: () => Promise<PlaybookActionResult>) {
    setPending(true);
    setError(null);
    setProblems(null);
    const result = await action();
    setPending(false);
    if (result.error) {
      setError(result.error);
      setProblems(result.problems ?? null);
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        {status === "draft" && (
          <Button size="sm" disabled={pending} onClick={() => run(() => activatePlaybookAction(playbookId))}>
            Activate
          </Button>
        )}
        {status === "active" && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => pausePlaybookAction(playbookId))}>
            Pause
          </Button>
        )}
        {(status === "paused" || status === "archived") && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => resumePlaybookAction(playbookId))}>
            Reactivate
          </Button>
        )}
        {status !== "archived" && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => archivePlaybookAction(playbookId))}>
            Archive
          </Button>
        )}
      </div>
      {error && (
        <div className="mt-2 rounded-lg bg-red-50 p-3">
          <p className="text-xs font-medium text-red-800">{error}</p>
          {problems && problems.length > 0 && (
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs text-red-700">
              {problems.map((problem, i) => <li key={i}>{problem}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
