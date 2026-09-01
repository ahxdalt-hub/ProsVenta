"use client";

// ============================================================================
// Prosventa Enrichment — Single-Prospect Enrichment Window (Phase 2)
// ============================================================================
// The single-prospect enrichment experience, built on the ONE shared
// ActionWindow architecture (open/close animation, focus management, Escape,
// responsive sizing). minimizable={false}: a temporary, focused look-inside —
// no "-" control; the background stays usable and state is preserved.
//
// State machine: overview → loading → result | empty | error
//   - Opening renders IMMEDIATELY from stored data; the provider runs only on
//     an explicit user click.
//   - Freshness comes from the REAL stored timestamps; fresh data explains
//     itself instead of wasting provider credits.
//   - Existing prospect information is never replaced by nulls.
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ActionWindow } from "@/components/action-window/ActionWindow";
import { Spinner } from "@/components/ui/Spinner";
import {
  getEnrichProspectOverview,
  runSingleProspectEnrichment,
  type EnrichProspectOverview,
  type SingleEnrichmentResult,
} from "../actions";
import { hasUsefulEnrichmentData } from "../display";
import {
  CurrentInformationSection,
  PrimaryEnrichAction,
  StoredEnrichmentPreview,
} from "./EnrichProspectParts";
import { ResultView } from "./EnrichResultView";

export interface EnrichProspectWindowProps {
  prospectId: string | null;
  open: boolean;
  onClose: () => void;
  /** Called after a successful enrichment so parents can refresh their view. */
  onCompleted?: () => void;
}

type Phase = "overview" | "loading" | "result" | "empty" | "error";

export function EnrichProspectWindow({
  prospectId,
  open,
  onClose,
  onCompleted,
}: EnrichProspectWindowProps) {
  const router = useRouter();
  const [overview, setOverview] = useState<EnrichProspectOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("overview");
  const [result, setResult] = useState<SingleEnrichmentResult | null>(null);
  const [running, setRunning] = useState(false);

  // Read-only load of current info + stored provenance (no provider call).
  const loadOverview = useCallback(async (id: string) => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await getEnrichProspectOverview(id);
      if (!data.ok) {
        setOverviewError(data.message ?? "Could not load this prospect.");
        setOverview(null);
      } else {
        setOverview(data);
      }
    } catch {
      setOverviewError("Could not load this prospect right now.");
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !prospectId) return;
    setPhase("overview");
    setResult(null);
    void loadOverview(prospectId);
  }, [open, prospectId, loadOverview]);


  const startEnrichment = useCallback(async () => {
    if (!prospectId || running) return;
    setRunning(true);
    setPhase("loading");
    try {
      const res = await runSingleProspectEnrichment(prospectId);
      setResult(res);
      if (res.status === "failed") {
        setPhase("error");
      } else if (res.status === "empty" || !hasUsefulEnrichmentData(res.response)) {
        // Provider found nothing useful — existing data stays untouched.
        setPhase("empty");
      } else {
        setPhase("result");
        onCompleted?.();
        // Refresh server-rendered views (badges, status) — never a full
        // navigation; underlying page state and search filters are preserved.
        router.refresh();
      }
    } catch {
      setResult({
        status: "failed",
        message: "We couldn't complete enrichment right now.",
        provider: null,
        response: null,
      });
      setPhase("error");
    } finally {
      setRunning(false);
    }
  }, [prospectId, running, onCompleted, router]);

  const prospect = overview?.prospect ?? null;
  const title = prospect?.name ?? prospect?.companyName ?? "Prospect";

  return (
    <ActionWindow
      open={open}
      onClose={onClose}
      title="Enrich Prospect"
      description="Add available company, contact, professional, and technology information to this prospect."
      minimizable={false}
      size="lg"
      busy={running}
      closeLabel="Close enrichment"
    >
      <AnimatePresence mode="wait" initial={false}>
        {phase === "loading" ? (
          <LoadingState key="loading" />
        ) : phase === "error" ? (
          <ErrorState
            key="error"
            message={result?.message ?? null}
            onRetry={() => void startEnrichment()}
          />
        ) : phase === "empty" ? (
          <EmptyState key="empty" />
        ) : phase === "result" && result ? (
          <ResultView key="result" result={result} />
        ) : (
          <div key="overview" className="space-y-6">
            {overviewError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {overviewError}
              </p>
            ) : overviewLoading && !prospect ? (
              <div className="flex items-center gap-3 py-8" role="status">
                <Spinner size="md" />
                <span className="text-sm text-slate-500">Loading prospect…</span>
              </div>
            ) : prospect ? (
              <>
                {/* ---- Identity ---------------------------------------- */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {prospect.companyName || "Company unknown"}
                  </p>
                </div>

                {/* ---- Current information ------------------------------ */}
                <CurrentInformationSection prospect={prospect} />

                {/* ---- Previously stored enrichment (real provenance) --- */}
                <StoredEnrichmentPreview
                  person={overview?.person ?? null}
                  company={overview?.company ?? null}
                />

                {/* ---- Primary action (freshness-aware) ----------------- */}
                <PrimaryEnrichAction
                  person={overview?.person ?? null}
                  company={overview?.company ?? null}
                  loading={overviewLoading}
                  onRun={() => void startEnrichment()}
                />
              </>
            ) : null}
          </div>
        )}
      </AnimatePresence>
    </ActionWindow>
  );
}

// ----------------------------------------------------------------------------
// States
// ----------------------------------------------------------------------------

function LoadingState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16"
      role="status"
    >
      <Spinner size="lg" />
      <p className="text-sm font-semibold text-slate-900">Enriching prospect</p>
      <p className="text-sm text-slate-500">
        Retrieving available profile and company information…
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-10" role="status">
      <h3 className="text-base font-semibold text-slate-900">
        No additional information found
      </h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        The available sources didn&apos;t return usable details for this
        prospect. Your existing information is untouched.
      </p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  // Concise, safe explanation only — internal details never surface here.
  const safeMessage =
    message && !/[<{]|stack|provider api|api key/i.test(message)
      ? message
      : "We couldn't complete enrichment right now.";
  return (
    <div className="flex flex-col items-start gap-4 py-10" role="alert">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          We couldn&apos;t complete enrichment
        </h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          {safeMessage} Your existing prospect data is safe.
        </p>
      </div>
      <PrimaryEnrichAction person={null} company={null} loading={false} onRun={onRetry} retryLabel />
    </div>
  );
}

