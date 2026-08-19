"use client";

import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

// ============================================================================
// Intelligence State Components
// Stage 5 - Phase 1: Intelligence Foundation
// ============================================================================
// Shared UI states for intelligence operations. These are the building blocks
// that future phases (enrichment, research, scoring, signals) will use so that
// every intelligence interaction feels consistent and premium.
//
// States covered:
//   idle / preparing / processing / success / partial / failed / retrying /
//   unavailable / empty
// ============================================================================

export type IntelligenceUiState =
  | "idle"
  | "preparing"
  | "loading"
  | "processing"
  | "success"
  | "partial"
  | "failed"
  | "retrying"
  | "unavailable"
  | "empty";

// ============================================================================
// Processing / Preparing States
// ============================================================================

interface IntelligenceProcessingStateProps {
  /** Human message shown while an operation is running */
  message?: string;
  /** Fine-print helper text below the message */
  hint?: string;
  /** Visual variant */
  variant?: "processing" | "preparing" | "loading" | "retrying";
  className?: string;
}

const PROCESSING_LABELS: Record<string, string> = {
  preparing: "Preparing...",
  loading: "Loading...",
  processing: "Processing...",
  retrying: "Retrying...",
};

/**
 * Polished loading state for intelligence operations. Shows a spinner plus a
 * contextual message. Never fakes progress percentages.
 */
