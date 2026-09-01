"use client";

// ============================================================================
// Prosventa Intelligence — Action Triggers (Phase 2)
// ============================================================================
// Every control funnels through ONE entry point —
// `useIntelligenceActionWindow().openIntelligenceAction({ type, context })` —
// which opens THE unified minimized action window. There are NO redirects to
// Prospects / Companies / Dashboard / Saved Lists and no per-action modals.
// ============================================================================

import { useIntelligenceActionWindow } from "../../action-window";
import type {
  IntelligenceActionKind,
  IntelligenceActionRequest,
} from "../../action-window";

export type { IntelligenceActionKind, IntelligenceActionRequest };

const PRIMARY_ACTIONS: Array<{
  kind: IntelligenceActionKind;
  label: string;
}> = [
  { kind: "research_prospect", label: "Research prospect" },
  { kind: "research_company", label: "Research company" },
  { kind: "enrich_prospect", label: "Enrich prospect" },
  { kind: "enrich_company", label: "Enrich company" },
];

/** Primary intelligence actions shown near the page header. */
export function IntelligenceActions() {
  const { openIntelligenceAction } = useIntelligenceActionWindow();
  return (
    <div className="flex flex-wrap gap-2">
      {PRIMARY_ACTIONS.map((action) => (
        <button
          key={action.kind}
          type="button"
          onClick={() => openIntelligenceAction({ type: action.kind })}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

interface IntelligenceActionTriggerProps {
  label?: string;
  /** Signal/prospect id passed through to the action-window system. */
  targetId?: string;
  kind?: IntelligenceActionKind;
}

/** Compact inline trigger, e.g. [Review] on a signal or priority item. */
export function IntelligenceActionTrigger({
  label = "Review",
  targetId,
  kind = "review_signal",
}: IntelligenceActionTriggerProps) {
  const { openIntelligenceAction } = useIntelligenceActionWindow();
  const request: IntelligenceActionRequest =
    kind === "review_signal"
      ? { type: "review_signal", context: { signalId: targetId } }
      : { type: kind, context: { targetId } };
  return (
    <button
      type="button"
      onClick={() => openIntelligenceAction(request)}
      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      {label}
    </button>
  );
}
