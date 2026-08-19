// ============================================================================
// Prosventa Intelligence Command Center — Recommended Actions Section
// Stage 4 — Phase 10: Intelligence Command Center
// ============================================================================

"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import { updateRecommendationStatusAction } from "@/features/intelligence/recommendations/actions";
import { RECOMMENDATION_PRIORITY_LABELS } from "@/features/intelligence/recommendations/types";
import type { RecommendedAction } from "../types";

interface RecommendedActionsSectionProps {
  status: "loading" | "success" | "error";
  data: RecommendedAction[] | null;
  onRetry: () => void;
}

function getPriorityVariant(priority: "high" | "medium" | "low"): "danger" | "warning" | "neutral" {
  switch (priority) {
    case "high":
      return "danger";
    case "medium":
      return "warning";
    default:
      return "neutral";
  }
}

export function RecommendedActionsSection({ status, data, onRetry }: RecommendedActionsSectionProps) {
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <Card>
        <CardHeader title="Recommended Actions" description="What to consider next" />
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader title="Recommended Actions" description="What to consider next" />
        <div className="p-6">
          <Alert variant="error" title="Recommendations unavailable" onRetry={onRetry}>
            We couldn{"'"}t load pending recommendations.
          </Alert>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader title="Recommended Actions" description="What to consider next" />
        <EmptyState
          title="No pending recommendations"
          description="New recommendations will appear here when intelligence identifies an opportunity."
          icon={<DashboardIcon name="sparkles" size={20} />}
        />
      </Card>
    );
  }

  const visible = data.filter((item) => !updatedIds.has(item.recommendation.id));

  if (visible.length === 0) {
    return (
      <Card>
        <CardHeader title="Recommended Actions" description="What to consider next" />
        <EmptyState
          title="All caught up"
          description="You've reviewed or dismissed all pending recommendations."
          icon={<DashboardIcon name="sparkles" size={20} />}
        />
      </Card>
    );
  }

  async function handleStatusChange(recommendationId: string, status: "reviewed" | "dismissed") {
    try {
      const ok = await updateRecommendationStatusAction(recommendationId, status);
      if (ok) {
        setUpdatedIds((prev) => new Set(prev).add(recommendationId));
        setError(null);
      } else {
        setError("Could not update recommendation. Please try again.");
      }
    } catch {
      setError("Could not update recommendation. Please try again.");
    }
  }

  return (
    <Card>
      <CardHeader title="Recommended Actions" description="What to consider next" />
      <div className="p-6 space-y-4">
        {error && (
          <Alert variant="error" onRetry={() => setError(null)}>
            {error}
          </Alert>
        )}
        {visible.map(({ recommendation }) => (
          <div
            key={recommendation.id}
            className="rounded-lg border border-slate-100 p-4 hover:border-slate-200 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant={getPriorityVariant(recommendation.priority)}>
                {RECOMMENDATION_PRIORITY_LABELS[recommendation.priority].toUpperCase()}
              </Badge>
              <span className="text-[11px] text-slate-400">
                Confidence {recommendation.confidence}%
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {recommendation.title}
            </p>
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">
              {recommendation.reasoning}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={
                  recommendation.prospect_id
                    ? `/dashboard/prospects?prospect=${recommendation.prospect_id}`
                    : "/dashboard/prospects"
                }
                className="inline-flex items-center rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 transition-colors"
              >
                View
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStatusChange(recommendation.id, "reviewed")}
              >
                Mark Reviewed
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange(recommendation.id, "dismissed")}
              >
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}