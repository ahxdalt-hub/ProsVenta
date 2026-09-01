"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  cancelExecutionAction,
  pauseExecutionAction,
  resumeExecutionAction,
} from "../../orchestrator-actions";

/** Execution control bar (Pause / Resume / Cancel) — org + state validated server-side. */
export function ExecutionControls({
  executionId,
  status,
  cancelledLabel,
}: {
  executionId: string;
  status: string;
  cancelledLabel?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isTerminal = ["completed", "failed", "cancelled", "partially_completed"].includes(status);
  const isPaused = status === "paused";

  if (isTerminal) {
    return (
      <span className="text-xs text-slate-400">
        {status === "cancelled" ? cancelledLabel ?? "Cancelled" : "Finished"}
      </span>
    );
  }

  async function act(action: "pause" | "resume" | "cancel", fn: () => Promise<{ error: string | null }>) {
    setPending(action);
    setError(null);
    const result = await fn();
    setPending(null);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isPaused ? (
        <Button
          size="sm"
          variant="secondary"
          loading={pending === "resume"}
          onClick={() => act("resume", () => resumeExecutionAction(executionId))}
        >
          Resume
        </Button>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          loading={pending === "pause"}
          onClick={() => act("pause", () => pauseExecutionAction(executionId))}
        >
          Pause
        </Button>
      )}
      <Button
        size="sm"
        variant="danger"
        loading={pending === "cancel"}
        onClick={() => {
          // Concise confirmation before an irreversible action.
          if (
            typeof window !== "undefined" &&
            !window.confirm(
              "Cancel this automation? Future steps will stop; steps that already completed are kept."
            )
          ) {
            return;
          }
          act("cancel", () => cancelExecutionAction(executionId));
        }}
      >
        Cancel
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}