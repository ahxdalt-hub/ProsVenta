// ============================================================================
// Prosventa AI — Shared UI Primitives
// Stage 3 — Phase 2: AI-Powered Prospect Intelligence Platform
// ============================================================================
// Reusable, memoized components for AI insight presentation.
// All components follow the Prosventa enterprise design language.
// ============================================================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AIConfidence } from "../types";

// ============================================================================
// Confidence Indicator
// ============================================================================

interface ConfidenceIndicatorProps {
  confidence: AIConfidence;
  className?: string;
}

export const ConfidenceIndicator = memo(function ConfidenceIndicator({
  confidence,
  className,
}: ConfidenceIndicatorProps) {
  const colorClass =
    confidence.level === "high"
      ? "text-green-600 bg-green-50 border-green-100"
      : confidence.level === "medium"
        ? "text-amber-600 bg-amber-50 border-amber-100"
        : "text-slate-500 bg-slate-50 border-slate-100";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        colorClass,
        className
      )}
      title={`Confidence: ${confidence.score}%`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {confidence.label} · {confidence.score}%
    </span>
  );
});

// ============================================================================
// AI Insight Card — Base Container
// ============================================================================

interface AIInsightCardProps {
  title: string;
  icon?: React.ReactNode;
  confidence?: AIConfidence;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const AIInsightCard = memo(function AIInsightCard({
  title,
  icon,
  confidence,
  children,
  className,
  action,
}: AIInsightCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn("premium-card p-4", className)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-600 shrink-0">
              {icon}
            </span>
          )}
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {confidence && <ConfidenceIndicator confidence={confidence} />}
          {action}
        </div>
      </div>
      {children}
    </motion.div>
  );
});

// ============================================================================
// Score Ring — Elegant Progress Indicator
// ============================================================================

interface ScoreRingProps {
  value: number;
  label: string;
  size?: "sm" | "md";
}

export const ScoreRing = memo(function ScoreRing({ value, label, size = "md" }: ScoreRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (clamped / 100) * circumference;

  const colorClass =
    clamped >= 80
      ? "text-green-600"
      : clamped >= 60
        ? "text-blue-600"
        : clamped >= 40
          ? "text-amber-500"
          : "text-slate-400";

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16 shrink-0" role="img" aria-label={`${label}: ${clamped} out of 100`}>
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="5" className="text-slate-100" />
          <motion.circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={colorClass}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900">
          {clamped}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
      </div>
    </div>
  );
});

// ============================================================================
// Score Bar — Slim Horizontal Progress
// ============================================================================

interface ScoreBarProps {
  value: number;
  label: string;
  className?: string;
}

export const ScoreBar = memo(function ScoreBar({ value, label, className }: ScoreBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  const colorClass =
    clamped >= 80
      ? "bg-green-500"
      : clamped >= 60
        ? "bg-blue-500"
        : clamped >= 40
          ? "bg-amber-400"
          : "bg-slate-300";

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="text-xs font-bold text-slate-900">{clamped}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <motion.div
          className={cn("h-full rounded-full", colorClass)}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
});

// ============================================================================
// Info Row — Company Information Display
// ============================================================================

interface InfoRowProps {
  label: string;
  value: string | number | null;
  href?: string | null;
}

export const InfoRow = memo(function InfoRow({ label, value, href }: InfoRowProps) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs font-medium text-slate-400 shrink-0">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-700 hover:underline truncate text-right max-w-[60%]"
        >
          {value}
        </a>
      ) : (
        <span className="text-xs text-slate-700 font-medium text-right truncate max-w-[60%]">{value}</span>
      )}
    </div>
  );
});

// ============================================================================
// Severity Badge — For Risks & Opportunities
// ============================================================================

interface SeverityBadgeProps {
  level: "high" | "medium" | "low";
  tone?: "risk" | "opportunity";
}

export const SeverityBadge = memo(function SeverityBadge({ level, tone = "risk" }: SeverityBadgeProps) {
  const styles =
    tone === "risk"
      ? {
          high: "bg-red-50 text-red-600 border-red-100",
          medium: "bg-amber-50 text-amber-600 border-amber-100",
          low: "bg-slate-50 text-slate-500 border-slate-100",
        }
      : {
          high: "bg-green-50 text-green-600 border-green-100",
          medium: "bg-blue-50 text-blue-600 border-blue-100",
          low: "bg-slate-50 text-slate-500 border-slate-100",
        };

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", styles[level])}>
      {level}
    </span>
  );
});

// ============================================================================
// Priority Badge — For Recommendations
// ============================================================================

interface PriorityBadgeProps {
  priority: "high" | "medium" | "low";
}

export const PriorityBadge = memo(function PriorityBadge({ priority }: PriorityBadgeProps) {
  const styles = {
    high: "bg-blue-50 text-blue-600 border-blue-100",
    medium: "bg-slate-50 text-slate-500 border-slate-100",
    low: "bg-slate-50 text-slate-400 border-slate-100",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", styles[priority])}>
      {priority}
    </span>
  );
});