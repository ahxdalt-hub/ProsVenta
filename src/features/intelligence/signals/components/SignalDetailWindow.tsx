"use client";

// ============================================================================
// Prosventa Signals UX — Signal Detail Window
// Feature 3 — Phase 3: Signals User Experience, Evidence & Interaction
// ============================================================================
// A lightweight detail experience built on the ONE shared ActionWindow
// architecture (open/close animations, focus trap, Escape, focus restoration,
// responsive sheet on mobile). Answers "where did Prosventa get this?" using
// the stored normalized evidence — never raw provider payloads or internal
// API details. Source links are only shown when a real URL exists.
// ============================================================================

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { ActionWindow } from "@/components/action-window/ActionWindow";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import {
  changeSignalStatusAction,
} from "../actions";
import { getSignalWithEvidence } from "../query-service";
import type {
  SignalEvidenceRecord,
  SignalRecord,
} from "../types";
import {
  FRESHNESS_STYLES,
  IMPORTANCE_STYLES,
  SIGNAL_CONFIDENCE_LABELS,
  SIGNAL_FRESHNESS_PRESENTATION_LABELS,
  SIGNAL_IMPORTANCE_LABELS,
  formatRelativeTime,
  getSignalCategoryLabel,
  getSignalEntity,
  getSignalEventDate,
  getSignalFreshnessPresentation,
} from "./signal-display";

const EVIDENCE_TYPE_LABELS: Record<
  SignalEvidenceRecord["evidence_type"],
  string
> = {
  provider_record: "Provider record",
  article: "Article",
  event: "Event",
  identity: "Identity",
  metadata: "Metadata",
  other: "Other",
};

export interface SignalDetailWindowProps {
  signal: SignalRecord | null;
  onClose: () => void;
  /** Called after a successful dismiss so the list can update. */
  onDismissed?: (signalId: string) => void;
}

export function SignalDetailWindow({
  signal,
  onClose,
  onDismissed,
}: SignalDetailWindowProps) {
  // Stay mounted so ActionWindow's smooth close animation can play.
  const [shown, setShown] = useState<SignalRecord | null>(null);
  useEffect(() => {
    if (signal) setShown(signal);
  }, [signal]);

  const open = signal !== null;

  return (
    <ActionWindow
      open={open}
      onClose={onClose}
      onExitComplete={() => setShown(null)}
      title="Signal details"
      description="What changed and where Prosventa found it."
      minimizable={false}
      size="lg"
      closeLabel="Close signal details"
    >
      {shown && (
        <SignalDetailContent
          signal={shown}
          onClose={onClose}
          onDismissed={onDismissed}
        />
      )}
    </ActionWindow>
  );
}

function SignalDetailContent({
  signal,
  onClose,
  onDismissed,
}: {
  signal: SignalRecord;
  onClose: () => void;
  onDismissed?: (signalId: string) => void;
}) {
  const [evidence, setEvidence] = useState<SignalEvidenceRecord[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  // Load stored evidence for THIS signal when the window opens / target changes.
  useEffect(() => {
    let cancelled = false;
    setEvidence(null);
    setLoadFailed(false);

    getSignalWithEvidence(signal.id)
      .then((result) => {
        if (!cancelled) setEvidence(result.evidence ?? []);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [signal.id]);

  const eventDate = getSignalEventDate(signal);
  const freshness = getSignalFreshnessPresentation(signal);
  const entity = getSignalEntity(signal);
  const canDismiss =
    signal.status === "active" ||
    signal.status === "detected" ||
    signal.status === "unverified" ||
    signal.status === "verifying" ||
    signal.status === "verified";

  async function handleDismiss() {
    if (dismissing) return;
    setDismissing(true);
    try {
      const updated = await changeSignalStatusAction(signal.id, "dismissed");
      if (updated) {
        onDismissed?.(signal.id);
        onClose();
      }
    } finally {
      setDismissing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ---- Summary -------------------------------------------------------- */}
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              IMPORTANCE_STYLES[signal.importance]
            )}
          >
            Importance: {SIGNAL_IMPORTANCE_LABELS[signal.importance]}
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
          {signal.status === "dismissed" && (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              Dismissed
            </span>
          )}
        </div>

        <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900">
          {signal.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {signal.description}
        </p>

        {signal.interpretation && (
          <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Possible interpretation
            </p>
            <p className="mt-1 text-sm text-slate-600">{signal.interpretation}</p>
          </div>
        )}
      </div>

      {/* ---- Timeline facts -------------------------------------------------- */}
      <section aria-labelledby="signal-when" className="border-t border-slate-100 pt-4">
        <h4
          id="signal-when"
          className="text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          When
        </h4>
        <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">Event date</dt>
            <dd className="text-sm font-medium text-slate-700">
              {formatDate(eventDate)}
              <span className="ml-1.5 text-xs font-normal text-slate-400">
                ({formatRelativeTime(eventDate)})
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Detected by Prosventa</dt>
            <dd className="text-sm font-medium text-slate-700">
              {formatDate(signal.detected_at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Confidence</dt>
            <dd className="text-sm font-medium text-slate-700">
              {SIGNAL_CONFIDENCE_LABELS[signal.confidence]}
            </dd>
          </div>
          {signal.provider && (
            <div>
              <dt className="text-xs text-slate-400">Data provider</dt>
              <dd className="text-sm font-medium capitalize text-slate-700">
                {signal.provider}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* ---- Evidence --------------------------------------------------------- */}
      <section aria-labelledby="signal-evidence" className="border-t border-slate-100 pt-4">
        <h4
          id="signal-evidence"
          className="text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          Evidence — why this signal exists
        </h4>

        {evidence === null && !loadFailed && (
          <div className="mt-3 space-y-2" role="status" aria-label="Loading evidence">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {loadFailed && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Evidence details could not be loaded right now. The signal itself is
            unaffected — please try again shortly.
          </p>
        )}

        {evidence !== null && evidence.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">
            No separate evidence records were stored for this signal. The signal
            summary above was derived directly from{" "}
            {signal.source || "the detecting source"} at detection time.
          </p>
        )}

        {evidence !== null && evidence.length > 0 && (
          <ul className="mt-3 space-y-2">
            {evidence.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {item.source_name ?? item.provider}
                    </p>
                    <p className="text-xs capitalize text-slate-400">
                      {EVIDENCE_TYPE_LABELS[item.evidence_type]} · via {item.provider}
                    </p>
                  </div>
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition-colors duration-150 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      aria-label={`View source: ${item.source_name ?? item.provider} (opens in a new tab)`}
                    >
                      View source
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {item.occurred_at && (
                    <div>
                      <dt className="inline text-slate-400">Event date: </dt>
                      <dd className="inline">{formatDate(item.occurred_at)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="inline text-slate-400">Captured: </dt>
                    <dd className="inline">{formatDate(item.captured_at)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-slate-400">
          Source: {signal.source || "Prosventa"}
          {signal.source_url && (
            <>
              {" · "}
              <a
                href={signal.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded font-medium text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                View source
              </a>
            </>
          )}
        </p>
      </section>

      {/* ---- Actions ---------------------------------------------------------- */}
      {canDismiss && (
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDismiss}
            loading={dismissing}
          >
            Dismiss signal
          </Button>
        </div>
      )}
    </div>
  );
}
