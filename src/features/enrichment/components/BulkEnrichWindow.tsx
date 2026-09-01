"use client";

// ============================================================================
// Prosventa Enrichment — Bulk Enrichment Window (Phase 3)
// ============================================================================
// The bulk enrichment experience on the ONE shared ActionWindow architecture:
//   confirm (real estimate) → progress (real backend state) → summary.
//
// Behavior contract:
//   - The confirmation shows REAL catalog costs and the REAL wallet balance;
//     opening it never charges anything.
//   - Processing happens entirely server-side; this window only OBSERVES
//     status with a gentle poll. Minimizing or closing never interrupts it —
//     reopening shows the latest real state. No fake progress, no invented
//     countdowns.
//   - Completion raises exactly one toast; the server records the bell
//     notification.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ActionWindow } from "@/components/action-window/ActionWindow";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/toast";
import {
  getBulkEnrichmentEstimate,
  startBulkEnrichment,
  getBulkEnrichmentStatus,
  cancelBulkEnrichment,
  retryFailedBulkJobs,
  type BulkEstimateResult,
  type BulkStatusResult,
} from "../bulk-actions";
import { isTerminalOperationStatus } from "../bulk";

import { Button } from "@/components/ui/Button";

export interface BulkEnrichWindowProps {
  open: boolean;
  /** Selected prospect ids from the Prospects workflow selection system. */
  prospectIds: string[];
  onClose: () => void;
  onCompleted?: () => void;
}

type Phase = "confirm" | "progress" | "summary";

