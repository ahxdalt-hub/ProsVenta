"use client";

import { cn } from "@/lib/utils";
import type { ImportSummary } from "../types";

interface SummaryCardProps {
  summary: ImportSummary;
  fileName: string;
  onImportAnother: () => void;
  onDownloadErrors: () => void;
  className?: string;
}

export function SummaryCard({ summary, fileName, onImportAnother, onDownloadErrors, className }: SummaryCardProps) {
  const { imported, skipped, updated, failed, duplicates } = summary;
  const hasErrors = failed > 0;

  const stats = [
    { label: "Imported", value: imported, color: "text-green-600", bg: "bg-green-50" },
    { label: "Skipped", value: skipped, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Updated", value: updated, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Failed", value: failed, color: hasErrors ? "text-red-600" : "text-slate-500", bg: hasErrors ? "bg-red-50" : "bg-slate-50" },
  ];

  return (
    <div className={cn("premium-card p-6", className)}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-2xl shrink-0",
          hasErrors ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"
        )}>
          {hasErrors ? (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ) : (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="8 12.5 10.5 15 16 9" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900">
            Import {hasErrors ? "completed with warnings" : "completed successfully"}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 truncate">{fileName}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={cn("rounded-xl p-3.5", stat.bg)}>
            <p className="text-[11px] font-medium text-slate-500">{stat.label}</p>
            <p className={cn("mt-1 text-2xl font-bold", stat.color)}>
              {stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {duplicates > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          {duplicates.toLocaleString()} duplicate{duplicates > 1 ? "s" : ""} detected and handled
        </p>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onImportAnother}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
        >
          Import another file
        </button>
        {hasErrors && (
          <button
            type="button"
            onClick={onDownloadErrors}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 18 15 15" />
            </svg>
            Download error report
          </button>
        )}
      </div>
    </div>
  );
}