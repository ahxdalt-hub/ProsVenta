// ============================================================================
// Prosventa Intelligence Command Center — Priority Prospects Section
// Stage 4 — Phase 10: Intelligence Command Center
// ============================================================================

"use client";

import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import type { PriorityProspect } from "../types";

interface PriorityProspectsSectionProps {
  status: "loading" | "success" | "error";
  data: PriorityProspect[] | null;
  onRetry: () => void;
}

function formatFreshness(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
  return "Stale";
}

export function PriorityProspectsSection({ status, data, onRetry }: PriorityProspectsSectionProps) {
  if (status === "loading") {
    return (
      <Card>
        <CardHeader title="Priority Prospects" description="Who deserves attention" />
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader title="Priority Prospects" description="Who deserves attention" />
        <div className="p-6">
          <Alert variant="error" title="Priority prospects unavailable" onRetry={onRetry}>
            We couldn{"'"}t load priority prospects right now.
          </Alert>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader title="Priority Prospects" description="Who deserves attention" />
        <EmptyState
          title="No high-priority prospects yet"
          description="Prospects with high ICP fit, recent signals, or pending recommendations will appear here."
          icon={<DashboardIcon name="target" size={20} />}
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Priority Prospects" description="Who deserves attention" />
      <div className="p-6 space-y-4">
        {data.map((prospect) => (
          <div
            key={prospect.prospectId}
            className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 p-4 hover:border-slate-200 hover:bg-slate-50/50 transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-900 truncate">
                  {prospect.name}
                </h4>
                {prospect.icpScore !== null && (
                  <Badge variant={prospect.icpScore >= 75 ? "success" : "default"}>
                    {prospect.icpScore} fit
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {prospect.companyName}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {prospect.reasons.map((reason, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    {reason.type === "recent_signal" && (
                      <DashboardIcon name="sparkles" size={10} />
                    )}
                    {reason.type === "high_fit" && (
                      <DashboardIcon name="target" size={10} />
                    )}
                    {reason.type === "recommendation_pending" && (
                      <DashboardIcon name="sparkles" size={10} />
                    )}
                    {reason.type === "recently_updated" && (
                      <DashboardIcon name="refresh" size={10} />
                    )}
                    {reason.label}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Updated {formatFreshness(prospect.updatedAt)}
              </p>
            </div>
            <Link
              href={`/dashboard/prospects?prospect=${prospect.prospectId}`}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              View
              <DashboardIcon name="chevron-down" size={12} className="rotate-[-90deg]" />
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}