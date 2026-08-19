// ============================================================================
// Prosventa Intelligence Command Center — Summary Section
// Stage 4 — Phase 10: Intelligence Command Center
// ============================================================================

"use client";

import { StatCard } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import type { CommandCenterSummary } from "../types";

interface SummarySectionProps {
  status: "loading" | "success" | "error";
  data: CommandCenterSummary | null;
  onRetry: () => void;
}

export function SummarySection({ status, data, onRetry }: SummarySectionProps) {
  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="premium-card p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <Alert variant="error" title="Intelligence summary unavailable" onRetry={onRetry}>
        We couldn{"'"}t load your intelligence summary. Other sections may still be available.
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        title="High-fit prospects"
        value={data.highFitProspects}
        icon={<DashboardIcon name="target" size={16} />}
        description="ICP score ≥ 75"
      />
      <StatCard
        title="High-priority signals"
        value={data.recentHighPrioritySignals}
        icon={<DashboardIcon name="sparkles" size={16} />}
        description="Last 7 days"
      />
      <StatCard
        title="Pending recommendations"
        value={data.pendingRecommendations}
        icon={<DashboardIcon name="sparkles" size={16} />}
        description="Awaiting review"
      />
      <StatCard
        title="Active workflows"
        value={data.activeWorkflows}
        icon={<DashboardIcon name="automation" size={16} />}
        description="Currently running"
      />
      <StatCard
        title="Recently changed"
        value={data.recentlyChangedProspects}
        icon={<DashboardIcon name="refresh" size={16} />}
        description="Last 7 days"
      />
    </div>
  );
}