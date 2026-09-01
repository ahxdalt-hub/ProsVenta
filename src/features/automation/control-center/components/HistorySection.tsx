// ============================================================================
// Prosventa Automation Control Center — History List (grouped by day)
// ============================================================================

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { HistoryResult } from "@/lib/db/automation-control-center";
import { relativeTime } from "../labels";

function statusBadgeVariant(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "paused") return "warning" as const;
  return "neutral" as const;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d >= today) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d >= yesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export function HistorySection({ history }: { history: HistoryResult }) {
  // Group consecutive rows into day buckets for a readable history.
  const groups: Array<{ label: string; items: HistoryResult["executions"] }> = [];
  for (const e of history.executions) {
    const label = dayLabel(e.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {group.label}
          </h3>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {group.items.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/dashboard/automation/executions/${e.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm transition hover:bg-slate-50/80 focus-visible:bg-slate-50 focus-visible:outline-none"
                >
                  <span className="font-medium text-slate-900">{e.playbook_name ?? "Automation"}</span>
                  {e.playbook_version !== null && (
                    <span className="text-xs text-slate-400">v{e.playbook_version}</span>
                  )}
                  <span className="text-slate-400">·</span>
                  <span className="truncate text-slate-500">{e.prospect_name ?? "No linked prospect"}</span>
                  <span className="ml-auto flex items-center gap-3 text-xs text-slate-400">
                    <Badge variant={statusBadgeVariant(e.status)}>
                      {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                    </Badge>
                    {relativeTime(e.completed_at ?? e.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
