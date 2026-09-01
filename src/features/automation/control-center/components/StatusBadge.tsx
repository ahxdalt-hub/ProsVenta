// ============================================================================
// Prosventa Automation Control Center — Status Badge
// ============================================================================
// Status is conveyed by text + color (never color alone) and reuses the Phase 4
// execution state vocabulary via EXECUTION_STATE_LABELS.
// ============================================================================

import { StatusDotBadge } from "@/components/ui/Badge";
import { EXECUTION_STATE_LABELS, type ExecutionState } from "../labels";

const VARIANTS: Record<
  ExecutionState,
  { variant: "success" | "warning" | "danger" | "default" | "neutral"; dot: string }
> = {
  queued: { variant: "neutral", dot: "bg-slate-400" },
  running: { variant: "default", dot: "bg-blue-500 animate-pulse" },
  waiting: { variant: "default", dot: "bg-blue-300" },
  paused: { variant: "warning", dot: "bg-amber-500" },
  completed: { variant: "success", dot: "bg-green-500" },
  failed: { variant: "danger", dot: "bg-red-500" },
  cancelled: { variant: "neutral", dot: "bg-slate-400" },
};

export function StatusBadge({ status }: { status: string }) {
  const state = (status in EXECUTION_STATE_LABELS ? status : "queued") as ExecutionState;
  const { variant, dot } = VARIANTS[state];
  return (
    <StatusDotBadge variant={variant} dotClassName={dot}>
      {EXECUTION_STATE_LABELS[state]}
    </StatusDotBadge>
  );
}
