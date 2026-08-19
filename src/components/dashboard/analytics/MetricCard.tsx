"use client";

import { motion } from "framer-motion";
import { DashboardIcon, type IconName } from "@/components/dashboard/navigation/icons";
import { AnimatedCounter } from "./AnimatedCounter";
import { TrendBadge, type TrendDirection } from "./TrendBadge";
import { listItem } from "@/lib/motion";

interface MetricCardProps {
  label: string;
  value: number;
  icon: IconName;
  iconColor?: string;
  iconBg?: string;
  trend?: TrendDirection;
  trendValue?: number;
  trendLabel?: string;
  format?: "number" | "percent" | "currency";
  decimals?: number;
  hint?: string;
}

/**
 * Premium executive KPI card with animated counter, trend indicator,
 * and elegant spacing. Used in the main KPI grid.
 */
export function MetricCard({
  label,
  value,
  icon,
  iconColor = "text-blue-600",
  iconBg = "bg-blue-50",
  trend,
  trendValue,
  trendLabel,
  format = "number",
  decimals = 0,
  hint,
}: MetricCardProps) {
  const formattedValue = formatValue(value, format, decimals);

  return (
    <motion.div
      variants={listItem}
      className="premium-card group relative overflow-hidden p-5"
    >
      {/* Subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
          <DashboardIcon name={icon} size={18} />
        </div>
        {trend && (
          <TrendBadge direction={trend} value={trendValue} label={trendLabel} />
        )}
      </div>

      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {format === "number" ? (
            <AnimatedCounter value={value} />
          ) : (
            formattedValue
          )}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
    </motion.div>
  );
}

function formatValue(value: number, format: "number" | "percent" | "currency", decimals: number): string {
  switch (format) {
    case "percent":
      return `${value.toFixed(decimals)}%`;
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: decimals,
      }).format(value);
    default:
      return value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
  }
}