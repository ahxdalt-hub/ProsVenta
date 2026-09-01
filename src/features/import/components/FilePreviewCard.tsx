"use client";

import type { ParsedFile } from "@/features/io/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface FilePreviewCardProps {
  parsed: ParsedFile;
  mapping: Record<string, string>;
  onContinue: () => void;
  onChooseAnother: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatRows(n: number): string {
  return n.toLocaleString();
}

export function FilePreviewCard({
  parsed,
  mapping,
  onContinue,
  onChooseAnother,
}: FilePreviewCardProps) {
  const headers = parsed.headers;
  const sample = parsed.rows.slice(0, 5);

  return (
    <div className="premium-card overflow-hidden">
      {/* File summary */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900" title={parsed.fileName}>
              {parsed.fileName}
            </p>
            <p className="text-xs text-slate-500">
              {parsed.fileType === "csv" ? "CSV" : parsed.fileType === "xlsx" ? "Excel" : "Spreadsheet"}
              {" · "}
              {formatBytes(parsed.fileSize)}
              {" · "}
              {formatRows(parsed.rows.length)} rows
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onChooseAnother}>
            Choose another file
          </Button>
          <Button size="sm" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </div>

      {/* Detected columns */}
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Detected columns
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {headers.map((h) => {
            const target = mapping[h];
            return (
              <span
                key={h}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                  target
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {target ? <polyline points="20 6 9 17 4 12" /> : <circle cx="12" cy="12" r="10" />}
                </svg>
                {h}
                {target && <span className="font-normal text-green-500">→ {target}</span>}
              </span>
            );
          })}
        </div>
      </div>

      {/* Sample rows */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {headers.map((h) => (
                <th
                  key={`th-${h}`}
                  className="whitespace-nowrap px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sample.map((row, i) => (
              <tr key={`r-${i}`}>
                {headers.map((h) => (
                  <td key={`c-${h}-${i}`} className="whitespace-nowrap px-5 py-2.5 text-xs text-slate-600">
                    {row[h] || <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 text-[11px] text-slate-400">
        {parsed.duplicateCount && parsed.duplicateCount > 0
          ? `${formatRows(parsed.duplicateCount)} duplicate row${
              parsed.duplicateCount === 1 ? "" : "s"
            } removed from this file.`
          : "Showing the first few rows."}
      </div>
    </div>
  );
}

export function FilePreviewSkeleton() {
  return (
    <div className="premium-card overflow-hidden" aria-hidden="true">
      <div className="flex items-center gap-3 border-b border-slate-100 p-5">
        <div className="premium-skeleton h-11 w-11 rounded-xl" />
        <div className="space-y-2">
          <div className="premium-skeleton h-4 w-48" />
          <div className="premium-skeleton h-3 w-32" />
        </div>
      </div>
      <div className="space-y-3 px-5 py-4">
        <div className="premium-skeleton h-3 w-32" />
        <div className="flex gap-2">
          <div className="premium-skeleton h-6 w-24 rounded-full" />
          <div className="premium-skeleton h-6 w-24 rounded-full" />
          <div className="premium-skeleton h-6 w-24 rounded-full" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2 px-5 py-2">
          <div className="premium-skeleton h-3 w-full" />
          <div className="premium-skeleton h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}