"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export function WorkspaceEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center",
        className
      )}
    >
      <svg
        className="w-8 h-8 text-slate-300 mb-3"
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
      {description && <p className="text-xs text-slate-400 mt-1 max-w-xs">{description}</p>}
      {actionLabel && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function WorkspaceErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3",
        className
      )}
    >
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
        <p className="text-sm font-medium text-red-800">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-xs font-semibold text-red-700 hover:text-red-900 rounded px-2 py-1 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function WorkspaceTabSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading intelligence">
      <div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-1.5 h-3 w-64" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-100 bg-white p-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-1.5 h-3 w-2/3" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-100 bg-white p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-6 w-16" />
          </div>
          <div className="rounded-lg border border-slate-100 bg-white p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-3 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceSectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}