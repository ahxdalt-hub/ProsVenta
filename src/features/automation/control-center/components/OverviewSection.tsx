// ============================================================================
// Prosventa Automation Control Center — Overview Section
// ============================================================================
// Real metrics only. Each card links to the live view behind the number —
// no invented success rates, fake durations, or placeholder activity.
// ============================================================================

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { ControlCenterOverview } from "@/lib/db/automation-control-center";
import { relativeTime } from "../labels";

function statusBadgeVariant(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "paused") return "warning" as const;
  return "neutral" as const;
}

export function OverviewSection({ overview }: { overview: ControlCenterOverview }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Running", value: overview.runningCount, href: "?tab=running" },
          { label: "Needs attention", value: overview.attentionCount, href: "?tab=attention" },
          {
            label: "Completed today",
            value: overview.completedTodayCount,
            href: "?tab=history&status=completed&range=today",
          },
          { label: "Active Playbooks", value: overview.activePlaybookCount, href: "?tab=playbooks" },
        ].map((card) => (
          <Link
            key={card.label}
            href={`/dashboard/automation/control-center${card.href}`}
            className="premium-card block p-5 transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</p>
          </Link>
        ))}
      </div>

      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="text-sm font-semibold text-slate-900">Recent activity</h2>
        {overview.recent.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No automation activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {overview.recent.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/dashboard/automation/executions/${e.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm transition hover:bg-slate-50/80 focus-visible:bg-slate-50 focus-visible:outline-none"
                >
                  <span className="font-medium text-slate-900">{e.playbook_name ?? "Automation"}</span>
                  <span className="text-slate-400">·</span>
                  <span className="truncate text-slate-500">{e.prospect_name ?? "No linked prospect"}</span>
                  <span className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                    <Badge variant={statusBadgeVariant(e.status)}>
                      {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                    </Badge>
                    {relativeTime(e.completed_at ?? e.started_at ?? e.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
