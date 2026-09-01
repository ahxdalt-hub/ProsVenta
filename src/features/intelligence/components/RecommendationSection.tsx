"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  generateRecommendations,
  getStoredRecommendations,
  updateRecommendationStatusAction,
} from "../recommendations/actions";
import {
  RECOMMENDATION_PRIORITY_LABELS,
  RECOMMENDATION_TYPE_LABELS,
  type RecommendationOperationResult,
  type RecommendationRecord,
  type RecommendationStatus,
} from "../recommendations/types";

// ============================================================================
// Recommended Actions Section
// Stage 4 — Phase 8: Intelligence Recommendations
// ============================================================================
// Displays evidence-based recommendations for a prospect. Uses cached
// recommendations on page load — never regenerates automatically. The user
// explicitly triggers generation. Buttons (Mark Reviewed, Dismiss, View
// Evidence) work and update the recommendation status server-side.
// ============================================================================

interface RecommendationSectionProps {
  prospectId: string;
}

export function RecommendationSection({ prospectId }: RecommendationSectionProps) {
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([]);
  const [operation, setOperation] = useState<RecommendationOperationResult | null>(null);
  const [isLoadingCached, setIsLoadingCached] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load cached recommendations on mount — does NOT regenerate.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingCached(true);
    setRecommendations([]);
    setOperation(null);

    getStoredRecommendations(prospectId)
      .then((stored: RecommendationRecord[]) => {
        if (!cancelled) setRecommendations(stored);
      })
      .catch(() => {
        // Ignore — cached recommendations are best-effort.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCached(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prospectId]);

  // Explicit "Generate Recommendations" action.
  // One user action produces one generation operation. Prevent duplicates.
  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setOperation(null);
    try {
      const result = await generateRecommendations(prospectId);
      setOperation(result);
      // Refresh the stored recommendations after generation.
      const stored = await getStoredRecommendations(prospectId);
      setRecommendations(stored);
    } catch {
      setOperation({
        status: "failed",
        message: "An unexpected error occurred during recommendation generation.",
        created: 0,
        duplicates: 0,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [prospectId, isGenerating]);

  const handleStatusChange = useCallback(
    async (recommendationId: string, status: RecommendationStatus) => {
      const ok = await updateRecommendationStatusAction(recommendationId, status);
      if (ok) {
        setRecommendations((prev) =>
          status === "dismissed"
            ? prev.filter((r) => r.id !== recommendationId)
            : prev.map((r) => (r.id === recommendationId ? { ...r, status } : r))
        );
      }
    },
    []
  );

  const hasError = operation?.status === "failed";

  return (
    <div className="space-y-3">
      {/* Action Button */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleGenerate}
          loading={isGenerating}
          disabled={isGenerating || isLoadingCached}
        >
          {isGenerating ? "Generating..." : recommendations.length > 0 ? "Regenerate" : "Generate Recommendations"}
        </Button>
      </div>

      {/* Loading cached recommendations */}
      {isLoadingCached && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {/* Loading generation operation */}
      {isGenerating && (
        <p className="text-sm text-slate-500">
          Generating recommendations... this may take a moment.
        </p>
      )}

      {/* Error State */}
      {hasError && !isGenerating && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {operation?.message || "Recommendation generation failed."}
        </div>
      )}

      {/* Operation message (success) */}
      {operation?.status === "completed" && !isGenerating && (
        <p className="text-sm text-slate-500">
          {operation.message}
          {operation.duplicates > 0 && ` (${operation.duplicates} duplicate${operation.duplicates === 1 ? "" : "s"} skipped)`}
        </p>
      )}

      {/* Empty State */}
      {!isLoadingCached && !isGenerating && recommendations.length === 0 && !hasError && (
        <p className="text-sm text-slate-400">
          No action is currently recommended for this prospect. Recommendations are
          prioritized for stronger ICP matches, and more information may be needed
          before Prosventa can suggest a useful next step.
        </p>
      )}

      {/* Recommendation List */}
      {recommendations.length > 0 && !isGenerating && (
        <div className="space-y-2">
          {recommendations.map((recommendation) => (
            <motion.div
              key={recommendation.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <RecommendationCard
                recommendation={recommendation}
                expanded={expandedId === recommendation.id}
                onToggle={() => setExpandedId(expandedId === recommendation.id ? null : recommendation.id)}
                onReviewed={() => handleStatusChange(recommendation.id, "reviewed")}
                onDismissed={() => handleStatusChange(recommendation.id, "dismissed")}
                onCompleted={() => handleStatusChange(recommendation.id, "completed")}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Recommendation Card
// ============================================================================

function RecommendationCard({
  recommendation,
  expanded,
  onToggle,
  onReviewed,
  onDismissed,
  onCompleted,
}: {
  recommendation: RecommendationRecord;
  expanded: boolean;
  onToggle: () => void;
  onReviewed: () => void;
  onDismissed: () => void;
  onCompleted: () => void;
}) {
  const priorityStyles: Record<string, string> = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-slate-50 text-slate-600 border-slate-200",
  };

  const statusLabel = recommendation.status.charAt(0).toUpperCase() + recommendation.status.slice(1);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={onToggle}
          className="flex-1 text-left focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", priorityStyles[recommendation.priority])}>
              {RECOMMENDATION_PRIORITY_LABELS[recommendation.priority]}
            </span>
            {recommendation.status !== "new" && (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {statusLabel}
              </span>
            )}
            <span className="text-sm font-semibold text-slate-900">{recommendation.title}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {RECOMMENDATION_TYPE_LABELS[recommendation.recommendation_type]} · Confidence: {recommendation.confidence}
          </p>
        </button>
        <button
          onClick={onDismissed}
          className="text-slate-300 hover:text-red-500 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded shrink-0"
          aria-label="Dismiss recommendation"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Summary */}
      <p className="text-sm text-slate-600">{recommendation.summary}</p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onToggle}>
          {expanded ? "Hide Evidence" : "View Evidence"}
        </Button>
        {recommendation.status === "new" && (
          <Button size="sm" variant="ghost" onClick={onReviewed}>
            Mark Reviewed
          </Button>
        )}
        {recommendation.status === "reviewed" && (
          <Button size="sm" variant="ghost" onClick={onCompleted}>
            Mark Completed
          </Button>
        )}
      </div>

      {/* Expanded Evidence Panel */}
      {expanded && (
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-3">
          {/* Why Prosventa recommends this */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Why Prosventa recommends this</p>
            <p className="text-sm text-slate-700 mt-1">{recommendation.reasoning}</p>
          </div>

          {/* Evidence */}
          {recommendation.evidence.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Evidence</p>
              <ul className="mt-1 space-y-1.5">
                {recommendation.evidence.map((item, idx) => (
                  <li key={idx} className="text-sm text-slate-600">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    {item.detail && <span className="text-slate-500"> — {item.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sources */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>Priority: {RECOMMENDATION_PRIORITY_LABELS[recommendation.priority]}</span>
            <span>Confidence: {recommendation.confidence}</span>
            {recommendation.source_signal_ids.length > 0 && (
              <span>{recommendation.source_signal_ids.length} related signal(s)</span>
            )}
            {recommendation.source_research_ids.length > 0 && (
              <span>{recommendation.source_research_ids.length} related research record(s)</span>
            )}
            {recommendation.created_at && (
              <span>Generated: {formatDate(recommendation.created_at)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}