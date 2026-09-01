"use client";

import type { ImportHistoryRecord } from "@/features/io/types";

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Compact record of recent imports. Read-only — preserves the existing
 * import history without adding unrequested management features.
 */
export function HistoryStrip({ records }: { records: ImportHistoryRecord[] }) {
  return (
    <div className="mt-8">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent imports</h3>
      <div className="premium-card overflow-hidden">
        <ul className="divide-y divide-slate-50">
          {records.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
              <svg
                className="h-4 w-4 shrink-0 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800" title={r.file_name}>
                {r.file_name}
              </span>
              <span className="text-xs text-slate-500">
                {r.total_rows.toLocaleString()} rows · {r.imported_rows.toLocaleString()} imported
              </span>
              <span className="text-xs text-slate-400">{r.created_at ? formatDate(r.created_at) : ""}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}