"use client";

// ============================================================================
// Light page-level entrance animation (Phase 1 scope only).
// Client Component — framer-motion must never run inside Server Components.
// Respects prefers-reduced-motion; never delays content meaningfully
// (180–300ms fade + small translate, space is always occupied).
// ============================================================================

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
