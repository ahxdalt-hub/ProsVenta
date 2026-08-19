"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useElementWidth } from "../useElementSize";
import { EASE_OUT, DURATION } from "@/lib/motion";

interface AreaChartProps {
  data: { date: string; count: number }[];
  height?: number;
  color?: string;
}

const PADDING = { top: 16, right: 16, bottom: 32, left: 44 };

/**
 * Premium SVG area chart for time-series data (e.g. prospects over time).
 * Features: gradient fill, smooth line, grid lines, hover tooltip with
 * vertical indicator, responsive sizing, and fade-in animation.
 */
export function AreaChart({ data, height = 240, color = "#3b82f6" }: AreaChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartWidth = Math.max(width, 320);
  const plotWidth = chartWidth - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;

  const { points, areaPath, linePath, yTicks } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], maxCount: 0, areaPath: "", linePath: "", yTicks: [] };
    }

    const maxRaw = Math.max(...data.map((d) => d.count), 1);
    // Round up to a nice number
    const maxCount = niceMax(maxRaw);

    const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;

    const points = data.map((d, i) => {
      const x = PADDING.left + (data.length > 1 ? i * stepX : plotWidth / 2);
      const y = PADDING.top + plotHeight - (d.count / maxCount) * plotHeight;
      return { x, y, ...d };
    });

    // Build line path
    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join("");

    // Build area path (line + close to bottom)
    const baseY = PADDING.top + plotHeight;
    const areaPath =
      points.length > 0
        ? `M ${points[0].x.toFixed(2)} ${baseY} ` +
          points.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join("") +
          ` L ${points[points.length - 1].x.toFixed(2)} ${baseY} Z`
        : "";

    // Y-axis ticks (4 divisions)
    const yTicks = Array.from({ length: 5 }, (_, i) => {
      const value = Math.round((maxCount / 4) * i);
      const y = PADDING.top + plotHeight - (value / maxCount) * plotHeight;
      return { value, y };
    });

    return { points, maxCount, areaPath, linePath, yTicks };
  }, [data, plotWidth, plotHeight]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      if (points.length === 0) return;
      const rect = (e.currentTarget as SVGElement).closest("svg")?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;

      // Find nearest point
      let nearest = 0;
      let minDist = Infinity;
      points.forEach((p, i) => {
        const dist = Math.abs(p.x - mouseX);
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      });
      setHoverIndex(nearest);
    },
    [points]
  );

  const handleMouseLeave = useCallback(() => setHoverIndex(null), []);

  // Determine which x-axis labels to show (max 6)
  const labelIndices = useMemo(() => {
    if (data.length <= 6) return data.map((_, i) => i);
    const step = Math.ceil(data.length / 6);
    return Array.from({ length: Math.ceil(data.length / step) }, (_, i) => i * step);
  }, [data]);

  const gradientId = "area-gradient";

  if (data.length === 0) return null;

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={chartWidth}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="block"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={PADDING.left}
              y1={tick.y}
              x2={chartWidth - PADDING.right}
              y2={tick.y}
              stroke="currentColor"
              strokeOpacity={0.06}
              strokeWidth={1}
            />
            <text
              x={PADDING.left - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-slate-400"
              style={{ fontSize: "10px", fontWeight: 500 }}
            >
              {tick.value}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: DURATION.slow, ease: EASE_OUT }}
        />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: DURATION.slow, ease: EASE_OUT }}
        />

        {/* Hover indicator */}
        {hoverIndex !== null && points[hoverIndex] && (
          <g>
            <line
              x1={points[hoverIndex].x}
              y1={PADDING.top}
              x2={points[hoverIndex].x}
              y2={PADDING.top + plotHeight}
              stroke={color}
              strokeOpacity={0.3}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={points[hoverIndex].x}
              cy={points[hoverIndex].y}
              r={4}
              fill="white"
              stroke={color}
              strokeWidth={2}
            />
          </g>
        )}

        {/* X-axis labels */}
        {labelIndices.map((idx) => {
          if (!points[idx]) return null;
          return (
            <text
              key={idx}
              x={points[idx].x}
              y={height - 8}
              textAnchor="middle"
              className="fill-slate-400"
              style={{ fontSize: "10px", fontWeight: 500 }}
            >
              {points[idx].date}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoverIndex !== null && points[hoverIndex] && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: `${Math.min(Math.max(points[hoverIndex].x - 50, 0), chartWidth - 100)}px`,
            top: `${Math.max(points[hoverIndex].y - 50, 0)}px`,
          }}
        >
          <p className="text-xs font-medium text-slate-900">
            {points[hoverIndex].count} prospect{points[hoverIndex].count !== 1 ? "s" : ""}
          </p>
          <p className="text-[10px] text-slate-500">{points[hoverIndex].date}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Rounds up to a nice axis maximum (1, 2, 5, 10, 20, 50, 100, ...).
 */
function niceMax(value: number): number {
  if (value <= 1) return 1;
  if (value <= 2) return 2;
  if (value <= 5) return 5;

  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}