"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { autoMapColumn, PROSPECT_FIELDS } from "../types";

interface ColumnMapperProps {
  headers: string[];
  mapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
  className?: string;
}

export function ColumnMapper({ headers, mapping, onChange, className }: ColumnMapperProps) {
  const autoMapped = useMemo(() => {
    const result: Record<string, string> = {};
    for (const header of headers) {
      const auto = autoMapColumn(header);
      if (auto) result[header] = auto;
    }
    return result;
  }, [headers]);

  // Initialize mapping with auto-detected values if not provided
  const effectiveMapping = useMemo(() => {
    if (Object.keys(mapping).length === 0) {
      return autoMapped;
    }
    return mapping;
  }, [autoMapped, mapping]);

  const usedTargets = new Set(Object.values(effectiveMapping).filter(Boolean));
  const unmappedHeaders = headers.filter((h) => !effectiveMapping[h]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">Map your columns to Prosventa fields</p>
        {autoMapped && Object.keys(autoMapped).length > 0 && (
          <button
            type="button"
            onClick={() => {
              const reset: Record<string, string> = {};
              for (const header of headers) {
                const auto = autoMapColumn(header);
                if (auto) reset[header] = auto;
              }
              onChange(reset);
            }}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Auto-map
          </button>
        )}
      </div>

      <div className="space-y-2">
        {headers.map((header) => {
          const current = effectiveMapping[header] ?? "";
          const isAutoMapped = Boolean(autoMapped[header]);
          const hasMapping = Boolean(current);

          return (
            <div key={header} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              {/* Source column */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold shrink-0",
                      isAutoMapped ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    ✓
                  </span>
                  <span className="text-xs font-medium text-slate-700 truncate">{header}</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center text-slate-300">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>

              {/* Target field select */}
              <select
                value={current}
                onChange={(e) => {
                  const next = { ...effectiveMapping, [header]: e.target.value };
                  onChange(next);
                }}
                className={cn(
                  "w-full px-3 py-1.5 text-xs rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors",
                  hasMapping
                    ? isAutoMapped
                      ? "border-green-300 text-green-700"
                      : "border-slate-300 text-slate-700"
                    : "border-slate-200 text-slate-400"
                )}
              >
                <option value="">— Do not import —</option>
                {PROSPECT_FIELDS.map((field) => (
                  <option
                    key={field.value}
                    value={field.value}
                    disabled={field.value !== current && usedTargets.has(field.value)}
                  >
                    {field.label}
                    {field.required ? " *" : ""}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {unmappedHeaders.length > 0 && (
        <p className="text-[11px] text-amber-600">
          {unmappedHeaders.length} column{unmappedHeaders.length > 1 ? "s" : ""} unmapped: {unmappedHeaders.join(", ")}
        </p>
      )}
    </div>
  );
}