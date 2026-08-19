"use client";

import { useState, useTransition } from "react";
import { changeProspectStatus } from "@/features/prospects/actions/manage";
import type { ProspectStatus } from "@/types/database";
import { cn } from "@/lib/utils";
import { STATUS_OPTIONS, STATUS_LABELS, STATUS_STYLES } from "./status-config";

interface ProspectStatusSelectorProps {
  prospectId: string;
  currentStatus: ProspectStatus;
}

export function ProspectStatusSelector({
  prospectId,
  currentStatus,
}: ProspectStatusSelectorProps) {
  const [status, setStatus] = useState<ProspectStatus>(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: ProspectStatus) {
    if (next === status) return;
    setError(null);
    setStatus(next);
    startTransition(async () => {
      const result = await changeProspectStatus(prospectId, next);
      if (result.error) {
        setError(result.error);
        setStatus(currentStatus);
      }
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Status
        </label>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label="Prospect status">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => handleChange(option)}
              disabled={isPending}
              aria-pressed={status === option}
              className={cn(
                "px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-50",
                status === option
                  ? STATUS_STYLES[option]
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {STATUS_LABELS[option]}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}