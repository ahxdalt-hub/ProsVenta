import { DashboardIcon, type IconName } from "../navigation/icons";
import { Card } from "@/components/ui/Card";
/* ---------------------------------------------------------------- */ /* Page skeleton — premium loading placeholder for route pages */ /* ---------------------------------------------------------------- */ export function PageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading page">
      {" "}
      <div className="space-y-3">
        {" "}
        <div className="premium-skeleton h-8 w-56 max-w-full" />{" "}
        <div className="premium-skeleton h-4 w-80 max-w-full" />{" "}
      </div>{" "}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {" "}
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            {" "}
            <div className="p-6">
              {" "}
              <div className="premium-skeleton h-4 w-24" />{" "}
              <div className="premium-skeleton mt-4 h-8 w-16" />{" "}
              <div className="premium-skeleton mt-3 h-3 w-40" />{" "}
            </div>{" "}
          </Card>
        ))}{" "}
      </div>{" "}
    </div>
  );
}
/* ---------------------------------------------------------------- */ /* Card skeleton — generic card loading state */ /* ---------------------------------------------------------------- */ export function CardSkeleton() {
  return (
    <Card>
      {" "}
      <div className="p-6 space-y-4">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div className="premium-skeleton h-4 w-28" />{" "}
          <div className="premium-skeleton h-8 w-8 rounded-lg" />{" "}
        </div>{" "}
        <div className="premium-skeleton h-7 w-20" />{" "}
        <div className="premium-skeleton h-3 w-48" />{" "}
      </div>{" "}
    </Card>
  );
}
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {" "}
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}{" "}
    </div>
  );
}
/* ---------------------------------------------------------------- */ /* Table skeleton — premium loading placeholder for data tables */ /* ---------------------------------------------------------------- */ export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div
      className="premium-card overflow-hidden"
      aria-busy="true"
      aria-label="Loading table"
    >
      {" "}
      {/* Header row */}{" "}
      <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3">
        {" "}
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="premium-skeleton h-3.5 flex-1"
            style={{ maxWidth: i === 0 ? "40%" : undefined }}
          />
        ))}{" "}
      </div>{" "}
      {/* Body rows */}{" "}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-4 border-b border-slate-50 px-4 py-3.5 last:border-b-0"
        >
          {" "}
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="premium-skeleton h-3.5 flex-1"
              style={{
                maxWidth:
                  colIdx === 0
                    ? "40%"
                    : colIdx === columns - 1
                      ? "20%"
                      : undefined,
                opacity: 1 - rowIdx * 0.08,
              }}
            />
          ))}{" "}
        </div>
      ))}{" "}
    </div>
  );
}
/* ---------------------------------------------------------------- */ /* Chart skeleton — premium loading placeholder for analytics */ /* ---------------------------------------------------------------- */ export function ChartSkeleton() {
  return (
    <div
      className="premium-card p-6"
      aria-busy="true"
      aria-label="Loading chart"
    >
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div className="premium-skeleton h-4 w-32" />{" "}
        <div className="premium-skeleton h-8 w-8 rounded-lg" />{" "}
      </div>{" "}
      <div className="mt-6 flex h-48 items-end gap-2">
        {" "}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="premium-skeleton flex-1 rounded-t-md"
            style={{ height: `${30 + ((i * 37) % 60)}%` }}
          />
        ))}{" "}
      </div>{" "}
    </div>
  );
}
/* ---------------------------------------------------------------- */ /* Profile skeleton — premium loading placeholder for settings */ /* ---------------------------------------------------------------- */ export function ProfileSkeleton() {
  return (
    <div
      className="premium-card p-6"
      aria-busy="true"
      aria-label="Loading profile"
    >
      {" "}
      <div className="flex items-center gap-4">
        {" "}
        <div className="premium-skeleton h-16 w-16 rounded-2xl" />{" "}
        <div className="flex-1 space-y-2">
          {" "}
          <div className="premium-skeleton h-4 w-40" />{" "}
          <div className="premium-skeleton h-3 w-56" />{" "}
        </div>{" "}
      </div>{" "}
      <div className="mt-6 space-y-4">
        {" "}
        <div className="premium-skeleton h-10 w-full" />{" "}
        <div className="premium-skeleton h-10 w-full" />{" "}
        <div className="premium-skeleton h-10 w-full" />{" "}
      </div>{" "}
    </div>
  );
}
/* ---------------------------------------------------------------- */ /* Empty state — premium placeholder, no fake content */ /* ---------------------------------------------------------------- */ interface EmptyStateProps {
  title: string;
  description: string;
  icon?: IconName;
}
export function DashboardEmptyState({
  title,
  description,
  icon = "sparkles",
}: EmptyStateProps) {
  return (
    <div className="premium-card flex flex-col items-center justify-center px-6 py-16 text-center">
      {" "}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        {" "}
        <DashboardIcon name={icon} size={22} />{" "}
      </div>{" "}
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>{" "}
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>{" "}
    </div>
  );
}
/* ---------------------------------------------------------------- */ /* Error state — premium error placeholder */ /* ---------------------------------------------------------------- */ interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}
export function DashboardErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred while rendering this page. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="premium-card flex flex-col items-center justify-center px-6 py-16 text-center">
      {" "}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
        {" "}
        <DashboardIcon name="x" size={22} />{" "}
      </div>{" "}
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>{" "}
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>{" "}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-press mt-6 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-navy-800 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {" "}
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {" "}
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />{" "}
            <path d="M3 3v5h5" />{" "}
          </svg>{" "}
          Try again{" "}
        </button>
      )}{" "}
    </div>
  );
}
