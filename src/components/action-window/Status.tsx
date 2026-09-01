"use client";

// ============================================================================
// Prosventa — Action Window Result Helpers (Phase 4)
// ============================================================================
// Standardized loading / success / error states shared by every action window.
// Clear, short confirmation on success; plain-language recovery guidance on
// error (never a generic "Something went wrong." when a real explanation
// exists). Nothing here fabricates progress — consumers pass real state.
// ============================================================================

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export function ActionLoading({
  title = "Working…",
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-blue-600">
        <Spinner size="lg" />
      </span>
      <p className="mt-4 text-base font-semibold text-slate-800">{title}</p>
      {message && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{message}</p>}
    </div>
  );
}

export function ActionSuccess({
  title,
  message,
  hint,
}: {
  title: string;
  message: string;
  hint?: string;
}) {
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
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{message}</p>
      {hint && <p className="mx-auto mt-3 max-w-md text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function ActionError({
  title,
  message,
  actionLabel,
  onAction,
  hint,
}: {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  hint?: string;
}) {
  return (
    <div role="alert" className="flex flex-col items-center py-10 text-center">
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
        {title ?? "The operation couldn't be completed."}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{message}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
      {hint && <p className="mt-3 max-w-sm text-xs text-slate-400">{hint}</p>}
    </div>
  );
}