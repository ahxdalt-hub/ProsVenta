"use client";

// ============================================================================
// Prosventa Intelligence Workspace — Intelligence Item
// ============================================================================
// Phase 3: the reusable, compact intelligence record. Communicates WHAT / WHO /
// WHEN, the supporting evidence (only fields actually present), source
// transparency (real stored URL only), and "Why it matters" — which renders
// ONLY the stored detection-time interpretation, never generated content.
//
// Trust labeling uses only what the architecture can support reliably:
// Verified (status=verified) / Detected (external) / Derived (internal).
// ============================================================================

import { memo } from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { SignalRecord, SignalImportance } from "@/features/intelligence/signals/types";
import {
  formatRelativeTime,
  getSignalEventDate,
} from "@/features/intelligence/signals/components/signal-display";
import {
  getFeedItemEvidenceNote,
  getFeedItemInterpretation,
  getFeedItemTypeLabel,
  getFeedItemWho,
  getTrustLabel,
  type TrustLabel,
} from "./feed-logic";

// ============================================================================
// Presentation styles — text always accompanies color (accessibility).
// ============================================================================

const TRUST_STYLES: Record<TrustLabel, string> = {
  Verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Detected: "border-blue-200 bg-blue-50 text-blue-700",
  Derived: "border-slate-200 bg-slate-100 text-slate-600",
};

const IMPORTANCE_STYLES: Record<SignalImportance, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  low: "border-slate-200 bg-slate-100 text-slate-600",
};

export interface IntelligenceItemProps {
  signal: SignalRecord;
  /** Present only when the signal is linked to a real prospect. */
  onOpenProspect?: (prospectId: string) => void;
  /** Opens the existing SignalDetailWindow (stored evidence, sources). */
  onOpenDetails?: (signal: SignalRecord) => void;
}

function IntelligenceItemInner({ signal, onOpenProspect, onOpenDetails }: IntelligenceItemProps) {
  const typeLabel = getFeedItemTypeLabel(signal);
  const trust = getTrustLabel(signal);
  const who = getFeedItemWho(signal);
  const summary = signal.summary?.trim() || signal.description?.trim() || signal.title;
  const evidenceNote = getFeedItemEvidenceNote(signal);
  const interpretation = getFeedItemInterpretation(signal);
  const eventDate = getSignalEventDate(signal);
  const hasProspectAction = Boolean(signal.prospect_id && onOpenProspect);

  return (
    <article
      className={cn(
        "relative border-b border-slate-100 px-5 py-4 transition-colors duration-150 last:border-b-0",
        "hover:bg-slate-50/70"
      )}
      aria-label={`${trust}: ${typeLabel} — ${signal.title}`}
    >
      {/* Top: event type · trust · importance · when */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{typeLabel}</Badge>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
            TRUST_STYLES[trust]
          )}
        >
          {trust}
        </span>
        {(signal.importance === "high" || signal.importance === "critical") && (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
              IMPORTANCE_STYLES[signal.importance]
            )}
          >
            {signal.importance === "critical" ? "Critical" : "High importance"}
          </span>
        )}
        <time dateTime={eventDate} className="ml-auto text-xs text-slate-400">
          {formatRelativeTime(eventDate)}
        </time>
      </div>

      {/* Main: who + what */}
      <div className="mt-2 min-w-0">
        <h4 className="text-sm font-semibold leading-snug text-slate-900">{signal.title}</h4>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">{summary}</p>
        {who && <p className="mt-1.5 truncate text-xs font-medium text-slate-500">{who}</p>}
      </div>

      {/* Evidence hierarchy: the primary evidence is the event above; this is
          the stored supporting note + real source (secondary/context). */}
      {(evidenceNote || signal.source) && (
        <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Evidence</p>
          {evidenceNote && <p className="mt-1 text-xs leading-relaxed text-slate-600">{evidenceNote}</p>}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
            <span>Source: {signal.source || "Prosventa"}</span>
            {onOpenDetails && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => onOpenDetails(signal)}
                  className="rounded font-medium text-blue-600 transition-colors duration-150 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  aria-label={`View stored evidence for: ${signal.title}`}
                >
                  View evidence
                </button>
              </>
            )}
            {signal.source_url && (
              <>
                <span aria-hidden="true">·</span>
                <a
                  href={signal.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded font-medium text-blue-600 transition-colors duration-150 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  aria-label={`Open the original source for: ${signal.title} (opens in a new tab)`}
                >
                  Original source
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </>
            )}
          </p>
        </div>
      )}

      {/* Why it matters — stored interpretation only; absent when none exists. */}
      {interpretation && (
        <div className="mt-2.5 border-l-2 border-blue-100 pl-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Why it matters</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{interpretation}</p>
        </div>
      )}

      {/* Navigation — one primary action (existing prospect detail), only
          when a real prospect link exists. Evidence/source links above stay
          visually quiet. */}
      {hasProspectAction && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => onOpenProspect?.(signal.prospect_id as string)}
            className="btn-press inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label={`Open prospect details related to: ${signal.title}`}
          >
            Open prospect
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </article>
  );
}

export const IntelligenceItem = memo(IntelligenceItemInner);

