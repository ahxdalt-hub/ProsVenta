"use client";

import type { ParsedFile } from "@/features/io/types";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export interface ReviewData {
  valid: number;
  invalid: number;
}

export interface ProspectCapacity {
  limitValue: number | null;
  currentUsage: number;
  remaining: number | null;
}

interface ReviewStepProps {
  parsed: ParsedFile;
  review: ReviewData | null;
  reviewError: string | null;
  capacity: ProspectCapacity | null;
  isImporting: boolean;
  onBack: () => void;
  onImport: () => void;
}

export function ReviewStep({
  parsed,
  review,
  reviewError,
  capacity,
  isImporting,
  onBack,
  onImport,
}: ReviewStepProps) {
  const total = parsed.rows.length;
  const duplicates = parsed.duplicateCount ?? 0;

  const overCapacity =
    capacity !== null &&
    capacity.remaining !== null &&
    total > capacity.remaining;

  return (
    <div className="space-y-5">
      <div className="premium-card p-5">
        <h2 className="text-sm font-semibold text-slate-900">Ready to import</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {parsed.fileName}
          {" · "}
          {total.toLocaleString()} rows
        </p>

        {reviewError ? (
          <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {reviewError}
          </div>
        ) : review === null ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-slate-100 p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-7 w-12" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Rows detected
              </p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                {total.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-green-100 bg-green-50/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-green-600">Valid</p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                {review.valid.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                Need attention
              </p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                {review.invalid.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Duplicates</p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                {duplicates.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {review && review.invalid > 0 && (
          <p className="mt-4 text-xs text-slate-500">
            Rows that need attention won&apos;t be imported — the rest will.
          </p>
        )}

        {overCapacity && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
          >
            {capacity?.remaining === 0
              ? "You've reached your plan's prospect limit. This import can't add new prospects until you free up space or upgrade."
              : `Your plan allows ${capacity?.remaining?.toLocaleString()} more prospect${
                  capacity?.remaining === 1 ? "" : "s"
                }. This file has ${total.toLocaleString()} rows, so the import may be blocked before it starts.`}
          </div>
        )}

        {capacity && capacity.limitValue !== null && capacity.remaining !== null && !overCapacity && (
          <p className="mt-3 text-xs text-slate-400">
            Plan capacity: {capacity.currentUsage.toLocaleString()} of{" "}
            {capacity.limitValue.toLocaleString()} prospects used ·{" "}
            {capacity.remaining.toLocaleString()} available.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isImporting}>
          Back
        </Button>
        <Button onClick={onImport} loading={isImporting} size="lg">
          Import {review ? `${review.valid.toLocaleString()} prospect${review.valid === 1 ? "" : "s"}` : "prospects"}
        </Button>
      </div>
    </div>
  );
}

export function ReviewSkeleton() {
  return (
    <div className="premium-card p-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-56" />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-100 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}