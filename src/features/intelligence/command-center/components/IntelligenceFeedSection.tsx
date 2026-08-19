// ============================================================================
// Prosventa Intelligence Command Center — Intelligence Feed Section
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
import type { FeedItem } from "../types";

interface IntelligenceFeedSectionProps {
  status: "loading" | "success" | "error";
  data: FeedItem[] | null;
  onRetry: () => void;
}

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getImportanceVariant(importance: FeedItem["importance"]): "danger" | "warning" | "default" | "neutral" {
  switch (importance) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "default";
    default:
      return "neutral";
  }
}

function getTypeIcon(type: FeedItem["type"]): React.ReactNode {
  switch (type) {
    case "signal":
      return <DashboardIcon name="sparkles" size={14} />;
    case "recommendation":
      return <DashboardIcon name="sparkles" size={14} />;
    case "workflow":
      return <DashboardIcon name="automation" size={14} />;
    case "score":
      return <DashboardIcon name="target" size={14} />;
  }
}

export function IntelligenceFeedSection({ status, data, onRetry }: IntelligenceFeedSectionProps) {
  if (status === "loading") {
    return (
      <Card>
        <CardHeader title="Intelligence Feed" description="Recent important events" />
        <div className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader title="Intelligence Feed" description="Recent important events" />
        <div className="p-6">
          <Alert variant="error" title="Intelligence feed unavailable" onRetry={onRetry}>
            We couldn{"'"}t load recent intelligence events.
          </Alert>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader title="Intelligence Feed" description="Recent important events" />
        <EmptyState
          title="No recent intelligence signals"
          description="Signals, recommendations, and workflow activity will appear here as they are detected."
          icon={<DashboardIcon name="sparkles" size={20} />}
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Intelligence Feed" description="Recent important events" />
      <div className="p-6 space-y-1">
        {data.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-500 shrink-0">
              {getTypeIcon(item.type)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                <Badge variant={getImportanceVariant(item.importance)} className="shrink-0">
                  {item.importance}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                <span>{formatTime(item.occurredAt)}</span>
                {item.entityName && (
                  <>
                    <span aria-hidden="true">·</span>
                    <Link
                      href={item.prospectId ? `/dashboard/prospects?prospect=${item.prospectId}` : "#"}
                      className="hover:text-slate-600 hover:underline"
                    >
                      {item.entityName}
                    </Link>
                  </>
                )}
                {item.confidence && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Confidence {item.confidence}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}