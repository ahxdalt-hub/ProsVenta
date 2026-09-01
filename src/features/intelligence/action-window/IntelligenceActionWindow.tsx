"use client";

// ============================================================================
// Prosventa Intelligence — Reusable Action Window (Phase 2)
// ============================================================================
// THE single minimized action-window for every Intelligence action. Handles
// the Idle→Preparing→Ready→Running→Success/Error/Insufficient state machine,
// open/close animation (reduced-motion aware), focus management, Escape,
// outside-click (blocked while running), body scroll lock, and refreshing the
// underlying Intelligence workspace (router.refresh — never a full reload).
// Real operations call the EXISTING intelligence server actions; credits are
// always enforced server-side. This component never fabricates progress.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { backdropVariants, modalVariants } from "@/lib/motion";
import { settingsHref } from "@/lib/settings/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatCredits } from "@/features/credits/ui-config";
import { getIntelligenceActionConfig, getIntelligenceActionCost } from "./config";
import { getIntelligenceActionBalance, getReviewSignal } from "./actions";
import { TargetSelector } from "./TargetSelector";
// Existing intelligence server actions (never re-implemented here).
import { researchProspect } from "../prospect-research/actions";
import { researchProspectCompany } from "../research/actions";
import { enrichPerson } from "../person-enrichment/actions";
import { enrichCompany } from "../company-enrichment/actions";
import type {
  BillingInfoLike,
  IntelligenceActionKind,
  IntelligenceActionRequest,
  IntelligenceReviewSignal,
  IntelligenceTarget,
  IntelligenceWindowPhase,
} from "./types";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

interface WindowProps {
  request: IntelligenceActionRequest | null;
  open: boolean;
  onClose: () => void;
  onExitComplete: () => void;
}

interface RunOutcome {
  ok: boolean;
  billing: BillingInfoLike | null;
  result?: unknown;
  message?: string;
}

/** Figures out where the workspace canvas sits to anchor the window to it. */
function getContentRegion() {
  if (typeof document === "undefined") return null;
  const el = document.getElementById("main-content");
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (!rect || rect.width <= 0) return null;
  return { left: rect.left, width: rect.width };
}

/** Runs the existing billable operation for the action kind. */
async function runOperation(
  kind: IntelligenceActionKind,
  target: IntelligenceTarget | null
): Promise<RunOutcome> {
  const noTarget = (message: string): RunOutcome => ({
    ok: false,
    billing: null,
    message,
  });
  const prospectId = target?.id ?? null;

  try {
    switch (kind) {
      case "research_prospect": {
        if (!prospectId) return noTarget("Select a prospect to research.");
        const res = await researchProspect(prospectId);
        return finalize(res.status === "completed", res.billing, res.message, res);
      }
      case "research_company": {
        if (!prospectId) return noTarget("Select a company to research.");
        const res = await researchProspectCompany(prospectId);
        return finalize(res.status === "completed", res.billing, res.message, res);
      }
      case "enrich_prospect": {
        if (!prospectId) return noTarget("Select a prospect to enrich.");
        const res = await enrichPerson(prospectId);
        return finalize(res.status === "completed", res.billing, res.message, res);
      }
      case "enrich_company": {
        if (!prospectId) return noTarget("Select a company to enrich.");
        const res = await enrichCompany(prospectId, target?.domain ?? "");
        return finalize(res.status === "completed", res.billing, res.message, res);
      }
      default:
        return noTarget("This action is not runnable.");
    }
  } catch {
    return { ok: false, billing: null, message: "An unexpected error occurred." };
  }
}

function finalize(
  ok: boolean,
  billing: BillingInfoLike | null | undefined,
  message: string,
  result: unknown
): RunOutcome {
  return { ok, billing: billing ?? null, message, result };
}

