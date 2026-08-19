"use client";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { SignalRecord } from "../../signals/types";
import {
  SIGNAL_IMPORTANCE_LABELS,
  SIGNAL_CATEGORY_LABELS,
  SIGNAL_CONFIDENCE_LABELS,
  SIGNAL_TYPE_LABELS,
} from "../../signals/types";
import { WorkspaceSectionHeader, WorkspaceEmptyState } from "./sections";
import { ConfidenceBadge } from "./confidence";

export function SignalsTab({
  signals,
  isProcessing,
  onDetect,
}: {
  signals: SignalRecord[];
  isProcessing: boolean;
  onDetect: () => void;
}) {
  const priority = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  const sorted = [...signals].sort((a, b) => {
    const p = priority[a.importance] - priority[b.importance];
    if (p !== 0) return p;
    return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
  });

  return (
    <div className="space-y-6">
      <WorkspaceSectionHeader
        title="Signals"
        description="Observed events with evidence — not interpreted as buying intent."
        action={
          <Button size="sm" onClick={onDetect} loading={isProcessing} disabled={isProcessing}>
            {isProcessing ? "Detecting..." : signals.length > 0 ? "Detect again" : "Detect Signals"}
          </Button>
        }
      />

      {sorted.length === 0 && !isProcessing && (
        <WorkspaceEmptyState
          title="No signals detected yet"
          description="Run detection to record observed events (hiring, funding, product announcements) tied to this prospect."
          actionLabel="Detect Signals"
          onAction={onDetect}
        />
      )}

      {sorted.length > 0 && (
        <ol className="relative border-l border-slate-200 ml-3 space-y-6">
          {sorted.map((signal) => (
            <SignalTimelineItem key={signal.id} signal={signal} />
          ))}
        </ol>
      )}
    </div>
  );
}

function SignalTimelineItem({ signal }: { signal: SignalRecord }) {
  const importanceDot: Record<string, string> = {
    critical: "bg-red-500 ring-red-100",
    high: "bg-orange-500 ring-orange-100",
    medium: "bg-amber-500 ring-amber-100",
    low: "bg-slate-300 ring-slate-100",
  };
  const confidenceTone: Record<string, string> = {
    high: "text-emerald-700",
    medium: "text-blue-700",
    low: "text-slate-500",
  };

  return (
    <li className="relative pl-6">
      <span
        className={cn(
          "absolute -left-[7px] top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-opacity-40",
          importanceDot[signal.importance]
        )}
        aria-hidden="true"
      />
      <div className="rounded-lg border border-slate-100 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">{signal.title}</p>
          <span className={cn("text-xs font-medium", confidenceTone[signal.confidence])}>
            {SIGNAL_CONFIDENCE_LABELS[signal.confidence]} confidence
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{signal.description}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
          <span>{SIGNAL_TYPE_LABELS[signal.signal_type]}</span>
          <span>{SIGNAL_CATEGORY_LABELS[signal.category]}</span>
          <span>{SIGNAL_IMPORTANCE_LABELS[signal.importance]} importance</span>
          <span>{formatDate(signal.detected_at)}</span>
        </div>

        {signal.evidence && (
          <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
            <span className="font-medium text-slate-500">Evidence: </span>
            {signal.evidence}
          </p>
        )}

        {signal.interpretation && (
          <p className="mt-1.5 text-[11px] text-slate-400 italic">
            Possible interpretation: {signal.interpretation}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ConfidenceBadge level={signal.confidence === "high" ? "high" : signal.confidence === "medium" ? "medium" : "low"} className="!px-2 !py-0.5" />
          <span className="text-[11px] text-slate-400">Source: {signal.source}</span>
          {signal.source_url && (
            <a
              href={signal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-600 hover:text-blue-700"
            >
              View source
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

