// ============================================================================
// Prosventa Intelligence Workspace — Shared Section Primitives
// ============================================================================
// Server-safe presentation primitives: consistent card shells, compact
// per-section error states (error isolation — a failed data source must not
// take down the page), and skeletons so the shell renders instantly.
// ============================================================================

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { RetryButton } from "./RetryButton";

// ----------------------------------------------------------------------------
// Section card
// ----------------------------------------------------------------------------

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  description,
  icon,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn("premium-card overflow-hidden", className)}
      aria-label={title}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
              {icon}
            </span>
          )}
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-slate-400">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function SectionIcon({ name }: { name: "signals" | "research" | "enrichment" | "intelligence" | "credits" }) {
  return <DashboardIcon name={name} size={16} />;
}

// ----------------------------------------------------------------------------
// Compact inline error state (per-section, NOT the global boundary)
// ----------------------------------------------------------------------------

interface SectionErrorProps {
  title: string;
}

export function SectionError({ title }: SectionErrorProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-5">
      <p className="text-sm text-slate-500">Unable to load {title}.</p>
      <RetryButton />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Compact empty states
// ----------------------------------------------------------------------------

interface SectionEmptyProps {
  title: string;
  description: string;
}

export function SectionEmpty({ title, description }: SectionEmptyProps) {
  return (
    <div className="px-5 py-6">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Skeletons (structure appears immediately; numbers populate later)
// ----------------------------------------------------------------------------

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-slate-50" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-3.5">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-44 max-w-full" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-3 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function PriorityIntelligenceSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-hidden="true">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-3 h-4 w-52 max-w-full" />
          <Skeleton className="mt-2 h-3 w-full max-w-md" />
          <Skeleton className="mt-4 h-7 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function SignalsSectionSkeleton() {
  return <ListSkeleton rows={4} />;
}

export function RecentActivitySkeleton() {
  return <ListSkeleton rows={4} />;
}

export function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-100 sm:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white px-5 py-4">
          <Skeleton className="h-3 w-24 max-w-full" />
          <Skeleton className="mt-2.5 h-6 w-10" />
        </div>
      ))}
    </div>
  );
}