export function IntelligenceActionWindow({
  request,
  open,
  onClose,
  onExitComplete,
}: WindowProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const config = request ? getIntelligenceActionConfig(request.type) : null;
  const cost = config ? getIntelligenceActionCost(config.kind) : 0;

  const [phase, setPhase] = useState<IntelligenceWindowPhase>("preparing");
  const [target, setTarget] = useState<IntelligenceTarget | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [signal, setSignal] = useState<IntelligenceReviewSignal | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [region, setRegion] = useState<{ left: number; width: number } | null>(
    null
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);
  const sessionKey = request
    ? `${request.type}:${request.context?.targetId ?? ""}:${request.context?.signalId ?? ""}`
    : null;

  // ---- Initialize / reset each session -----------------------------------
  useEffect(() => {
    if (!open || !request || !config) return;
    runningRef.current = false;
    setPhase("preparing");
    setTarget(null);
    setBalance(null);
    setSignal(null);
    setErrorMessage(null);
    setResult(null);
    setRegion(getContentRegion());

    if (request.type === "review_signal") {
      const signalId = request.context?.signalId;
      (async () => {
        if (!signalId) {
          setPhase("ready");
          return;
        }
        const review = await getReviewSignal(signalId);
        if (review) {
          setSignal(review);
          setPhase("ready");
        } else {
          setErrorMessage("This signal is no longer available.");
          setPhase("error");
        }
      })();
      return;
    }

    getIntelligenceActionBalance()
      .then((b) => {
        setBalance(b);
        setPhase("ready");
      })
      .catch(() => {
        setBalance(null);
        setPhase("ready");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionKey]);

  // ---- Body scroll lock --------------------------------------------------
  useEffect(() => {
    if (!open) return;
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
    };
  }, [open]);

  // ---- Escape + focus trap ------------------------------------------------
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (!runningRef.current) {
          e.stopPropagation();
          onClose();
        }
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (
        e.shiftKey &&
        (active === first || !panelRef.current.contains(active))
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);
    const raf = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(FOCUSABLE)
        ?.focus();
    });
    return () => {
      document.removeEventListener("keydown", onKey, true);
      cancelAnimationFrame(raf);
    };
  }, [open, onClose]);

  // ---- Keep the window anchored to the workspace on resize ----------------
  useEffect(() => {
    if (!open) return;
    function onResize() {
      setRegion(getContentRegion());
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  // ---- Action submission ---------------------------------------------------
  function handleSubmit() {
    if (!config || runningRef.current) return;
    if (config.requiresTarget && !target) return;
    const kind = config.kind;
    runningRef.current = true;
    setPhase("running");
    setErrorMessage(null);
    void runOperation(kind, target)
      .then((outcome) => {
        runningRef.current = false;
        if (outcome.billing?.code === "INSUFFICIENT_CREDITS") {
          setPhase("insufficient");
          return;
        }
        if (!outcome.ok) {
          setErrorMessage(
            outcome.message || "The operation could not be completed."
          );
          setPhase("error");
          return;
        }
        setResult(outcome.result);
        setPhase("success");
      })
      .catch(() => {
        runningRef.current = false;
        setErrorMessage("The operation could not be completed.");
        setPhase("error");
      });
  }

  function handleDone() {
    // Refresh only the affected Intelligence data (server components
    // underneath) — never a full page reload.
    router.refresh();
    onClose();
  }

  function handleRetry() {
    setPhase("ready");
    setErrorMessage(null);
  }

  function handleBackdropClick() {
    if (!runningRef.current) onClose();
  }

  // ---- Phase bodies ---------------------------------------------------------
  function renderBody() {
    if (!config) return null;

    if (phase === "preparing") {
      return (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <span className="text-blue-600">
            <Spinner size="lg" />
          </span>
          <p className="mt-4 text-sm font-semibold text-slate-700">
            {config.kind === "review_signal"
              ? "Loading signal..."
              : "Preparing..."}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {config.kind === "review_signal"
              ? "Loading the signal details."
              : "Loading available prospect information."}
          </p>
        </div>
      );
    }

    if (phase === "running") {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-blue-600">
            <Spinner size="lg" />
          </span>
          <p className="mt-4 text-base font-semibold text-slate-800">
            {config.runningTitle}
          </p>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500">
            {config.runningMessage}
          </p>
        </div>
      );
    }

    if (phase === "success") {
      return (
        <div className="py-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            {config.successTitle}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            {summarizeSuccess(config.kind, result)}
          </p>
          <p className="mx-auto mt-3 max-w-md text-xs text-slate-400">
            Your Intelligence activity is now up to date.
          </p>
        </div>
      );
    }

    if (phase === "error") {
      return (
        <div
          role="alert"
          className="flex flex-col items-center py-12 text-center"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <p className="mt-4 text-base font-semibold text-slate-800">
            {config.kind === "review_signal"
              ? "Unable to load this signal."
              : "The operation couldn't be completed."}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            {errorMessage ||
              "Something went wrong. No credits were charged for this failed operation."}
          </p>
        </div>
      );
    }

    if (phase === "insufficient") {
      return (
        <div className="py-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              Not enough Credits
            </p>
            <p className="mt-1 text-sm text-amber-700">
              This operation requires {formatCredits(cost)} Credits. Your
              workspace currently has {formatCredits(Math.max(balance ?? 0, 0))}
              .
            </p>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Top up Credits whenever you are ready — nothing was deducted.
          </p>
        </div>
      );
    }

    // phase === "ready"
    if (config.kind === "review_signal") {
      return signal ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              {signal.typeLabel}
            </p>
            {signal.subject && (
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {signal.subject}
              </p>
            )}
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            {signal.description || signal.title}
          </p>
          {signal.interpretation && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Why it matters</p>
              <p className="mt-1 text-sm text-slate-700">
                {signal.interpretation}
              </p>
            </div>
          )}
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-400">Importance</dt>
              <dd className="mt-0.5 font-medium text-slate-700">
                {signal.importanceLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Confidence</dt>
              <dd className="mt-0.5 font-medium text-slate-700">
                {signal.confidenceLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Detected</dt>
              <dd className="mt-0.5 font-medium text-slate-700">
                {new Date(signal.detectedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      ) : null;
    }

    // transactional ready
    return (
      <div className="space-y-4">
        <TargetSelector
          kind={config.kind}
          placeholder={config.searchPrompt}
          initialTarget={null}
          onSelect={setTarget}
        />

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500">
            What will happen
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Prosventa will run {config.resultNoun} {config.kind.includes("enrich") ? "enrichment" : "research"} using available intelligence.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
          <span className="text-sm font-medium text-slate-600">Cost</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 tabular-nums">
            {formatCredits(cost)} {cost === 1 ? "Credit" : "Credits"}
          </span>
        </div>
        {balance !== null && !affordable && (
          <p role="status" className="text-xs text-amber-600">
            This uses {formatCredits(cost)} Credits, but your workspace has{" "}
            {formatCredits(balance)}. Add Credits to continue.
          </p>
        )}
      </div>
    );
  }

  // ---- Footer per phase -------------------------------------------------
  function renderFooter() {
    if (!config) return null;

    if (phase === "preparing" || phase === "running") {
      return (
        <div className="flex items-center justify-end gap-2">
          <Button variant="primary" disabled>
            {phase === "running" ? config.runningTitle : "Preparing…"}
          </Button>
        </div>
      );
    }

    if (phase === "success") {
      return (
        <div className="flex items-center justify-end gap-2">
          <Button variant="primary" onClick={handleDone}>
            Done
          </Button>
        </div>
      );
    }

    if (phase === "error") {
      return (
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      );
    }

    if (phase === "insufficient") {
      return (
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              window.setTimeout(() => router.push(settingsHref("credits")), 0);
            }}
          >
            View Credits
          </Button>
        </div>
      );
    }

    // ready
    if (config.kind === "review_signal") {
      return (
        <div className="flex items-center justify-end gap-2">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={
            !target ||
            (balance !== null && !affordable)
          }
        >
          {config.startLabel}
        </Button>
      </div>
    );
  }

  // ---- Success summary (grounded in the real operation result) ------------
  function summarizeSuccess(kind: IntelligenceActionKind, raw: unknown): string {
    const r = (raw ?? {}) as Record<string, unknown>;
    switch (kind) {
      case "research_prospect": {
        const res = r.result as Record<string, unknown> | null;
        const role = (res?.currentRole ?? null) as
          | Record<string, unknown>
          | null;
        const title = role?.title ? String(role.title) : null;
        const company = role?.company ? String(role.company) : null;
        if (title && company) {
          return `Prepared a research brief for a ${title} at ${company}.`;
        }
        if (res?.professionalSummary) return String(res.professionalSummary);
        return String(r.message || "Prosventa found new intelligence.");
      }
      case "research_company": {
        const res = r.result as Record<string, unknown> | null;
        if (res?.overview) return String(res.overview);
        if (res?.whatTheyDo) return String(res.whatTheyDo);
        return String(r.message || "Prosventa found new intelligence.");
      }
      case "enrich_prospect":
      case "enrich_company": {
        const data = r.data;
        const count = Array.isArray(data)
          ? data.length
          : data && typeof data === "object"
            ? Object.keys(data).length
            : 0;
        const provider =
          typeof r.provider === "string" && r.provider.trim()
            ? ` (${String(r.provider)})`
            : "";
        if (count > 0) {
          return `Gathered ${count} new data point${count === 1 ? "" : "s"}${provider}.`;
        }
        return `Prosventa finished enriching the ${
          kind === "enrich_prospect" ? "prospect" : "company"
        }.`;
      }
      default:
        return String(r.message ?? "The operation completed.");
    }
  }

  const affordable = cost === 0 || balance === null || balance >= cost;

  // Portals require a real DOM container. During SSR there is none, so we
  // render nothing until mounted — otherwise React throws
  // "Target container is not a DOM element" and the server render errors.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[120]"
      aria-hidden={!open}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            variants={reduce ? undefined : backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={handleBackdropClick}
            className="pointer-events-auto absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={onExitComplete}>
        {open && config && (
          <motion.div
            key="panel-wrap"
            className="pointer-events-none absolute inset-y-0 flex items-center justify-center px-4 sm:px-6"
            style={{
              left: region?.left ?? 0,
              width: region?.width ? `${region.width}px` : undefined,
              right: region ? undefined : 0,
            }}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="intelligence-action-title"
              variants={reduce ? undefined : modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="pointer-events-auto flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl max-sm:max-h-[94dvh]"
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2
                    id="intelligence-action-title"
                    className="text-lg font-semibold text-slate-900"
                  >
                    {config.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {config.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!runningRef.current) onClose();
                  }}
                  aria-label="Close"
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {renderBody()}
              </div>

              <div className="shrink-0 border-t border-slate-100 px-5 py-3">
                {renderFooter()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}