export function BulkEnrichWindow({
  open,
  prospectIds,
  onClose,
  onCompleted,
}: BulkEnrichWindowProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [phase, setPhase] = useState<Phase>("confirm");
  const [estimate, setEstimate] = useState<BulkEstimateResult | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [status, setStatus] = useState<BulkStatusResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  // Guards so completion effects fire exactly once per operation.
  const notifiedRef = useRef<string | null>(null);

  // Fresh estimate every time the confirmation opens (live balance).
  useEffect(() => {
    if (!open || phase !== "confirm" || prospectIds.length === 0) return;
    let cancelledFlag = false;
    setEstimateLoading(true);
    setActionError(null);
    void getBulkEnrichmentEstimate(prospectIds)
      .then((result) => {
        if (!cancelledFlag) setEstimate(result);
      })
      .catch(() => {
        if (!cancelledFlag) setActionError("Could not load the estimate right now.");
      })
      .finally(() => {
        if (!cancelledFlag) setEstimateLoading(false);
      });
    return () => {
      cancelledFlag = true;
    };
  }, [open, phase, prospectIds]);

  // Progress observation — a gentle poll of REAL backend state. The window
  // staying mounted while minimized keeps this alive; reopening re-syncs.
  useEffect(() => {
    if (phase !== "progress" || !operationId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const next = await getBulkEnrichmentStatus(operationId);
        if (stopped) return;
        if (next.found) setStatus(next);
        if (isTerminalOperationStatus(next.status)) {
          setPhase("summary");
          return;
        }
      } catch {
        /* transient — keep observing */
      }
      if (!stopped) timer = setTimeout(poll, 2500);
    };
    void poll();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [phase, operationId]);

  // ONE summary toast per completed operation.
  useEffect(() => {
    if (phase !== "summary" || !status || !operationId) return;
    if (notifiedRef.current === operationId) return;
    notifiedRef.current = operationId;
    const enriched = status.counters.enriched + status.counters.partial;
    if (enriched > 0) {
      success(
        `Bulk enrichment completed: ${enriched} of ${status.total} prospects enriched.`,
        `Credits used: ${status.usedCredits}.`
      );
    } else {
      toastError("Bulk enrichment did not complete.", "No prospects were enriched.");
    }
    onCompleted?.();
  }, [phase, status, operationId, success, toastError, onCompleted]);

  const start = useCallback(async () => {
    if (starting || prospectIds.length === 0) return;
    setStarting(true);
    setActionError(null);
    try {
      const result = await startBulkEnrichment(prospectIds);
      if (result.ok && result.operationId) {
        setOperationId(result.operationId);
        setPhase("progress");
      } else if (result.error === "insufficient_credits" && estimate) {
        setEstimate({
          ...estimate,
          insufficientCredits: true,
          shortfall: Math.max((result.required ?? 0) - (result.available ?? 0), 0),
          availableCredits: result.available ?? estimate.availableCredits,
        });
        setActionError(result.message);
      } else {
        setActionError(result.message ?? "Could not start the enrichment.");
      }
    } catch {
      setActionError("Could not start the enrichment right now.");
    } finally {
      setStarting(false);
    }
  }, [starting, prospectIds, estimate]);

  const cancel = useCallback(async () => {
    if (!operationId) return;
    try {
      await cancelBulkEnrichment(operationId);
    } catch {
      /* status polling reflects the real outcome */
    }
  }, [operationId]);

  const retryFailed = useCallback(async () => {
    if (!operationId || retrying) return;
    setRetrying(true);
    try {
      const result = await retryFailedBulkJobs(operationId);
      if (result.ok) {
        setStatus(null);
        setPhase("progress");
      } else if (result.message) {
        setActionError(result.message);
      }
    } catch {
      setActionError("Could not retry right now.");
    } finally {
      setRetrying(false);
    }
  }, [operationId, retrying]);

  // Reopening while an operation is still active (refresh / reopen): resume
  // observing at progress instead of re-confirming.
  useEffect(() => {
    if (open && estimate?.activeOperationId && phase === "confirm") {
      setOperationId(estimate.activeOperationId);
      setPhase("progress");
    }
  }, [open, estimate, phase]);

  const reset = useCallback(() => {
    setPhase("confirm");
    setEstimate(null);
    setStatus(null);
    setOperationId(null);
    setActionError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (phase === "summary") reset();
    onClose();
  }, [phase, reset, onClose]);


  const progress = status
    ? {
        processed:
          status.counters.enriched +
          status.counters.partial +
          status.counters.skipped +
          status.counters.failed +
          status.counters.cancelled,
      }
    : null;

  return (
    <ActionWindow
      open={open}
      onClose={handleClose}
      title={
        phase === "confirm"
          ? "Enrich selected prospects"
          : phase === "progress"
            ? "Enriching prospects"
            : "Enrichment complete"
      }
      description={
        phase === "confirm"
          ? undefined
          : `${progress ? progress.processed : 0} / ${status?.total ?? prospectIds.length} processed`
      }
      busy={starting}
      minimizable={phase !== "confirm"}
      closeLabel={phase === "summary" ? "Close" : "Hide"}
      className="sm:max-w-lg"
    >
      <AnimatePresence mode="wait">
        {phase === "confirm" && (
          <ConfirmPhase
            estimate={estimate}
            loading={estimateLoading}
            starting={starting}
            error={actionError}
            onCancel={onClose}
            onContinue={() => void start()}
          />
        )}
        {phase === "progress" && (
          <ProgressPhase
            status={status}
            fallbackTotal={prospectIds.length}
            onCancel={() => void cancel()}
          />
        )}
        {phase === "summary" && (
          <SummaryPhase
            status={status}
            error={actionError}
            retrying={retrying}
            onRetry={() => void retryFailed()}
            onViewProspects={() => {
              handleClose();
              router.refresh();
            }}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>
    </ActionWindow>
  );
}

// ----------------------------------------------------------------------------
// Phases
// ----------------------------------------------------------------------------

function EstimateRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm ${strong ? "font-semibold text-slate-900" : "text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}

function ConfirmPhase({
  estimate,
  loading,
  starting,
  error,
  onCancel,
  onContinue,
}: {
  estimate: BulkEstimateResult | null;
  loading: boolean;
  starting: boolean;
  error: string | null;
  onCancel: () => void;
  onContinue: () => void;
}) {
  if (loading || !estimate) {
    return (
      <div className="flex items-center gap-3 py-8" role="status">
        <Spinner size="md" />
        <span className="text-sm text-slate-500">Calculating enrichment usage…</span>
      </div>
    );
  }

  // Insufficient credits — clear explanation, no provider work started.
  if (estimate.insufficientCredits) {
    return (
      <div role="alert">
        <h3 className="text-base font-semibold text-slate-900">Not enough credits</h3>
        <p className="mt-1 text-sm text-slate-500">
          This enrichment requires approximately{" "}
          <strong className="text-slate-800">{estimate.estimatedCost} credits</strong>. You
          currently have{" "}
          <strong className="text-slate-800">{estimate.availableCredits} credits</strong> (
          {estimate.shortfall} short).
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onCancel}>
            Get more credits
          </Button>
        </div>
      </div>
    );
  }

  const blocked =
    estimate.exceedsLimit ||
    estimate.activeOperationId !== null ||
    estimate.prospectCount === 0;

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {estimate.message && !error && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
          {estimate.message}
        </p>
      )}
      <div className="rounded-xl border border-slate-200 px-4 py-2">
        <EstimateRow label="Prospects selected" value={String(estimate.prospectCount)} />
        <div className="h-px bg-slate-100" />
        <EstimateRow
          label="Estimated enrichment usage"
          value={`${estimate.prospectCount} operations`}
        />
        <div className="h-px bg-slate-100" />
        <EstimateRow label="Estimated credits" value={`${estimate.estimatedCost} credits`} strong />
        <div className="h-px bg-slate-100" />
        <EstimateRow label="Available credits" value={`${estimate.availableCredits} credits`} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Final usage may be lower — unused credits are released automatically after processing.
        Enrichment runs in the background; you can minimize this window.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" size="sm" disabled={starting} onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" disabled={blocked || starting} onClick={onContinue}>
          {starting ? "Starting…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function ProgressPhase({
  status,
  fallbackTotal,
  onCancel,
}: {
  status: BulkStatusResult | null;
  fallbackTotal: number;
  onCancel: () => void;
}) {
  const total = status?.total ?? fallbackTotal;
  const counters = status?.counters;
  const processed = counters
    ? counters.enriched + counters.partial + counters.skipped + counters.failed + counters.cancelled
    : 0;
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div role="status">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-slate-900">
          {processed} / {total} completed
        </p>
        <span className="text-xs font-medium text-slate-400">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {counters && (
        <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
          <li>✓ {counters.enriched} enriched</li>
          {counters.partial > 0 && <li>↻ {counters.partial} partially enriched</li>}
          {(status?.processing ?? 0) > 0 && <li>↻ {status?.processing} processing</li>}
          {(status?.queued ?? 0) > 0 && <li>• {status?.queued} queued</li>}
          {counters.skipped > 0 && <li>→ {counters.skipped} skipped (already up to date)</li>}
          {counters.failed > 0 && <li>✕ {counters.failed} failed</li>}
          {counters.cancelled > 0 && <li>⊘ {counters.cancelled} cancelled</li>}
        </ul>
      )}

      {!status && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Spinner size="sm" /> Reading operation state…
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel queued
        </Button>
      </div>
    </div>
  );
}

function SummaryPhase({
  status,
  error,
  retrying,
  onRetry,
  onViewProspects,
  onClose,
}: {
  status: BulkStatusResult | null;
  error: string | null;
  retrying: boolean;
  onRetry: () => void;
  onViewProspects: () => void;
  onClose: () => void;
}) {
  if (!status) {
    return (
      <div className="flex items-center gap-3 py-8" role="status">
        <Spinner size="md" />
        <span className="text-sm text-slate-500">Loading results…</span>
      </div>
    );
  }
  const c = status.counters;
  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
          {error}
        </p>
      )}
      <ul className="space-y-1.5 text-sm text-slate-700">
        <li>✓ {c.enriched} enriched</li>
        {c.partial > 0 && <li>↻ {c.partial} partially enriched</li>}
        {c.skipped > 0 && <li>→ {c.skipped} skipped (already up to date)</li>}
        {c.failed > 0 && <li>✕ {c.failed} failed</li>}
        {c.cancelled > 0 && <li>⊘ {c.cancelled} cancelled</li>}
      </ul>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2">
        <span className="text-sm text-slate-500">Credits used</span>
        <span className="text-sm font-semibold text-slate-900">{status.usedCredits}</span>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        {c.failed > 0 && status.retryableFailed > 0 && (
          <Button variant="secondary" size="sm" disabled={retrying} onClick={onRetry}>
            Retry failed ({status.retryableFailed})
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onViewProspects}>
          View prospects
        </Button>
        <Button variant="primary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

