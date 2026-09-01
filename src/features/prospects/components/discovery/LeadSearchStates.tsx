"use client";

// ============================================================================
// Prosventa Find Matching Leads — Search States
// ============================================================================
// Polished loading skeletons (stable layout, no blank screens), a useful
// empty state with broadening actions, and structured error states mapped
// from discovery error codes. No provider internals are ever shown.
// ============================================================================

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, Hourglass, KeyRound, RefreshCw, SearchX, WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

// ---- Loading -----------------------------------------------------------------

const LOADING_STEPS = ["Searching your target market", "Applying ICP criteria", "Ranking relevant matches"];

export function LeadResultsSkeleton() {
  // Honest slow-search status after a delay — never invents backend steps.
  const [isSlow, setIsSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setIsSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-4" role="status" aria-label="Searching for matching leads">
      <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-blue-900">Finding matching prospects…</p>
          {isSlow ? (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-blue-700/90">
              <Hourglass size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              Still searching — the lead provider is taking longer than usual.
              You can keep waiting, or cancel and try again.
            </p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {LOADING_STEPS.map((step) => (
                <li key={step} className="text-xs text-blue-700/80">
                  · {step}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-hidden="true">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="mt-2 h-3 w-64" />
              <Skeleton className="mt-2 h-3 w-40" />
            </div>
            <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
            <div className="flex shrink-0 gap-2">
              <Skeleton className="h-7 w-14 rounded-md" />
              <Skeleton className="h-7 w-14 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Empty ---------------------------------------------------------------------

interface EmptyResultsProps {
  onBroaden: () => void;
  hasIcp: boolean;
}

export function EmptyResults({ onBroaden, hasIcp }: EmptyResultsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <SearchX size={22} aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">No strong matches found</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        This can happen when your search criteria are too narrow, the location or
        company-size range is restrictive, or the lead provider has limited coverage
        for this market.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Button size="sm" onClick={onBroaden}>
          Broaden search
        </Button>
        {!hasIcp && (
          <span className="text-xs text-slate-400">
            Tip: configure your ICP so Prosventa can apply smarter targeting.
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ---- Errors -----------------------------------------------------------------------

interface ErrorStateProps {
  code: string | null;
  message: string | null;
  onRetry: () => void;
}

const ERROR_TITLES: Record<string, { title: string; hint: string; icon: React.ReactNode }> = {
  PROVIDER_NOT_CONFIGURED: {
    title: "Lead provider not connected",
    hint: "Ask your workspace admin to connect a lead data provider to start discovering prospects.",
    icon: <KeyRound size={22} aria-hidden="true" />,
  },
  RATE_LIMITED: {
    title: "Search provider is busy",
    hint: "The lead provider is temporarily limiting requests. Please wait a moment and try again.",
    icon: <Clock size={22} aria-hidden="true" />,
  },
  TIMEOUT: {
    title: "The search took too long",
    hint: "The request timed out before results came back. You can retry the search.",
    icon: <WifiOff size={22} aria-hidden="true" />,
  },
  AUTH_FAILED: {
    title: "Sign in required",
    hint: "Your session may have expired. Please sign in again and retry.",
    icon: <AlertTriangle size={22} aria-hidden="true" />,
  },
};

export function DiscoveryErrorState({ code, message, onRetry }: ErrorStateProps) {
  const known = code != null && code !== "" ? ERROR_TITLES[code] : undefined;
  const styled = known ?? {
    title: "Lead search is temporarily unavailable.",
    hint: message ?? "Please try again shortly.",
    icon: <AlertTriangle size={22} aria-hidden="true" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center rounded-xl border border-red-100 bg-red-50/40 px-6 py-12 text-center"
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-400">
        {styled.icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{styled.title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{styled.hint}</p>
      {code !== "PROVIDER_NOT_CONFIGURED" && code !== "AUTH_FAILED" && (
        <Button size="sm" variant="secondary" className="mt-5" onClick={onRetry}>
          <RefreshCw size={13} aria-hidden="true" />
          Retry search
        </Button>
      )}
    </motion.div>
  );
}
