"use client";

// ============================================================================
// Prosventa Signals UX — Signal Card
// Feature 3 — Phase 3: Signals User Experience, Evidence & Interaction
// ============================================================================
// A premium, restrained card answering: what changed, why does it matter, and
// where did this come from? Entity (person vs company), importance, freshness,
// and evidence access are all derived from REAL record data + the canonical
// registry. Memoized so one signal's change never rerenders the workspace.
// ============================================================================

import { memo } from "react";
import { ExternalLink, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SignalRecord } from "../types";
import {
  FRESHNESS_STYLES,
  IMPORTANCE_STYLES,
  SIGNAL_FRESHNESS_PRESENTATION_LABELS,
  SIGNAL_IMPORTANCE_LABELS,
  formatRelativeTime,
  getSignalCategoryLabel,
  getSignalEntity,
  getSignalEventDate,
  getSignalFreshnessPresentation,
} from "./signal-display";

export interface SignalCardProps {
  signal: SignalRecord;
  onOpen: (signal: SignalRecord) => void;
  onDismiss?: (signal: SignalRecord) => void;
}

function SignalCardInner({ signal, onOpen, onDismiss }: SignalCardProps) {
  const entity = getSignalEntity(signal);
  const freshness = getSignalFreshnessPresentation(signal);
  const eventDate = getSignalEventDate(signal);

  return (
    <article
      className={cn(
        "group relative rounded-xl border bg-white p-4 shadow-sm transition-all duration-200",
        "border-slate-200 hover:border-slate-300 hover:shadow-md"
      )}
      aria-label={`Signal: ${signal.title}`}
    >
      <div className="flex items-start gap-3">
        {/* Main clickable area — opens the detail window */}
        <button
          type="button"
          onClick={() => onOpen(signal)}
          className="flex-1 min-w-0 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label={`Open details for signal: ${signal.title}`}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                IMPORTANCE_STYLES[signal.importance]
              )}
            >
              {SIGNAL_IMPORTANCE_LABELS[signal.importance]}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                FRESHNESS_STYLES[freshness]
              )}
            >
              {SIGNAL_FRESHNESS_PRESENTATION_LABELS[freshness]}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {entity === "company" ? "Company" : "Person"}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">
              {getSignalCategoryLabel(signal.category)}
            </span>
          </div>

          <h3 className="mt-2 truncate text-sm font-semibold text-slate-900 group-hover:text-slate-700">
            {signal.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {signal.summary ?? signal.description}
          </p>

          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <time dateTime={eventDate}>{formatRelativeTime(eventDate)}</time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" aria-hidden="true" />
              View evidence
            </span>
            {signal.source_url && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  Source available
                </span>
              </>
            )}
          </p>
        </button>

        {/* Dismiss — only for signals still in a live state */}
        {onDismiss && (
          <button
            type="button"
            onClick={() => onDismiss(signal)}
            className="shrink-0 rounded-lg p-1.5 text-slate-300 transition-colors duration-150 hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={`Dismiss signal: ${signal.title}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}

export const SignalCard = memo(SignalCardInner);
