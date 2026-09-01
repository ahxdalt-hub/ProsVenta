"use client";

import type { ParsedFile } from "@/features/io/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { IMPORT_FIELDS } from "../types";
import type { ImportField } from "../types";

interface MappingStepProps {
  parsed: ParsedFile;
  mapping: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  onBack: () => void;
  onContinue: () => void;
}

const IGNORE = "__ignore__";

function fieldLabel(fields: ImportField[], value: string): string {
  return fields.find((f) => f.value === value)?.label ?? value;
}

export function MappingStep({ parsed, mapping, onChange, onBack, onContinue }: MappingStepProps) {
  const headers = parsed.headers;

  const mapped = headers.filter((h) => mapping[h]);
  const unmapped = headers.filter((h) => !mapping[h]);
  const companyMapped = headers.some((h) => mapping[h] === "company_name");

  const setSource = (header: string, value: string) => {
    const next = { ...mapping };
    if (value === IGNORE || value === "") delete next[header];
    else next[header] = value;
    onChange(next);
  };

  const FieldSelect = ({
    header,
    value,
  }: {
    header: string;
    value: string;
  }) => {
    return (
      <select
        value={value || IGNORE}
        onChange={(e) => setSource(header, e.target.value)}
        aria-label={`Map column ${header}`}
        className={cn(
          "w-full cursor-pointer appearance-none rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition-colors duration-150 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500",
          value
            ? "border-green-300 bg-green-50/40"
            : "border-amber-300 bg-amber-50/40"
        )}
      >
        <option value={IGNORE}>Ignore this column</option>
        <optgroup label="Prosventa fields">
          {IMPORT_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
              {f.required ? " (required)" : ""}
            </option>
          ))}
        </optgroup>
      </select>
    );
  };

  return (
    <div className="space-y-5">
      <div className="premium-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Map your columns</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Match each column in {parsed.fileName} to a Prosventa field.
            </p>
          </div>
          {unmapped.length > 0 ? (
            <Badge variant="warning">
              {unmapped.length} column{unmapped.length === 1 ? "" : "s"} need attention
            </Badge>
          ) : (
            <Badge variant="success">All columns covered</Badge>
          )}
        </div>

        {!companyMapped && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            Map one column to <span className="font-semibold">Company</span> (required) before
            continuing.
          </div>
        )}
      </div>

      {/* Unmapped columns first so they stand out */}
      {unmapped.length > 0 && (
        <div className="premium-card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Needs attention
            </p>
          </div>
          <ul className="divide-y divide-slate-50">
            {unmapped.map((h) => (
              <li key={h} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800" title={h}>
                    {h}
                  </p>
                  <p className="text-xs text-slate-400">Not matched automatically</p>
                </div>
                <div className="w-full sm:w-72">
                  <FieldSelect header={h} value="" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Auto-matched columns */}
      <div className="premium-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Automatically matched
          </p>
        </div>
        <ul className="divide-y divide-slate-50">
          {mapped.map((h) => {
            const target = mapping[h];
            const isRequired = target === "company_name";
            return (
              <li key={h} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800" title={h}>
                    {h}
                    {isRequired && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        Required
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-emerald-600">
                    → {target ? fieldLabel(IMPORT_FIELDS, target) : ""}
                  </p>
                </div>
                <div className="w-full sm:w-72">
                  <FieldSelect header={h} value={target} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onContinue} disabled={!companyMapped}>
          Continue
        </Button>
      </div>
    </div>
  );
}