"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { ImportHistoryRecord, ExportHistoryRecord } from "../types";

interface HistoryTableProps {
  records: ImportHistoryRecord[] | ExportHistoryRecord[];
  type: "import" | "export";
  onDownload?: (record: ExportHistoryRecord) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-50 text-green-700",
  processing: "bg-blue-50 text-blue-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600")}>
      {status}
    </span>
  );
}

export function HistoryTable({ records, type, onDownload, onDelete, className }: HistoryTableProps) {
  const [filter, setFilter] = useState<"all" | "completed" | "failed" | "processing">("all");

  const filtered = useMemo(() => {
    const list = records as Array<ImportHistoryRecord | ExportHistoryRecord>;
    if (filter === "all") return list;
    return list.filter((r) => r.status === filter);
  }, [records, filter]);

  if (records.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-10 text-center", className)}>
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mb-3">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {type === "import" ? (
              <>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </>
            ) : (
              <>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </>
            )}
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-900">No {type} history yet</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-xs">
          {type === "import"
            ? "Import your first CSV or Excel file to see it here."
            : "Export your prospects to see the history here."}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters */}
      <div className="flex items-center gap-2">
        {(["all", "completed", "failed", "processing"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              filter === f
                ? "bg-navy-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Date</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">File / Format</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Rows</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Status</th>
              {type === "import" && (
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Details</th>
              )}
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Size</th>
              <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => {
              const importRecord = type === "import" ? (record as ImportHistoryRecord) : null;
              const exportRecord = type === "export" ? (record as ExportHistoryRecord) : null;
              const displayName = importRecord?.file_name ?? exportRecord?.file_name ?? "—";
              const displaySize = importRecord?.file_size ? formatFileSize(importRecord.file_size) : exportRecord?.format ?? "—";

              return (
                <tr key={record.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                    {formatDate(record.created_at)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap font-medium text-slate-700">
                    {displayName}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {record.total_rows.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={record.status} />
                  </td>
                  {type === "import" && importRecord && (
                    <td className="px-4 py-2.5 text-slate-500">
                      {importRecord.imported_rows} imported · {importRecord.failed_rows} failed
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-slate-500 uppercase text-[10px] font-medium">
                    {displaySize}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {type === "export" && exportRecord && onDownload && (
                        <button
                          type="button"
                          onClick={() => onDownload(exportRecord)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          aria-label="Download again"
                          title="Download again"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(record.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          aria-label="Delete record"
                          title="Delete record"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}