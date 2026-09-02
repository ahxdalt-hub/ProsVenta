// ============================================================================
// Prosventa Intelligence Workspace — Attention Summary
// ============================================================================
// Phase 1: compact intelligence indicators directly under the header. Every
// value is derived from real workspace data already loaded by the page — when
// a metric has no data source yet, it renders a neutral "—" instead of an
// invented number.
// ============================================================================

import { cn } from "@/lib/utils";

export interface AttentionSummaryData {
  /** Active (non-dismissed) recommendations currently in the workspace. */
  needsAttention: number | null;
  /** Signals detected in the last 7 days. */
  newSignals: number | null;
  /** High-fit prospects — requires scoring data (later phase). */
  highFitProspects: number | null;
}

interface Tile {
  label: string;
  value: number | null;
  hint: string;
  accent?: "amber" | "blue" | "green" | "slate";
}

const accentStyles: Record<NonNullable<Tile["accent"]>, string> = {
  amber: "text-amber-600 bg-amber-50",
  blue: "text-blue-600 bg-blue-50",
  green: "text-green-600 bg-green-50",
  slate: "text-slate-500 bg-slate-100",
};

function AttentionTile({ tile }: { tile: Tile }) {
  const unavailable = tile.value === null;
  return (
    <div className="premium-card flex items-center gap-4 p-4 sm:p-5">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
          unavailable ? accentStyles.slate : accentStyles[tile.accent ?? "slate"]
        )}
        aria-hidden="true"
      >
        {unavailable ? "—" : (tile.value as number) > 99 ? "99+" : tile.value}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{tile.label}</p>
        <p className="truncate text-xs text-slate-400">{tile.hint}</p>
      </div>
    </div>
  );
}

export function AttentionSummary({ data }: { data: AttentionSummaryData }) {
  const tiles: Tile[] = [
    {
      label: "Needs attention",
      value: data.needsAttention,
      hint: "Active recommendations",
      accent: "amber",
    },
    {
      label: "New signals",
      value: data.newSignals,
      hint: "Detected in the last 7 days",
      accent: "blue",
    },
    {
      label: "High-fit prospects",
      value: data.highFitProspects,
      hint: "ICP fit 80+ among today's priorities",
    },
  ];

  return (
    <section aria-label="Attention summary">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <AttentionTile key={tile.label} tile={tile} />
        ))}
      </div>
    </section>
  );
}