export function IntelligenceProcessingState({
  message,
  hint,
  variant = "processing",
  className,
}: IntelligenceProcessingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3", className)}
    >
      <Spinner size="sm" className="text-blue-600 shrink-0" label={PROCESSING_LABELS[variant]} />
      <div className="min-w-0">
        <p className="text-sm text-slate-700">{message ?? PROCESSING_LABELS[variant]}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

/**
 * Skeleton-based loading state for panels that need a placeholder layout.
 */
export function IntelligenceSkeletonState({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading intelligence data"
      className={cn("space-y-2", className)}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse rounded-lg bg-slate-100",
            i === 0 ? "h-4 w-1/3" : i === 1 ? "h-16 w-full" : "h-4 w-2/3"
          )}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

// ============================================================================
// Success / Partial States
// ============================================================================

interface IntelligenceSuccessStateProps {
  message: string;
  /** Optional detail text */
  detail?: string;
  /** Provider source label, when available */
  provider?: string | null;
  /** When the data was retrieved */
  retrievedAt?: string | null;
  /** Confidence 0-100, when known */
  confidence?: number | null;
  className?: string;
}

/**
 * Success state for a completed intelligence operation. Shows a subtle check
 * and the source attribution so users always know where data came from.
 */
export function IntelligenceSuccessState({
  message,
  detail,
  provider,
  retrievedAt,
  confidence,
  className,
}: IntelligenceSuccessStateProps) {
  return (
    <div
      className={cn("rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3", className)}
      role="status"
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0"
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
        <div className="min-w-0">
          <p className="text-sm font-medium text-emerald-800">{message}</p>
          {detail && <p className="text-xs text-emerald-700 mt-0.5">{detail}</p>}
          {(provider || retrievedAt || confidence !== null) && (
            <p className="text-xs text-emerald-600/80 mt-1">
              {provider && `Source: ${provider}`}
              {retrievedAt && provider && " · "}
              {retrievedAt && `Retrieved ${new Date(retrievedAt).toLocaleString()}`}
              {confidence !== null && (provider || retrievedAt) && " · "}
              {confidence !== null && `Confidence ${confidence}%`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Partial result state. Alerts the user that the provider returned incomplete
 * data and shows what may be missing. Never presents partial data as complete.
 */
export function IntelligencePartialState({
  warnings,
  className,
}: {
  warnings: string[];
  className?: string;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn("rounded-lg border border-amber-200 bg-amber-50 px-4 py-3", className)}
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-4 h-4 text-amber-600 mt-0.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-800">Partial result</p>
          {warnings.length > 0 && (
            <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Failed / Retrying / Unavailable States
// ============================================================================

interface IntelligenceFailureStateProps {
  /** User-facing message (never raw provider errors) */
  message: string;
  /** Optional recoverable detail */
  detail?: string;
  /** Whether a retry is being attempted */
  retrying?: boolean;
  /** Whether the user can retry manually */
  onRetry?: () => void;
  className?: string;
}

/**
 * Failure state for a failed intelligence operation. Messages must be
 * user-facing and must never expose provider secrets or stack traces.
 */
export function IntelligenceFailureState({
  message,
  detail,
  retrying,
  onRetry,
  className,
}: IntelligenceFailureStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-red-200 bg-red-50 px-4 py-3",
        retrying && "opacity-80",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <svg
            className="w-4 h-4 text-red-600 mt-0.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <div className="min-w-0">
            <p className="text-sm font-medium text-red-800">{message}</p>
            {detail && <p className="text-xs text-red-700 mt-0.5">{detail}</p>}
            {retrying && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <Spinner size="sm" className="text-red-500" label="Retrying" />
                Retrying...
              </p>
            )}
          </div>
        </div>
        {onRetry && !retrying && (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 text-xs font-semibold text-red-700 hover:text-red-900 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded px-2 py-1 transition-colors duration-150"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Unavailable state. Used when a provider is not configured (e.g. no API key)
 * or is down. Message must be calm and actionable.
 */
export function IntelligenceUnavailableState({
  message = "Intelligence is temporarily unavailable.",
  hint,
  className,
}: {
  message?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-lg border border-slate-200 bg-slate-50 px-4 py-3", className)}
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-4 h-4 text-slate-400 mt-0.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <p className="text-sm text-slate-600">{message}</p>
          {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Idle / Empty States
// ============================================================================

interface IntelligenceEmptyStateProps {
  title: string;
  description?: string;
  /** Optional action label + handler (e.g. "Enrich company") */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Empty/idle state for when no intelligence data exists yet and the user is
 * prompted to take an action (e.g. run enrichment).
 */
export function IntelligenceEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: IntelligenceEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-6 py-6 text-center",
        className
      )}
    >
      <svg
        className="w-8 h-8 text-slate-300 mb-2"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && <p className="text-xs text-slate-400 mt-0.5 max-w-xs">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Combined State Router
// ============================================================================
// Convenience component that maps an IntelligenceUiState to the correct
// presentation. Future phases can use this as a single switch point.
// ============================================================================

interface IntelligenceStateRouterProps {
  state: IntelligenceUiState;
  message?: string;
  hint?: string;
  failureMessage?: string;
  partialWarnings?: string[];
  successMessage?: string;
  provider?: string | null;
  retrievedAt?: string | null;
  confidence?: number | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function IntelligenceStateRouter({
  state,
  message,
  hint,
  failureMessage,
  partialWarnings = [],
  successMessage,
  provider,
  retrievedAt,
  confidence,
  onRetry,
  emptyTitle,
  emptyDescription,
  actionLabel,
  onAction,
}: IntelligenceStateRouterProps) {
  switch (state) {
    case "idle":
    case "empty":
      return (
        <IntelligenceEmptyState
          title={emptyTitle ?? "No data yet"}
          description={emptyDescription}
          actionLabel={actionLabel}
          onAction={onAction}
        />
      );
    case "preparing":
    case "loading":
    case "processing":
      return <IntelligenceProcessingState message={message} hint={hint} variant={state} />;
    case "retrying":
      return <IntelligenceProcessingState message={message ?? "Retrying..."} hint={hint} variant="retrying" />;
    case "success":
      return (
        <IntelligenceSuccessState
          message={successMessage ?? "Completed."}
          provider={provider}
          retrievedAt={retrievedAt}
          confidence={confidence}
        />
      );
    case "partial":
      return <IntelligencePartialState warnings={partialWarnings} />;
    case "failed":
      return (
        <IntelligenceFailureState
          message={failureMessage ?? "This operation could not be completed."}
          onRetry={onRetry}
        />
      );
    case "unavailable":
      return <IntelligenceUnavailableState message={message} hint={hint} />;
    default:
      return null;
  }
}