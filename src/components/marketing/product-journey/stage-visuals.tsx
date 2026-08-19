"use client";

import { ArrowRight, Building2 } from "lucide-react";

function StageLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </p>
  );
}

/**
 * Stage 01 — Discover.
 * A small collection of anonymous company indicators.
 * Abstract placeholder bars only — no real prospect data.
 */
export function DiscoverVisual() {
  const rows = [true, true, false];
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 transition-colors duration-200 group-hover:border-slate-300">
      <StageLabel>Prospects</StageLabel>
      <div className="mt-2.5 flex flex-1 flex-col justify-center gap-1.5">
        {rows.map((matched, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 rounded-lg border px-2 py-[7px] transition-colors duration-200 ${
              matched
                ? "border-slate-200 bg-slate-50/70 group-hover:border-blue-100 group-hover:bg-blue-50/40"
                : "border-slate-100 bg-slate-50/40"
            }`}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} />
            <div className="h-1.5 w-12 rounded-full bg-slate-200 transition-colors duration-200 group-hover:bg-slate-300" />
            <span
              className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-200 ${
                matched ? "bg-blue-400" : "bg-slate-200"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Stage 02 — Understand.
 * A compact company intelligence representation.
 */
export function UnderstandVisual() {
  const rows = [
    {
      label: "Firmographics",
      dot: "bg-emerald-400",
      status: "Available",
      statusClass: "text-emerald-600",
    },
    {
      label: "Signals",
      dot: "bg-blue-400",
      status: "Detected",
      statusClass: "text-blue-600",
    },
    {
      label: "Intent",
      dot: "bg-slate-300",
      status: "Pending",
      statusClass: "text-slate-500",
    },
  ];
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 transition-colors duration-200 group-hover:border-slate-300">
      <StageLabel>Company intelligence</StageLabel>
      <div className="mt-2.5 flex flex-1 flex-col justify-center gap-0.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-md px-1.5 py-1"
          >
            <span className="text-[12px] text-slate-600">{row.label}</span>
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${row.dot}`} />
              <span className={`text-[11px] font-medium ${row.statusClass}`}>
                {row.status}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Stage 03 — Prioritize.
 * A visual ranking / match indicator.
 */
export function PrioritizeVisual() {
  const segments = [true, true, true, true, false];
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 transition-colors duration-200 group-hover:border-slate-300">
      <StageLabel>Match strength</StageLabel>
      <div className="mt-auto pb-0.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">High fit</span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Priority
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1">
          {segments.map((filled, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                filled
                  ? "bg-gradient-to-r from-blue-500 to-blue-400 group-hover:from-blue-600 group-hover:to-blue-500"
                  : "bg-slate-100 group-hover:bg-blue-100"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Stage 04 — Act.
 * A next-step / recommendation indicator.
 */
export function ActVisual() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition-colors duration-200 group-hover:border-blue-200 group-hover:bg-blue-50/30">
      <StageLabel>Suggested next step</StageLabel>
      <div className="mt-auto">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2 transition-colors duration-200 group-hover:border-blue-200">
          <span className="text-[13px] font-medium text-slate-900">Reach out</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-transform duration-200 group-hover:translate-x-0.5">
            <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </div>
  );
}