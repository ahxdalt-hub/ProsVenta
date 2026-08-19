"use client";

import { cn } from "@/lib/utils";
import type { ImportProgress } from "../types";

interface ProgressCardProps {
  progress: ImportProgress;
  totalRows: number;
  className?: string;
}

export function ProgressCard({ progress, totalRows, className }: ProgressCardProps) {
  const { rowsImported, rowsRemaining, estimatedTime, errors, progress: progressValue } = progress;
  const pct = Math.round(progressValue * 100);

  return (
    <div className={cn("premium-card p-6 space-y-5", className)}>
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-900">Importing prospects…</h4>
          <span className="text-sm font-bold text-slate-900">{pct}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-navy-700 transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-[11px] font-medium text-slate-400">Imported</p>
          <p className="mt-0.5 text-lg font-bold text-slate-900">{rowsImported.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Remaining</p>
          <p className="mt-0.5 text-lg font-bold text-slate-900">{rowsRemaining.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Est. Time</p>
          <p className="mt-0.5 text-lg font-bold text-slate-900">
            {estimatedTime < 60 ? `${estimatedTime}s` : `${Math.round(estimatedTime / 60)}m ${estimatedTime % 60}s`}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Errors</p>
          <p className={cn("mt-0.5 text-lg font-bold", errors.length > 0 ? "text-red-600" : "text-slate-900")}>
            {errors.length}
          </p>
        </div>
      </div>

      {/* Total size */}
      <p className="text-xs text-slate-400">
        Total of {totalRows.toLocaleString()} rows in this import
      </p>

      {/* Errors list */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-100 bg-red-50/50 p-3 max-h-32 overflow-y-auto space-y-1">
          {errors.slice(0, 10).map((error, index) => (
            <p key={index} className="text-xs text-red-600">
              Row {error.row}: {error.message}
            </p>
          ))}
          {errors.length > 10 && (
            <p className="text-xs text-red-400">…and {errors.length - 10} more</p>
          )}
        </div>
      )}
    </div>
  );
}