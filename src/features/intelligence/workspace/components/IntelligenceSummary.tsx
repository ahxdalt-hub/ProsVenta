// ============================================================================
// Prosventa Intelligence Workspace — Intelligence Summary
// ============================================================================
// Compact metrics from bounded COUNT queries over existing records (last 7
// days). Loads asynchronously with a skeleton — never blocks the page shell.
// ============================================================================

import { getIntelligenceSummary } from "../data";
import { Reveal } from "./Reveal";
import { SectionError, SummarySkeleton } from "./shared";

const METRICS = [
  { key: "operations", label: "Operations this week" },
  { key: "signalsDetected", label: "Signals detected" },
  { key: "researchRuns", label: "Research runs" },
  { key: "enrichmentRuns", label: "Enrichment runs" },
] as const;

export function IntelligenceSummaryFallback() {
  return (
    <div aria-hidden="true">
      <SummarySkeleton />
    </div>
  );
}

export async function IntelligenceSummary() {
  let summary;
  try {
    summary = await getIntelligenceSummary();
  } catch {
    return (
      <SectionError title="intelligence usage summary" />
    );
  }

  return (
    <Reveal>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:grid-cols-4">
        {METRICS.map((metric) => (
          <div key={metric.key} className="bg-white px-5 py-4">
            <p className="text-xs font-medium text-slate-500">{metric.label}</p>
            <p className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 tabular-nums">
              {summary[metric.key].toLocaleString("en-US")}
            </p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
