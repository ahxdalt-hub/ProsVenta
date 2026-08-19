"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface PreviewTableProps {
  headers: string[];
  rows: Record<string, string>[];
  maxRows?: number;
  className?: string;
}

export function PreviewTable({ headers, rows, maxRows = 10, className }: PreviewTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = maxRows;

  const displayHeaders = useMemo(
    () => headers.filter((h) => !h.startsWith("_")),
    [headers]
  );

  const totalPages = Math.ceil(rows.length / pageSize);
  const displayRows = rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  if (rows.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-sm text-slate-400", className)}>
        No data to preview
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 font-semibold text-slate-600 whitespace-nowrap w-10">
                #
              </th>
              {displayHeaders.map((header) => (
                <th
                  key={header}
                  className="text-left px-4 py-2.5 font-semibold text-slate-600 whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => {
              const rowNum = currentPage * pageSize + rowIndex + 1;
              const isValid = row._isValid !== "false";
              return (
                <tr
                  key={rowIndex}
                  className={cn(
                    "border-b border-slate-100 last:border-0",
                    !isValid && "bg-red-50/50",
                    rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                  )}
                >
                  <td className="px-4 py-2 text-slate-400 font-mono text-[11px]">
                    {rowNum}
                  </td>
                  {displayHeaders.map((header) => (
                    <td
                      key={header}
                      className={cn(
                        "px-4 py-2 text-slate-700 whitespace-nowrap max-w-[200px] truncate",
                        !isValid && "text-red-600"
                      )}
                      title={row[header]}
                    >
                      {row[header] || (
                        <span className="text-slate-300 italic">empty</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, rows.length)} of {rows.length} rows
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}