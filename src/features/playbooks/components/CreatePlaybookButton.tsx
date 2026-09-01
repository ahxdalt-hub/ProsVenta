"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  PLAYBOOK_CATEGORY_LABELS,
  PLAYBOOK_CATEGORY_OPTIONS,
  type PlaybookCategory,
} from "../types";
import { createPlaybookAction } from "../actions";

/** Creates a new empty Draft playbook and navigates to its builder. */
export function CreatePlaybookButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlaybookCategory>("new_prospect");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setPending(true);
    setError(null);
    const result = await createPlaybookAction({ name, category });
    setPending(false);
    if (result.error || !result.playbookId) {
      setError(result.error ?? "Failed to create Playbook.");
      return;
    }
    router.push(`/dashboard/automation/playbooks/${result.playbookId}/edit`);
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ New Playbook</Button>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Playbook name"
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-56"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as PlaybookCategory)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
      >
        {PLAYBOOK_CATEGORY_OPTIONS.map((c) => (
          <option key={c} value={c}>{PLAYBOOK_CATEGORY_LABELS[c]}</option>
        ))}
      </select>
      <Button onClick={handleCreate} disabled={pending || !name.trim()}>
        {pending ? "Creating…" : "Create"}
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
