// ============================================================================
// Prosventa Intelligence Command Center — Intelligence Health Section
// Stage 4 — Phase 10: Intelligence Command Center
// ============================================================================

"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import type { IntelligenceHealth } from "../types";

interface HealthSectionProps {
  status: "loading" | "success" | "error";
  data: IntelligenceHealth | null;
  onRetry: () => void;
}

interface HealthItemProps {
  count: number;
  label: string;
  icon: React.ReactNode;
}

function HealthItem({ count, label, icon }: HealthItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-500 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900">{count}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export function HealthSection({ status, data, onRetry }: HealthSectionProps) {
  if (status === "loading") {
    return (
      <Card>
        <CardHeader title="Intelligence Health" description="Data quality indicators" />
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-100 px-4 py-3">
              <Skeleton className="h-6 w-8" />
              <Skeleton className="mt-1 h-3 w-32" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader title="Intelligence Health" description="Data quality indicators" />
        <div className="p-6">
          <Alert variant="error" title="Intelligence health unavailable" onRetry={onRetry}>
            We couldn{"'"}t load data quality indicators.
          </Alert>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader title="Intelligence Health" description="Data quality indicators" />
        <EmptyState
          title="Health data unavailable"
          description="Data quality indicators could not be loaded."
          icon={<DashboardIcon name="sparkles" size={20} />}
        />
      </Card>
    );
  }

  const totalIssues =
    data.staleEnrichment + data.missingJobTitles + data.missingIndustry + data.lowConfidenceIntelligence;

  if (totalIssues === 0) {
    return (
      <Card>
        <CardHeader title="Intelligence Health" description="Data quality indicators" />
        <EmptyState
          title="No stale intelligence detected"
          description="Your prospect data is up to date. Great job keeping intelligence fresh."
          icon={<DashboardIcon name="sparkles" size={20} />}
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Intelligence Health" description="Data quality indicators" />
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthItem
          count={data.staleEnrichment}
          label="Prospects with stale enrichment"
          icon={<DashboardIcon name="refresh" size={16} />}
        />
        <HealthItem
          count={data.missingJobTitles}
          label="Prospects missing contact role"
          icon={<DashboardIcon name="user" size={16} />}
        />
        <HealthItem
          count={data.missingIndustry}
          label="Companies missing industry"
          icon={<DashboardIcon name="organization" size={16} />}
        />
        <HealthItem
          count={data.lowConfidenceIntelligence}
          label="Prospects with low-confidence signals"
          icon={<DashboardIcon name="sparkles" size={16} />}
        />
      </div>
    </Card>
  );
}