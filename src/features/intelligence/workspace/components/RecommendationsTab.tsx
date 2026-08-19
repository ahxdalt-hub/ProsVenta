"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { RecommendationRecord } from "../../recommendations/types";
import { RECOMMENDATION_PRIORITY_LABELS, RECOMMENDATION_TYPE_LABELS } from "../../recommendations/types";
import { WorkspaceSectionHeader, WorkspaceEmptyState } from "./sections";
import { ConfidenceBadge } from "./confidence";

export function RecommendationsTab({
  recommendations,
  isProcessing,
  onGenerate,
  onStatusChange,
}: {
  recommendations: RecommendationRecord[];
  isProcessing: boolean;
  onGenerate: () => void;
  onStatusChange: (id: string, status: RecommendationRecord["status"]) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <WorkspaceSectionHeader
        title="Recommendations"
        description="Structured, evidence-based suggestions for what to do next."
        action={
          <Button size="sm" onClick={onGenerate} loading={isProcessing} disabled={isProcessing}>
            {isProcessing ? "Generating..." : recommendations.length > 0 ? "Regenerate" : "Generate Recommendations"}
          </Button>
        }
      />

      {recommendations.length === 0 && !isProcessing && (
        <WorkspaceEmptyState
          title="No recommendations yet"
          description="Generate recommendations from the intelligence available for this prospect — scoring, signals, research, and enrichment."
          actionLabel="Generate Recommendations"
          onAction={onGenerate}
        />
      )}

      {recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              expanded={expandedId === rec.id}
              onToggle={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({
  recommendation: r,
  expanded,
  onToggle,
  onStatusChange,
}: {
  recommendation: RecommendationRecord;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: RecommendationRecord["status"]) => void;
}) {
  const priorityStyles: Record<string, string> = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-slate-50 text-slate-600 border-slate-200",
  };
  const statusLabel = r.status.charAt(0).toUpperCase() + r.status.slice(1);

  return (
    <div className="rounded-lg border border-slate-100 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", priorityStyles[r.priority])}>
                {RECOMMENDATION_PRIORITY_LABELS[r.priority]}
              </span>
              {r.status !== "new" && (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  {statusLabel}
                </span>
              )}
              <p className="text-sm font-semibold text-slate-800">{r.title}</p>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {RECOMMENDATION_TYPE_LABELS[r.recommendation_type]} · Confidence: {r.confidence}% · {formatDate(r.created_at)}
            </p>
          </div>
          <svg className={cn("w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150", expanded && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      <div className="px-4 pb-3.5">
        <p className="text-sm text-slate-600">{r.summary}</p>

        {expanded && (
          <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Reasoning</p>
            <p className="text-xs text-slate-600 whitespace-pre-wrap">{r.reasoning}</p>
            {r.evidence && r.evidence.length > 0 && (
              <>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium pt-1">Supporting intelligence</p>
                <ul className="space-y-1">
                  {r.evidence.map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="font-medium text-slate-600">{e.label}: </span>
                        {e.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="pt-1">
              <ConfidenceBadge level={r.confidence >= 80 ? "high" : r.confidence >= 50 ? "medium" : "low"} confidence={r.confidence} />
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onToggle}>
            {expanded ? "Hide evidence" : "View evidence"}
          </Button>
          {r.status === "new" && (
            <Button size="sm" variant="ghost" onClick={() => onStatusChange(r.id, "reviewed")}>
              Mark Reviewed
            </Button>
          )}
          {r.status === "reviewed" && (
            <Button size="sm" variant="ghost" onClick={() => onStatusChange(r.id, "completed")}>
              Mark Completed
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => onStatusChange(r.id, "dismissed")}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}