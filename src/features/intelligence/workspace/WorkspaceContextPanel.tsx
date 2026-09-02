// ============================================================================
// Prosventa Intelligence Workspace — Workspace Context Panel
// ============================================================================
// Phase 1: secondary right-hand column. Shows only real workspace context
// (prospect/list counts, ICP status). Deliberately left sparse where future
// intelligence context (segments, saved views, breakdowns) will live — no
// filler cards.
// ============================================================================

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";

interface ContextRow {
  label: string;
  value?: string;
  badge?: { text: string; variant: "success" | "neutral" };
}

interface WorkspaceContextPanelProps {
  prospectCount: number;
  savedListCount: number;
  hasIcp: boolean;
  footer?: ReactNode;
}

function Row({ row }: { row: ContextRow }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <span className="text-sm text-slate-500">{row.label}</span>
      {row.badge ? (
        <Badge variant={row.badge.variant}>{row.badge.text}</Badge>
      ) : (
        <span className="text-sm font-semibold text-slate-900">{row.value}</span>
      )}
    </div>
  );
}

export function WorkspaceContextPanel({
  prospectCount,
  savedListCount,
  hasIcp,
}: WorkspaceContextPanelProps) {
  const rows: ContextRow[] = [
    { label: "Prospects", value: String(prospectCount) },
    { label: "Saved lists", value: String(savedListCount) },
    {
      label: "ICP configuration",
      badge: hasIcp
        ? { text: "Configured", variant: "success" as const }
        : { text: "Not set up", variant: "neutral" as const },
    },
  ];

  return (
    <aside aria-labelledby="context-heading" className="min-w-0">
      <h2 id="context-heading" className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Workspace context
      </h2>
      <div className="premium-card divide-y divide-slate-100 overflow-hidden">
        {rows.map((row) => (
          <Row key={row.label} row={row} />
        ))}
      </div>

      {/* Intelligence quality depends on ICP — prompt setup when missing. */}
      {!hasIcp && (
        <div className="premium-card mt-4 p-5">
          <p className="text-sm font-semibold text-slate-900">Set up your ICP</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Priorities and fit scores get sharper once your Ideal Customer Profile
            is configured.
          </p>
          <Link
            href="/dashboard/settings/icp"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Configure your ICP
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </aside>
  );
}
