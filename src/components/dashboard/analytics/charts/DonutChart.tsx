"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { EASE_OUT, DURATION } from "@/lib/motion";
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
}
/** * Premium SVG donut chart for distribution data (e.g. prospect status). * Segments animate in, center shows total, and a legend lists each segment. * Hover highlights a segment. Responsive and dark-mode compatible. */ export function DonutChart({
  data,
  size = 160,
  thickness = 18,
  centerLabel = "Total",
}: DonutChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const total = useMemo(
    () => data.reduce((sum, d) => sum + d.value, 0),
    [data],
  );
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const segments = useMemo(() => {
    if (total === 0) return [];
    let offset = 0;
    return data.map((item) => {
      const percentage = item.value / total;
      const dashLength = percentage * circumference;
      const segment = {
        ...item,
        percentage,
        dashLength,
        dashOffset: circumference - offset,
      };
      offset += dashLength;
      return segment;
    });
  }, [data, total, circumference]);
  if (total === 0) return null;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      {" "}
      {/* Donut */}{" "}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {" "}
        <svg width={size} height={size} className="-rotate-90">
          {" "}
          {/* Background track */}{" "}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.06}
            strokeWidth={thickness}
          />{" "}
          {/* Segments */}{" "}
          {segments.map((seg, i) => (
            <motion.circle
              key={seg.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={hoverIndex === i ? thickness + 4 : thickness}
              strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{
                strokeDasharray: `${seg.dashLength} ${circumference - seg.dashLength}`,
                strokeWidth: hoverIndex === i ? thickness + 4 : thickness,
              }}
              transition={{
                duration: DURATION.slow,
                ease: EASE_OUT,
                delay: i * 0.04,
                strokeWidth: { duration: DURATION.fast },
              }}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ cursor: "pointer" }}
            />
          ))}{" "}
        </svg>{" "}
        {/* Center label */}{" "}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {" "}
          <span className="text-2xl font-bold tabular-nums text-slate-900">
            {" "}
            {hoverIndex !== null ? data[hoverIndex].value : total}{" "}
          </span>{" "}
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {" "}
            {hoverIndex !== null ? data[hoverIndex].label : centerLabel}{" "}
          </span>{" "}
        </div>{" "}
      </div>{" "}
      {/* Legend */}{" "}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-1">
        {" "}
        {data.map((item, i) => (
          <button
            key={item.label}
            type="button"
            className="flex items-center gap-2.5 text-left transition-opacity"
            style={{
              opacity: hoverIndex !== null && hoverIndex !== i ? 0.5 : 1,
            }}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {" "}
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />{" "}
            <span className="text-sm font-medium text-slate-600">
              {" "}
              {item.label}{" "}
            </span>{" "}
            <span className="ml-auto text-sm font-semibold tabular-nums text-slate-700">
              {" "}
              {item.value}{" "}
            </span>{" "}
            <span className="w-10 text-right text-xs text-slate-400">
              {" "}
              {total > 0 ? Math.round((item.value / total) * 100) : 0}%{" "}
            </span>{" "}
          </button>
        ))}{" "}
      </div>{" "}
    </div>
  );
}
