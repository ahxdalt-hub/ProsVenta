"use client";

// ============================================================================
// Prosventa Intelligence — Intelligence Panel
// Feature 4 — Phase 3: the premium Intelligence experience embedded in the
// prospect workflow (and reusable for company scope).
//
// Design contract:
//   * Reads STORED intelligence only — opening never triggers generation.
//   * Priority and confidence are presented separately, never conflated.
//   * Unknown ≠ mismatch; missing data is labeled Unknown, neutrally.
//   * Loading uses skeletons (no layout jumps); errors are safe and honest;
//     insufficient evidence is stated plainly — nothing is ever fabricated.
//   * Restrained motion using Prosventa easing; honors prefers-reduced-motion.
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import {
  generateCompanyIntelligence,
  generateProspectIntelligence,
  getCompanyIntelligenceView,
  getProspectIntelligenceView,
} from "../service";
import type { IntelligenceView, StoredFactor } from "../view";
import { priorityCategoryForScore } from "../view";
import { PriorityBadge } from "./PriorityBadge";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { EvidenceSection } from "./EvidenceSection";
import {
  CONFIDENCE_EXPLANATIONS,
  CONFIDENCE_LABELS,
  CONFIDENCE_STYLES,
  formatWhen,
} from "./presentation";

const PANEL_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export interface IntelligencePanelProps {
  scope?: "prospect" | "company";
  prospectId?: string;
  companyKey?: string;
}

export function IntelligencePanel({
  scope = "prospect",
  prospectId,
  companyKey,
}: IntelligencePanelProps) {
  const subjectId = scope === "prospect" ? prospectId : companyKey;
  const [view, setView] = useState<IntelligenceView | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!subjectId) return;
    try {
      const next =
        scope === "prospect"
          ? await getProspectIntelligenceView(subjectId)
          : await getCompanyIntelligenceView(subjectId);
      setView(next);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, [scope, subjectId]);

  useEffect(() => {
    setView(null);
    setRefreshNote(null);
    void load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    if (!subjectId) return;
    setRefreshing(true);
    setRefreshNote("Analyzing latest evidence...");
    try {
      const result =
        scope === "prospect"
          ? await generateProspectIntelligence(subjectId, { refresh: true })
          : await generateCompanyIntelligence(subjectId, { refresh: true });
      if (result.status === "insufficient_evidence") {
        setRefreshNote(null);
        setView((cur) =>
          cur
            ? {
                ...cur,
                state: "insufficient_evidence",
                message:
                  "Not enough verified information yet. Prosventa needs more company facts, enrichment or signals before useful intelligence can be generated.",
              }
            : cur
        );
      } else if (result.status === "failed") {
        setRefreshNote(result.message || null);
      } else {
        setRefreshNote(null);
      }
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [scope, subjectId, load]);

  const handleGenerate = useCallback(async () => {
    if (!subjectId) return;
    setRefreshing(true);
    setRefreshNote("Analyzing available evidence...");
    try {
      const result =
        scope === "prospect"
          ? await generateProspectIntelligence(subjectId)
          : await generateCompanyIntelligence(subjectId);
      if (result.status === "insufficient_evidence") {
        setRefreshNote(null);
        setView({
          state: "insufficient_evidence",
          message:
            "Not enough verified information yet. Prosventa needs more company facts, enrichment or signals before useful intelligence can be generated.",
          explanation: null,
          dimensions: [],
          keyFactors: [],
          concerns: [],
          confidence: null,
          generatedAt: null,
          newestEvidenceAt: null,
          evidence: [],
        });
      } else {
        await load();
      }
    } finally {
      setRefreshing(false);
    }
  }, [scope, subjectId, load]);

  // ------------------------------------------------------------------ render
  const reduceMotion = useReducedMotion();

  if (!view && !loadFailed) return <IntelligenceSkeleton />;

  if (loadFailed) {
    return (
      <IntelligenceShell>
        <StateBlock
          title="Intelligence unavailable"
          description="We couldn't load intelligence right now. Your prospect data is safe."
          action={
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              Retry
            </Button>
          }
        />
      </IntelligenceShell>
    );
  }

  if (!view) return null;

  const busy = refreshing || view.state === "processing";
  const presentable = view.state === "ready" || view.state === "stale";

  if (view.state === "none") {
    return (
      <IntelligenceShell>
        <StateBlock
          title="No intelligence yet"
          description="Prosventa can analyze the available evidence — ICP fit, enrichment and verified signals — to produce an evidence-backed assessment of this prospect."
          action={
            <Button size="sm" onClick={() => void handleGenerate()} loading={refreshing}>
              Generate Intelligence
            </Button>
          }
        />
        {refreshNote && <p className="mt-3 text-xs text-slate-400">{refreshNote}</p>}
      </IntelligenceShell>
    );
  }

  if (view.state === "failed") {
    return (
      <IntelligenceShell>
        <StateBlock
          title="Intelligence unavailable"
          description={
            view.message ??
            "We couldn't analyze the latest evidence. Your prospect data is safe."
          }
          action={
            <Button size="sm" variant="secondary" onClick={() => void handleRefresh()}>
              Retry
            </Button>
          }
        />
      </IntelligenceShell>
    );
  }

  if (view.state === "insufficient_evidence") {
    return (
      <IntelligenceShell>
        <StateBlock
          title="Not enough evidence yet"
          description={
            view.message ??
            "Prosventa needs more verified information before generating useful intelligence."
          }
          action={
            <Button size="sm" variant="secondary" onClick={() => void handleRefresh()}>
              Try again
            </Button>
          }
        />
      </IntelligenceShell>
    );
  }

  return (
    <IntelligenceShell>
      {busy && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2"
          role="status"
        >
          <span
            aria-hidden="true"
            className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
          />
          <span className="text-xs font-medium text-blue-700">
            {refreshNote ?? "Analyzing latest evidence..."}
          </span>
        </motion.div>
      )}
      {presentable ? <ReadyView view={view} onRefresh={() => void handleRefresh()} /> : <IntelligenceSkeleton label={refreshNote ?? "Analyzing latest evidence..."} />}
    </IntelligenceShell>
  );


  function IntelligenceShell({ children }: { children: React.ReactNode }) {
    return (
      <section aria-label="Intelligence" className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-4 py-5 sm:px-6">{children}</div>
      </section>
    );
  }

  function ReadyView({ view, onRefresh }: { view: IntelligenceView; onRefresh: () => void }) {
    const priorityScore = view.dimensions.find((d) => d.dimension === "overall_priority");
    const priorityCategory = priorityCategoryForScore(priorityScore?.score ?? null);
    const confidence = view.confidence;
    const confidenceLevel =
      confidence?.level === "high" || confidence?.level === "medium" || confidence?.level === "low"
        ? confidence.level
        : ("unknown" as const);

    return (
      <>
        {/* Header: kicker + freshness + refresh */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Intelligence
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {view.generatedAt
                ? `Updated ${formatWhen(view.generatedAt)} · based on available evidence`
                : "Based on available evidence"}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh intelligence"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5">
              <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
            </svg>
            Refresh
          </Button>
        </div>

        {/* Stale banner */}
        <AnimatePresence initial={false}>
          {view.state === "stale" && (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: PANEL_EASE }}
              role="status"
              className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-amber-600">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-xs font-medium text-amber-800">Intelligence may be outdated</span>
              <span className="text-xs text-amber-700">— new evidence is available.</span>
              <button
                type="button"
                onClick={onRefresh}
                className="ml-auto rounded text-xs font-semibold text-amber-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Refresh now
              </button>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Main grid: summary column + scores column */}
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.28, ease: PANEL_EASE }}
          className="mt-5 grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]"
        >
          <div className="min-w-0 space-y-6">
            <div>
              <PriorityBadge category={priorityCategory} score={priorityScore?.score ?? null} size="lg" />
              {priorityScore?.summary && (
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-600">
                  {priorityScore.summary}
                </p>
              )}
            </div>

            {view.explanation && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Why this matters</h3>
                <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-slate-600">
                  {view.explanation}
                </p>
              </div>
            )}

            {view.keyFactors.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Key factors</h3>
                <ul className="mt-2 space-y-1.5">
                  {view.keyFactors.map((f) => (
                    <FactorRow key={f.id} factor={f} positive />
                  ))}
                </ul>
              </div>
            )}

            {view.concerns.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Things to consider</h3>
                <ul className="mt-2 space-y-1.5">
                  {view.concerns.map((f) => (
                    <FactorRow key={f.id} factor={f} />
                  ))}
                </ul>
              </div>
            )}

            {/* Evidence below the summary on mobile */}
            <div className="lg:hidden">
              <EvidenceSection items={view.evidence} />
            </div>
          </div>

          {/* Scores + confidence */}
          <div className="min-w-0 space-y-6 lg:border-l lg:border-slate-100 lg:pl-8">
            <ScoreBreakdown dimensions={view.dimensions} />
            {confidence && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Confidence</h3>
                <span
                  className={cn(
                    "mt-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                    CONFIDENCE_STYLES[confidenceLevel]
                  )}
                >
                  {CONFIDENCE_LABELS[confidenceLevel]}
                </span>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {CONFIDENCE_EXPLANATIONS[confidenceLevel]}
                </p>
                <p className="mt-1 text-[11px] italic text-slate-300">
                  Confidence reflects evidence quality — it is independent of priority.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Evidence full-width on desktop */}
        <div className="mt-6 hidden lg:block">
          <EvidenceSection items={view.evidence} />
        </div>
      </>
    );
  }
}


