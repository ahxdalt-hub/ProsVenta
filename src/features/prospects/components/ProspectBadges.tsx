"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { ProspectStatus, ProspectPriority } from "@/types/database";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  STATUS_DOT_STYLES,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  PRIORITY_DOT_STYLES,
  getTagColor,
} from "./status-config";
import type { ScoreCategory } from "@/features/intelligence/scoring/types";
import {
  RECOMMENDATION_TYPE_LABELS,
  type RecommendationType,
} from "@/features/intelligence/recommendations/types";
import type { ProspectRecommendationHint } from "@/features/prospects/types/prospect";

// ============================================================================
// ICP Score Badge — Stage 5
// ============================================================================
// Displays the real stored ICP score with its fit category. Unscored
// prospects show "Not scored" (never a fabricated 0).
// ============================================================================

const ICP_CATEGORY_STYLES: Record<ScoreCategory, string> = {
  excellent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  strong: "bg-blue-50 text-blue-700 border-blue-200",
  moderate: "bg-amber-50 text-amber-700 border-amber-200",
  weak: "bg-orange-50 text-orange-700 border-orange-200",
  poor: "bg-red-50 text-red-700 border-red-200",
};

const ICP_CATEGORY_LABELS: Record<ScoreCategory, string> = {
  excellent: "Excellent fit",
  strong: "Strong fit",
  moderate: "Moderate fit",
  weak: "Weak fit",
  poor: "Poor fit",
};

interface IcpScoreBadgeProps {
  score?: number | null;
  category?: ScoreCategory | null;
  /**
   * Automatic processing state from intelligence_jobs:
   *  - "calculating" → job pending/processing (no fake score shown)
   *  - "failed" → last attempt failed; user can retry
   * Absent → prospect simply has no score yet ("Not scored").
   */
  state?: "calculating" | "failed" | null;
  size?: "sm" | "md";
  className?: string;
  onRetry?: () => void;
}

export const IcpScoreBadge = memo(function IcpScoreBadge({
  score,
  category,
  state,
  size = "sm",
  className,
  onRetry,
}: IcpScoreBadgeProps) {
  if ((score === null || score === undefined || !category) && state === "calculating") {
    return (
      <span
        role="status"
        aria-label="Calculating ICP score"
        title="Your ICP score is being calculated. It will appear here automatically."
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap text-amber-700 bg-amber-50 border-amber-200",
          size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
          className
        )}
      >
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        Calculating…
      </span>
    );
  }

  if ((score === null || score === undefined || !category) && state === "failed") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap text-red-600 bg-red-50 border-red-200",
          size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
          className
        )}
      >
        <span title="Intelligence is unavailable for this prospect right now.">
          Intelligence unavailable
        </span>
        {onRetry && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            className="ml-0.5 underline underline-offset-2 hover:text-red-800 transition-colors duration-150"
            aria-label="Retry intelligence processing"
          >
            Retry
          </button>
        )}
      </span>
    );
  }

  if (score === null || score === undefined || !category) {
    return (
      <span
        title="Not scored — this prospect has not been evaluated against your ICP configuration yet."
        className={cn(
          "inline-flex items-center rounded-full border font-medium whitespace-nowrap text-slate-400 bg-slate-50 border-slate-200",
          size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
          className
        )}
      >
        Not scored
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-label={`ICP Score: ${score}. ${ICP_CATEGORY_LABELS[category]}. Based on your workspace ICP criteria.`}
      title={`ICP Score: ${score}\n${ICP_CATEGORY_LABELS[category]}\nBased on your workspace ICP criteria.`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap tabular-nums",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        ICP_CATEGORY_STYLES[category],
        className
      )}
    >
      {score}
      <span className="font-medium opacity-80">{ICP_CATEGORY_LABELS[category]}</span>
    </span>
  );
});

// ============================================================================
// Recommendation Indicator — Stage 5 Task 3
// ============================================================================
// Compact, subtle indicator that a prospect has active recommendations.
// Uses the real recommendation type labels; hidden entirely when none exist.
// ============================================================================

const RECOMMENDATION_PRIORITY_STYLES: Record<"high" | "medium" | "low", string> = {
  high: "text-violet-700 bg-violet-50 border-violet-200",
  medium: "text-slate-600 bg-slate-50 border-slate-200",
  low: "text-slate-500 bg-slate-50 border-slate-200",
};

interface RecommendationIndicatorProps {
  recommendations?: ProspectRecommendationHint[] | null;
  className?: string;
}

export const RecommendationIndicator = memo(function RecommendationIndicator({
  recommendations,
  className,
}: RecommendationIndicatorProps) {
  if (!recommendations || recommendations.length === 0) return null;

  const count = recommendations.length;
  const latestTypeLabel =
    RECOMMENDATION_TYPE_LABELS[recommendations[0].recommendation_type as RecommendationType] ??
    "Review recommendation";
  const tooltip =
    count === 1
      ? `1 active recommendation: ${latestTypeLabel}`
      : `${count} active recommendations. Latest: ${latestTypeLabel}`;
  const priorityStyle =
    RECOMMENDATION_PRIORITY_STYLES[
      recommendations.some((r) => r.priority === "high") ? "high" : recommendations.some((r) => r.priority === "medium") ? "medium" : "low"
    ];

  return (
    <span
      role="status"
      aria-label={tooltip}
      title={tooltip}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-150",
        priorityStyle,
        className
      )}
    >
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
      {count}
    </span>
  );
});

interface StatusBadgeProps {
  status: ProspectStatus;
  size?: "sm" | "md";
  className?: string;
}

export const StatusBadge = memo(function StatusBadge({
  status,
  size = "sm",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        STATUS_STYLES[status],
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT_STYLES[status])} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
});

interface PriorityBadgeProps {
  priority: ProspectPriority;
  size?: "sm" | "md";
  className?: string;
}

export const PriorityBadge = memo(function PriorityBadge({
  priority,
  size = "sm",
  className,
}: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        PRIORITY_STYLES[priority],
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT_STYLES[priority])} aria-hidden="true" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
});

interface TagBadgeProps {
  tag: string;
  className?: string;
}

export const TagBadge = memo(function TagBadge({ tag, className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        getTagColor(tag),
        className
      )}
    >
      {tag}
    </span>
  );
});