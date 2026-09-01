"use client";

// ============================================================================
// Prosventa Intelligence — Score Breakdown
// Feature 4 — Phase 3. Compact expandable score rows. Unknown scores stay
// "Unknown" — never rendered as a low number or as a mismatch.
// ============================================================================

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { INTELLIGENCE_DIMENSION_LABELS, type IntelligenceDimension } from "../types";
import type { StoredDimensionAssessment } from "../view";
import { scoreBarTone, scoreTone } from "./presentation";

const PANEL_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/** Short field labels for unknown_fields entries like "company.employee_count". */
function prettyField(field: string): string {
  const tail = field.includes(".") ? field.split(".").slice(1).join(" ") : field;
  return tail.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ScoreBreakdown({ dimensions }: { dimensions: StoredDimensionAssessment[] }) {
  const rows = dimensions.filter((d) => d.dimension !== "overall_priority");
  if (rows.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">Score breakdown</h3>
      <p className="mt-0.5 text-xs text-slate-400">
        Based on available evidence · select a score to see what drives it
      </p>
      <ul className="mt-3 divide-y divide-slate-100">
        {rows.map((d) => (
          <ScoreRow key={d.dimension} assessment={d} />
        ))}
      </ul>
    </div>
  );
}

function ScoreRow({ assessment }: { assessment: StoredDimensionAssessment }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const label =
    INTELLIGENCE_DIMENSION_LABELS[assessment.dimension as IntelligenceDimension] ??
    assessment.dimension;
  const score = assessment.score;
  const unknown = score === null || assessment.status === "not_applicable";

  const details: { term: string; description: string; tone?: "pos" | "neg" | "unk" }[] = [];
  for (const f of assessment.positive_factors) {
    details.push({ term: f.label, description: f.detail ?? "Supports this assessment", tone: "pos" });
  }
  for (const f of assessment.negative_factors) {
    if (f.status === "unknown") {
      details.push({ term: f.label, description: f.detail ?? "Unknown", tone: "unk" });
    } else {
      details.push({
        term: f.label,
        description: f.detail ?? "Works against this assessment",
        tone: "neg",
      });
    }
  }
  for (const field of assessment.unknown_fields) {
    details.push({
      term: prettyField(field),
      description: "Unknown — not enough data to evaluate (not counted against the score)",
      tone: "unk",
    });
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-md py-3 text-left transition-colors duration-150 hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-700">{label}</span>
          {unknown && (
            <span className="block text-[11px] italic text-slate-400">
              Unknown — insufficient data
            </span>
          )}
        </span>
        {!unknown && (
          <span className="hidden w-28 sm:block" aria-hidden="true">
            <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <motion.span
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                transition={{ duration: reduceMotion ? 0 : 0.45, ease: PANEL_EASE }}
                className={cn("block h-full rounded-full", scoreBarTone(score))}
              />
            </span>
          </span>
        )}
        <span
          className={cn(
            "w-9 shrink-0 text-right text-sm font-semibold tabular-nums",
            unknown ? "text-slate-300" : scoreTone(score)
          )}
        >
          {unknown ? "—" : score}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="details"
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: PANEL_EASE }}
            className="overflow-hidden"
          >
            <ScoreDetails assessment={assessment} details={details} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function ScoreDetails({
  assessment,
  details,
}: {
  assessment: StoredDimensionAssessment;
  details: { term: string; description: string; tone?: "pos" | "neg" | "unk" }[];
}) {
  return (
    <div className="ml-1 space-y-2 border-l-2 border-slate-100 pb-3 pl-3">
      {assessment.summary && (
        <p className="text-xs leading-relaxed text-slate-500">{assessment.summary}</p>
      )}
      {details.length > 0 ? (
        <dl className="space-y-1.5 pt-1">
          {details.map((item, i) => (
            <div key={`${item.term}-${i}`} className="flex items-baseline justify-between gap-3">
              <dt
                className={cn(
                  "shrink-0 text-xs font-medium",
                  item.tone === "neg" && "text-red-600",
                  item.tone === "unk" && "italic text-slate-400",
                  (!item.tone || item.tone === "pos") && "text-slate-500"
                )}
              >
                {item.tone === "pos" ? "✓ " : item.tone === "neg" ? "✕ " : item.tone === "unk" ? "• " : ""}
                {item.term}
              </dt>
              <dd className="text-right text-xs text-slate-400">{item.description}</dd>
            </div>
          ))}
        </dl>
      ) : (
        !assessment.summary && (
          <p className="text-xs italic text-slate-400">
            No detailed factors were recorded for this score.
          </p>
        )
      )}
    </div>
  );
}

