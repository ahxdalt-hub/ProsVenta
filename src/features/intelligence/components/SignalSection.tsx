"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { detectSignals, getStoredSignals, dismissSignalAction } from "../signals/actions";
import { CreditCostBadge, InsufficientCreditsNotice, getBillingInfo } from "@/components/dashboard/credits/CreditCostBadge";
import {
  getSignalFreshness,
  SIGNAL_FRESHNESS_LABELS,
  SIGNAL_CATEGORY_LABELS,
  SIGNAL_CONFIDENCE_LABELS,
  SIGNAL_IMPORTANCE_LABELS,
  type SignalOperationResult,
  type SignalRecord,
} from "../signals/types";

// ============================================================================
// Signal Section
// Stage 4 â€” Phase 7: Buying & Intent Signals
// ============================================================================
// Displays recent signals for a prospect and provides the explicit
// "Detect Signals" action. Never runs detection on page load â€” only on an
// explicit user action. Cached signals are displayed without re-detection.
//
// IMPORTANT: Signals are OBSERVED EVENTS with evidence â€” NOT proof that a
// prospect wants to buy. Interpretation is always shown separately and uses
// cautious language.
// ============================================================================

interface SignalSectionProps {
  prospectId: string;
}

export function SignalSection({ prospectId }: SignalSectionProps) {
  const [signals, setSignals] = useState<SignalRecord[]>([]);
  const [operation, setOperation] = useState<SignalOperationResult | null>(null);
  const [isLoadingCached, setIsLoadingCached] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load cached signals on mount â€” does NOT run detection.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingCached(true);
    setSignals([]);
    setOperation(null);

    getStoredSignals(prospectId)
      .then((stored: SignalRecord[]) => {
        if (!cancelled) setSignals(stored);
      })
      .catch(() => {
        // Ignore â€” cached signals are best-effort.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCached(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prospectId]);

  // Explicit "Detect Signals" action.
  // One user action produces one detection operation. Prevent duplicates.
  const handleDetect = useCallback(
    async (runExternal = false) => {
      if (isDetecting) return;
      setIsDetecting(true);
      setOperation(null);
      try {
        const result = await detectSignals(prospectId, { runExternal });
        setOperation(result);
        // Refresh the stored signals after detection.
        const stored = await getStoredSignals(prospectId);
        setSignals(stored);
      } catch {
        setOperation({
          status: "failed",
          message: "An unexpected error occurred during signal detection.",
          created: 0,
          duplicates: 0,
          provider: null,
          externalConfigured: false,
        });
      } finally {
        setIsDetecting(false);
      }
    },
    [prospectId, isDetecting]
  );

  const handleDismiss = useCallback(
    async (signalId: string) => {
      const ok = await dismissSignalAction(signalId);
      if (ok) {
        setSignals((prev) => prev.filter((s) => s.id !== signalId));
      }
    },
    []
  );

  const hasError = operation?.status === "failed";

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={() => handleDetect(false)}
          loading={isDetecting}
          disabled={isDetecting || isLoadingCached}
        >
          {isDetecting ? "Detecting..." : signals.length > 0 ? "Detect again" : "Detect Signals"}
        </Button>
        {signals.length > 0 && !isDetecting && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDetect(true)}
            disabled={isDetecting}
          >
            Run external
          </Button>
        )}
        <CreditCostBadge operationKey="signal_refresh" compact />
        {getBillingInfo(operation)?.code === "INSUFFICIENT_CREDITS" && (
          <InsufficientCreditsNotice
            required={getBillingInfo(operation)?.required}
            available={getBillingInfo(operation)?.balance}
            compact
          />
        )}
      </div>

      {/* Loading cached signals */}
      {isLoadingCached && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {/* Loading detection operation */}
      {isDetecting && (
        <p className="text-sm text-slate-500">
          Detecting signals... this may take a moment.
        </p>
      )}

      {/* Error State */}
      {hasError && !isDetecting && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {operation?.message || "Signal detection failed."}
        </div>
      )}

      {/* Operation message (success) */}
      {operation?.status === "completed" && !isDetecting && (
        <p className="text-sm text-slate-500">
          {operation.message}
          {operation.duplicates > 0 && ` (${operation.duplicates} duplicate${operation.duplicates === 1 ? "" : "s"} skipped)`}
        </p>
      )}

      {/* External detection unavailable */}
      {!isLoadingCached && !isDetecting && signals.length === 0 && !hasError && (
        <p className="text-sm text-slate-400">
          No signals detected yet. External signal detection is not configured.
          Run detection to record Prosventa activity signals.
        </p>
      )}

      {/* Signal List */}
      {signals.length > 0 && !isDetecting && (
        <div className="space-y-2">
          {signals.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              expanded={expandedId === signal.id}
              onToggle={() => setExpandedId(expandedId === signal.id ? null : signal.id)}
              onDismiss={() => handleDismiss(signal.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Signal Card
// ============================================================================

function SignalCard({
  signal,
  expanded,
  onToggle,
  onDismiss,
}: {
  signal: SignalRecord;
  expanded: boolean;
  onToggle: () => void;
  onDismiss: () => void;
}) {
  const freshness = getSignalFreshness(signal.detected_at);
  const importanceStyles: Record<string, string> = {
    critical: "bg-red-50 text-red-700 border-red-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-slate-50 text-slate-600 border-slate-200",
  };
  const confidenceStyles: Record<string, string> = {
    high: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-blue-50 text-blue-700 border-blue-200",
    low: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={onToggle}
          className="flex-1 text-left focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", importanceStyles[signal.importance])}>
              {SIGNAL_IMPORTANCE_LABELS[signal.importance]}
            </span>
            <span className="text-sm font-semibold text-slate-900">{signal.title}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {SIGNAL_FRESHNESS_LABELS[freshness]} Â· {SIGNAL_CATEGORY_LABELS[signal.category]}
          </p>
        </button>
        <button
          onClick={onDismiss}
          className="text-slate-300 hover:text-red-500 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded shrink-0"
          aria-label="Dismiss signal"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600">{signal.description}</p>

      {/* Source */}
      <p className="text-xs text-slate-400">
        Source: {signal.source}
        {signal.source_url && (
          <>
            {" Â· "}
            <a
              href={signal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
            >
              View source
            </a>
          </>
        )}
      </p>

      {/* Expanded Detail */}
      {expanded && (
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-2">
          {/* What happened */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">What happened</p>
            <p className="text-sm text-slate-700">{signal.description}</p>
          </div>

          {/* Evidence */}
          {signal.evidence && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Evidence</p>
              <p className="text-sm text-slate-600">{signal.evidence}</p>
            </div>
          )}

          {/* Observed vs Interpretation */}
          {signal.interpretation && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Possible interpretation</p>
              <p className="text-sm text-slate-600">{signal.interpretation}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5", confidenceStyles[signal.confidence])}>
              Confidence: {SIGNAL_CONFIDENCE_LABELS[signal.confidence]}
            </span>
            <span>Detected: {formatDate(signal.detected_at)}</span>
            <span>Importance: {SIGNAL_IMPORTANCE_LABELS[signal.importance]}</span>
          </div>
        </div>
      )}
    </div>
  );
}

