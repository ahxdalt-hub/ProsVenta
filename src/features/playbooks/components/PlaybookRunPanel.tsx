"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { dryRunPlaybookAction, runPlaybookAction, type DryRunResult } from "../actions";

export interface ProspectOption {
  id: string;
  name: string;
  company_name: string | null;
}

/**
 * Manual execution panel. Runs go through the server action → existing
 * workflow engine; nothing executes in the browser.
 */
export function PlaybookRunPanel({
  playbookId,
  prospects,
}: {
  playbookId: string;
  prospects: ProspectOption[];
}) {
  const router = useRouter();
  const [prospectId, setProspectId] = useState(prospects[0]?.id ?? "");
  const [pending, setPending] = useState<"run" | "dry" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);

  if (prospects.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Add a prospect first — Playbooks run against a prospect in your organization.
      </p>
    );
  }

  async function handleRun() {
    if (!prospectId) return;
    setPending("run");
    setError(null);
    setMessage(null);
    const result = await runPlaybookAction(playbookId, prospectId);
    setPending(null);
    if (result.error) setError(result.error);
    else setMessage(result.message ?? "Done.");
    router.refresh();
  }

  async function handleDryRun() {
    setPending("dry");
    setError(null);
    setMessage(null);
    const result = await dryRunPlaybookAction(playbookId, prospectId || null);
    setPending(null);
    if (result.error) setError(result.error);
    setDryRun(result);
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-slate-600">
        Run for prospect
        <select
          value={prospectId}
          onChange={(e) => setProspectId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {prospects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.company_name ? ` — ${p.company_name}` : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-2">
        <Button onClick={handleRun} disabled={pending !== null || !prospectId}>
          {pending === "run" ? "Running…" : "Run Playbook"}
        </Button>
        <Button variant="secondary" onClick={handleDryRun} disabled={pending !== null}>
          {pending === "dry" ? "Checking…" : "Preview (dry run)"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      {dryRun && !dryRun.error && (
        <Card className="p-4 bg-slate-50">
          <p className="text-xs font-semibold text-slate-700">
            Preview only — nothing was executed.
            {!dryRun.conditionsPassed && " Trigger conditions are not met for this prospect."}
          </p>
          <ol className="mt-2 space-y-1 text-xs text-slate-600 list-decimal list-inside">
            {dryRun.steps.map((step, i) => (
              <li key={i}>
                {step.title}{" "}
                {step.outcome === "would_run" && <span className="text-green-700">→ would run</span>}
                {step.outcome === "skipped_condition" && <span className="text-amber-700">→ would skip (condition)</span>}
                {step.outcome === "needs_approval" && <span className="text-blue-700">→ would wait for approval</span>}
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
