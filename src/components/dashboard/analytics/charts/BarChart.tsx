"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  EASE_OUT,
  DURATION,
  staggerContainerFast,
  listItem,
} from "@/lib/motion";
interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  maxItems?: number;
}
/** * Premium horizontal bar chart for distribution data (industries, countries, * saved lists). Bars animate in with a stagger, grow from left to right, * and show values on the right. Responsive and dark-mode compatible. */ export function BarChart({
  data,
  color = "#3b82f6",
  maxItems = 8,
}: BarChartProps) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.value - a.value).slice(0, maxItems),
    [data, maxItems],
  );
  const maxValue = useMemo(
    () => Math.max(...sorted.map((d) => d.value), 1),
    [sorted],
  );
  if (sorted.length === 0) return null;
  return (
    <motion.div
      variants={staggerContainerFast}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {" "}
      {sorted.map((item, i) => {
        const percentage = (item.value / maxValue) * 100;
        return (
          <motion.div
            key={item.label}
            variants={listItem}
            className="group flex items-center gap-3"
          >
            {" "}
            {/* Label */}{" "}
            <div className="w-28 shrink-0 truncate text-sm font-medium text-slate-600 sm:w-36">
              {" "}
              <span className="truncate" title={item.label}>
                {item.label}
              </span>{" "}
            </div>{" "}
            {/* Bar track */}{" "}
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-100">
              {" "}
              <motion.div
                className="absolute inset-y-0 left-0 rounded-md"
                style={{
                  background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{
                  duration: DURATION.slow,
                  ease: EASE_OUT,
                  delay: i * 0.02,
                }}
              />{" "}
            </div>{" "}
            {/* Value */}{" "}
            <div className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700">
              {" "}
              {item.value}{" "}
            </div>{" "}
          </motion.div>
        );
      })}{" "}
    </motion.div>
  );
}
