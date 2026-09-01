"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { ImportProspectsResult } from "@/features/io/actions";

interface ResultsStepProps {
  parsedFileName: string;
  parsedDuplicates: number;
  result: ImportProspectsResult;
  onImportAnother: () => void;
  onAddToList: () => void;
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "red" }) {
  const tones = {
    green: "text-green-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tracking-tight ${tones[tone]}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

/**
 * Import completion summary. Splits results into imported / duplicates removed /
 * couldn't import — a partially failed import is never presented as a total
 * failure. Offers honest next steps (View prospects, Add to list).
 */
export function ResultsStep({
  parsedFileName,
  parsedDuplicates,
  result,
  onImportAnother,
  onAddToList,
}: ResultsStepProps) {
  const summary = result.summary;

  if (result.error) {
    return (
      <div className="premium-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 8v4m0 4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z" />
          </svg>
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900">Import couldn&apos;t be completed</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{result.error}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="ghost" onClick={onImportAnother}>
            Choose a different file
          </Button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="premium-card p-8 text-center text-sm text-slate-500">
        Nothing was imported from {parsedFileName}.
        <div className="mt-6 flex justify-center">
          <Button variant="ghost" onClick={onImportAnother}>
            Start over
          </Button>
        </div>
      </div>
    );
  }

  const imported = summary.imported ?? 0;
  const couldNotImport = summary.failed ?? 0;

  return (
    <div className="premium-card overflow-hidden">
      <div className="flex h-1.5 w-full bg-slate-100" aria-hidden="true">
        <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${summary.imported > 0 ? 100 : 0}%` }} />
      </div>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-600">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {imported > 0 ? "Import complete" : "Import finished"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {result.message ?? `${imported} prospect${imported === 1 ? "" : "s"} added from ${parsedFileName}.`}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Imported" value={imported} tone="green" />
          <Stat label="Duplicates removed" value={parsedDuplicates} tone="amber" />
          <Stat label="Couldn't import" value={couldNotImport} tone="red" />
        </div>

        {couldNotImport > 0 && (
          <p className="mt-4 text-xs text-slate-500">
            {couldNotImport.toLocaleString()} row{couldNotImport === 1 ? "" : "s"} from this file
            couldn&apos;t be imported, usually because key details were missing or invalid. The
            rest were added successfully.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
          <Link
            href="/dashboard/prospects?recent_import=1"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
          >
            View prospects
          </Link>
          {imported > 0 && (
            <Button variant="secondary" onClick={onAddToList} disabled={!(summary.ids && summary.ids.length > 0)}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Add to list
            </Button>
          )}
          <div className="ml-auto">
            <Button variant="ghost" onClick={onImportAnother}>
              Import another file
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}