"use client";

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { transitions } from "@/lib/motion";

/**
 * Premium page transition overlay.
 * Soft blurred veil + subtle status text.
 * Uses only transform + opacity for GPU-accelerated 60 FPS animation.
 */

interface PageTransitionOverlayProps {
  active: boolean;
  statusText: string;
}

export function PageTransitionOverlay({ active, statusText }: PageTransitionOverlayProps) {
  const reduce = useReducedMotion();

  if (reduce) return null;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[9997] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transitions.fast}
          aria-hidden="true"
        >
          {/* Soft blurred veil */}
          <motion.div
            className="absolute inset-0 bg-slate-50/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitions.base}
          />

          {/* Status text */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={transitions.base}
          >
            <p className="text-[13px] font-medium tracking-tight text-slate-500">
              {statusText}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}