// ============================================================================
// Small shared pieces
// ============================================================================

function FactorRow({ factor, positive }: { factor: StoredFactor; positive?: boolean }) {
  const unknown = factor.status === "unknown";
  return (
    <li className="flex items-baseline gap-2 text-sm">
      <span
        aria-hidden="true"
        className={cn(
          "shrink-0 select-none",
          positive ? "text-green-600" : "text-slate-400"
        )}
      >
        {positive ? "✓" : "•"}
      </span>
      <span className={cn("min-w-0", unknown ? "italic text-slate-500" : "text-slate-700")}>
        {factor.label}
        {factor.detail && (
          <span className="font-normal text-slate-400"> — {factor.detail}</span>
        )}
        <span className="sr-only">
          {positive
            ? " (supporting factor)"
            : unknown
              ? " (unknown information)"
              : " (point of caution)"}
        </span>
      </span>
    </li>
  );
}

function StateBlock({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-md">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function IntelligenceSkeleton({ label }: { label?: string }) {
  return (
    <div aria-busy="true" aria-live="polite">
      {label && (
        <p className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-400">
          <span
            aria-hidden="true"
            className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500"
          />
          {label}
        </p>
      )}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
        <div className="space-y-4">
          <Skeleton className="h-7 w-36 rounded-full" />
          <Skeleton className="h-3 w-full max-w-md" />
          <Skeleton className="h-3 w-3/4 max-w-sm" />
          <Skeleton className="mt-6 h-3 w-24" />
          <Skeleton className="h-3 w-full max-w-md" />
          <Skeleton className="h-3 w-2/3 max-w-xs" />
        </div>
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="mt-6 h-12 w-full rounded-xl" />
    </div>
  );
}

