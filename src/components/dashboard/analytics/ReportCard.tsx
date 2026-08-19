"use client";

import { motion } from "framer-motion";
import { DashboardIcon, type IconName } from "@/components/dashboard/navigation/icons";
import { listItem } from "@/lib/motion";

export type ReportFormat = "pdf" | "csv" | "excel";

interface ReportCardProps {
  format: ReportFormat;
  title: string;
  description: string;
  icon: IconName;
  iconColor: string;
  iconBg: string;
  onExport: (format: ReportFormat) => void;
  disabled?: boolean;
}

const FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: "PDF",
  csv: "CSV",
  excel: "Excel",
};

/**
 * Integrated export report card.
 * Part of the analytics layout — no floating overlays.
 * Each card represents a downloadable report format.
 */
export function ReportCard({
  format,
  title,
  description,
  icon,
  iconColor,
  iconBg,
  onExport,
  disabled = false,
}: ReportCardProps) {
  return (
    <motion.button
      variants={listItem}
      type="button"
      onClick={() => onExport(format)}
      disabled={disabled}
      className="btn-press group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
        <DashboardIcon name={icon} size={18} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
      <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {FORMAT_LABELS[format]}
      </span>
    </motion.button>
  );
}