"use client";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

export type VeracityLevel = "verified" | "high" | "medium" | "low" | "unknown";

export function veracityFromConfidence(confidence: number | null | undefined): VeracityLevel {
  if (confidence === null || confidence === undefined) return "unknown";
  if (confidence >= 80) return "high";
  if (confidence >= 50) return "medium";
  return "low";
}

export function veracityLabel(level: VeracityLevel): string {
  switch (level) {
    case "verified": return "Verified";
    case "high": return "High confidence";
    case "medium": return "Medium confidence";
    case "low": return "Low confidence";
    case "unknown": return "Unknown";
  }
}

const DOT_STYLES: Record<VeracityLevel, string> = {
  verified: "bg-emerald-500",
  high: "bg-blue-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
  unknown: "bg-transparent border border-dashed border-slate-400",
};

const BADGE_STYLES: Record<VeracityLevel, string> = {
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  high: "bg-blue-50 text-blue-700 border-blue-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-50 text-slate-600 border-slate-200",
  unknown: "bg-slate-50 text-slate-500 border-slate-200",
};

export function ConfidenceBadge({ level, className, confidence }: { level: VeracityLevel; className?: string; confidence?: number | null }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", BADGE_STYLES[level], className)}
      title={veracityLabel(level)}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT_STYLES[level])} aria-hidden="true" />
      {veracityLabel(level)}
      {confidence !== null && confidence !== undefined && <span className="opacity-70">{confidence}%</span>}
    </span>
  );
}

export function SourceAttribution({ source, retrievedAt, className }: { source: string | null; retrievedAt: string | null; className?: string }) {
  if (!source) return null;
  return (
    <p className={cn("text-[11px] text-slate-400", className)}>
      Source: {source}
      {retrievedAt && ` · ${formatDate(retrievedAt)}`}
    </p>
  );
}

export function FactRow({ label, value, source, retrievedAt, confidence, level }: {
  label: string;
  value: string | null;
  source?: string | null;
  retrievedAt?: string | null;
  confidence?: number | null;
  level?: VeracityLevel;
}) {
  const computed = level ?? veracityFromConfidence(confidence);
  const hasValue = Boolean(value && value.trim().length > 0);
  return (
    <div className="py-1.5 border-b border-slate-50 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">{label}</p>
          <p className={cn("text-sm text-slate-800 truncate", !hasValue && "italic text-slate-400")}>
            {hasValue ? value : "Not available"}
          </p>
        </div>
        <ConfidenceBadge level={hasValue ? computed : "unknown"} confidence={hasValue ? confidence : null} className="shrink-0" />
      </div>
      {hasValue && source && <SourceAttribution source={source ?? null} retrievedAt={retrievedAt ?? null} className="mt-0.5" />}
    </div>
  );
}