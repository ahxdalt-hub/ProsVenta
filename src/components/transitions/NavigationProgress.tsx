"use client";

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Premium thin top progress indicator.
 * Automatically starts during navigation and completes when rendering finishes.
 * Uses only transform + opacity for GPU-accelerated 60 FPS animation.
 */

interface NavigationProgressProps {
  active: boolean;
}

export function NavigationProgress({ active }: NavigationProgressProps) {
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  // Reset on route change
  useEffect(() => {
    setProgress(0);
    progressRef.current = 0;
    setVisible(false);
  }, [pathname]);

  // Drive progress while active
  useEffect(() => {
    if (!active) {
      // Complete the bar quickly then hide
      if (visible) {
        setProgress(1);
        const t = setTimeout(() => {
          setVisible(false);
          setProgress(0);
          progressRef.current = 0;
        }, 200);
        return () => clearTimeout(t);
      }
      return;
    }

    setVisible(true);
    setProgress(0.08);

    const startTime = performance.now();
    const duration = 1200; // max duration before we hold at 90%

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Ease out curve - fast start, slow finish
      const eased = 1 - Math.pow(1 - t, 3);
      const next = 0.08 + eased * 0.82; // max 90%

      progressRef.current = next;
      setProgress(next);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, visible]);

  if (reduce) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-x-0 top-0 z-[9998] h-[2px] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded-r-full"
            style={{
              transformOrigin: "left",
              boxShadow: "0 0 8px rgba(59, 130, 246, 0.4)",
            }}
            animate={{ scaleX: progress }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}