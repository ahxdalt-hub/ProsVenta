"use client";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { getScoreCategoryLabel, type ProspectScore, type ScoringFactor } from "../../scoring/types";
import { WorkspaceSectionHeader } from "./sections";

export function ScoreTab({
  score,
  isProcessing,
  onScore,
}: {
  score: ProspectScore | null;
  isProcessing: boolean;
  onScore: () => void;
}) {
  return (
    <div className="space-y-6">
      <WorkspaceSectionHeader
        title="ICP Score"
        description="How well this prospect matches your Ideal Customer Profile — and why."
        action={
          <Button size="sm" onClick={onScore} loading={isProcessing} disabled={isProcessing}>
            {isProcessing ? "Scoring..." : score ? "Score again" : "Score Prospect"}
          </Button>
        }
      />

      {!score && !isProcessing && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center">
          <p className="text-sm font-medium text-slate-600">No ICP score yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Score this prospect to see how well it matches your ideal customer profile and why.
          </p>
        </div>
      )}

      {score && <ScoreBreakdown score={score} />}
    </div>
  );
}

function ScoreBreakdown({ score }: { score: ProspectScore }) {
  const categoryTone: Record<string, string> = {
    excellent: "text-emerald-700",
    strong: "text-blue-700",
    moderate: "text-amber-700",
    weak: "text-orange-700",
    poor: "text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Overall */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Overall score</p>
            <p className={cn("mt-1 text-3xl font-bold tracking-tight", categoryTone[score.category] ?? "text-slate-900")}>
              {score.score}
              <span className="text-base font-medium text-slate-400">/100</span>
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600">{getScoreCategoryLabel(score.category)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-2">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Company fit</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-800">{score.company_score}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-2">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Prospect fit</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-800">{score.prospect_score}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>Data confidence: <span className="font-medium text-slate-600">{score.confidence}%</span></span>
          <span>Version: {score.scoring_version}</span>
          {score.scored_at && <span>Scored: {formatDate(score.scored_at)}</span>}
        </div>
      </div>

      {/* Factors */}
      {score.factors.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Why this score</p>
          <div className="space-y-2">
            {score.factors.map((factor, idx) => (
              <FactorRow key={idx} factor={factor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FactorRow({ factor }: { factor: ScoringFactor }) {
  const statusTone: Record<string, string> = {
    match: "bg-emerald-500",
    mismatch: "bg-red-500",
    unknown: "bg-slate-300",
  };
  const scoreTone = factor.score >= factor.maxScore ? "text-emerald-600" : factor.score <= 0 ? "text-red-500" : "text-slate-700";

  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/40 px-3 py-2.5">
      <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", statusTone[factor.status])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-800">{factor.name}</p>
          <span className={cn("text-xs font-semibold shrink-0", scoreTone)}>
            {factor.score}/{factor.maxScore}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{factor.reason}</p>
        {factor.evidence && <p className="text-xs text-slate-400 mt-0.5">Evidence: {factor.evidence}</p>}
      </div>
    </div>
  );
}