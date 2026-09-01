"use client";

// ============================================================================
// Prosventa Intelligence — Compact Summary Card
// Feature 4 — Phase 3. A one-glance Intelligence presence on the prospect
// Overview: priority + confidence only. Full detail lives in the Intelligence
// tab via <IntelligencePanel /> — no duplicated intelligence UI.
// ============================================================================

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { getProspectIntelligenceView, generateProspectIntelligence } from "../service";
import type { IntelligenceView } from "../view";
import { priorityCategoryForScore } from "../view";
import { PriorityBadge } from "./PriorityBadge";
import { CONFIDENCE_LABELS, formatWhen } from "./presentation";

export function IntelligenceSummaryCard({ prospectId }: { prospectId: string }) {
  const [view, setView] = useState<IntelligenceView | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void getProspectIntelligenceView(prospectId).then((v) => {
      if (alive) setView(v);
    });
    return () => {
      alive = false;
    };
  }, [prospectId]);

  const handleGenerate = async () => {
    setBusy(true);
    try {
      await generateProspectIntelligence(prospectId);
      setView(await getProspectIntelligenceView(prospectId));
    } finally {
      setBusy(false);
    }
  };

  if (!view) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-busy="true">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-6 w-32 rounded-full" />
        <Skeleton className="mt-2 h-3 w-56 max-w-full" />
      </div>
    );
  }

  const presentable = view.state === "ready" || view.state === "stale";
  if (!presentable) return null; // stay quiet on Overview; details handled in the tab

  const priority = view.dimensions.find((d) => d.dimension === "overall_priority");
  const confidenceLevel =
    view.confidence?.level === "high" ||
    view.confidence?.level === "medium" ||
    view.confidence?.level === "low"
      ? view.confidence.level
      : null;

  return (
    <section
      aria-label="Intelligence summary"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Intelligence
        </p>
        <span className="text-[11px] text-slate-300">
          {view.generatedAt ? `Updated ${formatWhen(view.generatedAt)}` : ""}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <PriorityBadge category={priorityCategoryForScore(priority?.score ?? null)} />
        {confidenceLevel && (
          <span className="text-xs text-slate-400">
            Confidence:{" "}
            <span className="font-medium text-slate-600">{CONFIDENCE_LABELS[confidenceLevel]}</span>
          </span>
        )}
        {view.state === "stale" && (
          <Button size="sm" variant="ghost" onClick={() => void handleGenerate()} loading={busy}>
            Refresh intelligence
          </Button>
        )}
      </div>
      {view.explanation && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {view.explanation}
        </p>
      )}
    </section>
  );
}
