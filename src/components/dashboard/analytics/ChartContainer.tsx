"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
  height?: number;
  delay?: number;
}

/**
 * Premium chart container that provides consistent sizing and
 * entrance animation for all chart components.
 * Prevents layout shifts by reserving space.
 */
export function ChartContainer({
  children,
  className = "",
  height,
  delay = 0,
}: ChartContainerProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className={`relative w-full ${className}`}
      style={height ? { minHeight: height } : undefined}
    >
      {children}
    </motion.div>
  );
}