"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { scoreProspect, getStoredScore } from "../scoring/actions";
import type { ProspectScore, ScoreOperationResult, ScoringFactor } from "../scoring/types";

// ============================================================================
// Score Section
// Stage 4 — Phase 6: Smart Lead & ICP Scoring
// ============================================================================
// Displays the explainable ICP score for a prospect and provides the explicit
// "Score Prospect" action. Never runs scoring on page load — only on an
// explicit user action. Cached scores are displayed without re-scoring.
// ============================================================================

interface ScoreSectionProps {
  prospectId: string;
}

export function ScoreSection({ prospectId }: ScoreSectionProps) {
  const [score, setScore] = useState<ProspectScore | null>(null);
  const [operation, setOperation] = useState<ScoreOperationResult | null>(null);
  const [isLoadingCached, setIsLoadingCached] = useState(true);
  const [isScoring, setIsScoring] = useState(false);

  // Load cached score on mount — does NOT re-score.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingCached(true);
    setScore(null);
    setOperation(null);

    getStoredScore(prospectId)
      .then((stored: ProspectScore | null) => {
        if (!cancelled) setScore(stored);
      })
      .catch(() => {
        // Ignore — cached score is best-effort.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCached(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prospectId]);

  // Explicit "Score Prospect" action.
  // One user action produces one scoring operation. Prevent duplicates.
  const handleScore = useCallback(
    async (refresh = false) => {
      if (isScoring) return;
      setIsScoring(true);
      setOperation(null);
      try {
        const result = await scoreProspect(prospectId, { refresh });
        setOperation(result);
        if (result.status === "completed" && result.score) {
          setScore(result.score);
        }
      } catch {
        setOperation({
          status: "failed",
          message: "An unexpected error occurred during scoring.",
          score: null,
        });
      } finally {
        setIsScoring(false);
      }
    },
    [prospectId, isScoring]
  );

  const hasScore = score ?? operation?.score ?? null;
  const hasError = operation?.status === "failed";

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => handleScore(false)}
          loading={isScoring}
          disabled={isScoring || isLoadingCached}
        >
          {isScoring ? "Calculating..." : hasScore ? "Score again" : "Score Prospect"}
        </Button>
        {hasScore && !isScoring && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleScore(true)}
            disabled={isScoring}
          >
            Refresh
          </Button>
        )}
      </div>

      {/* Loading cached score */}
      {isLoadingCached && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )}

      {/* Loading scoring operation */}
      {isScoring && (
        <p className="text-sm text-slate-500">
          Calculating fit score... this may take a moment.
        </p>
      )}

      {/* Error State */}
      {hasError && !isScoring && !hasScore && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {operation?.message || "Scoring failed."}
        </div>
      )}

      {/* Completed Score */}
      {hasScore && !isScoring && (
        <ScoreResultView score={hasScore} />
      )}

      {/* Nothing scored yet */}
      {!isLoadingCached && !isScoring && !hasScore && !hasError && (
        <p className="text-sm text-slate-400">
          Score this prospect to see how well it matches your Ideal Customer Profile.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Score Result View
// ============================================================================

function ScoreResultView({ score }: { score: ProspectScore }) {
  const categoryStyles: Record<string, string> = {
    excellent: "bg-emerald-50 text-emerald-700 border-emerald-200",
    strong: "bg-blue-50 text-blue-700 border-blue-200",
    moderate: "bg-amber-50 text-amber-700 border-amber-200",
    weak: "bg-orange-50 text-orange-700 border-orange-200",
    poor: "bg-red-50 text-red-700 border-red-200",
  };

  const categoryLabels: Record<string, string> = {
    excellent: "Excellent fit",
    strong: "Strong fit",
    moderate: "Moderate fit",
    weak: "Weak fit",
    poor: "Poor fit",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3">
      {/* Score Summary */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-bold text-slate-900">{score.score}/100</p>
          <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", categoryStyles[score.category])}>
            {categoryLabels[score.category]}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Data confidence</p>
          <p className="text-sm font-semibold text-slate-700">{score.confidence}%</p>
        </div>
      </div>

      {/* Company vs Prospect */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="text-slate-400">Company fit</p>
          <p className="text-sm font-semibold text-slate-700">{score.company_score}/100</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="text-slate-400">Prospect fit</p>
          <p className="text-sm font-semibold text-slate-700">{score.prospect_score}/100</p>
        </div>
      </div>

      {/* Factors */}
      {score.factors && score.factors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Why</p>
          {score.factors.map((factor, idx) => (
            <FactorRow key={idx} factor={factor} />
          ))}
        </div>
      )}

      {/* Metadata */}
      <p className="text-xs text-slate-400">
        Scoring version: {score.scoring_version}
        {score.scored_at && ` · Scored: ${formatDate(score.scored_at)}`}
      </p>
    </div>
  );
}

function FactorRow({ factor }: { factor: ScoringFactor }) {
  const statusStyles: Record<string, string> = {
    match: "bg-emerald-500",
    mismatch: "bg-red-500",
    unknown: "bg-slate-300",
  };

  return (
    <div className="flex items-start gap-2">
      <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", statusStyles[factor.status])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">{factor.name}</p>
          <span className="text-xs text-slate-400 shrink-0">
            {factor.score}/{factor.maxScore}
          </span>
        </div>
        <p className="text-xs text-slate-500">{factor.reason}</p>
        {factor.evidence && (
          <p className="text-xs text-slate-400 mt-0.5">Evidence: {factor.evidence}</p>
        )}
      </div>
    </div>
  );
}