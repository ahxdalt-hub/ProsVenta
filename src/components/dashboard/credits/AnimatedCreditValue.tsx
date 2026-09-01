"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { transitions } from "@/lib/motion";

// ============================================================================
// AnimatedCreditValue — smooth balance transitions
// Stage 8 — Phase 5
// ============================================================================
// Animates the TRANSITION between two backend-confirmed values (5,240 → 5,235).
// Never fakes a deduction before confirmation: callers only render values they
// actually received from the server. Uses transform/opacity only (60 FPS) and
// respects reduced motion.
// ============================================================================

export function AnimatedCreditValue({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const formatted = new Intl.NumberFormat("en-US").format(Math.round(value));

  if (reduce) return <span className="tabular-nums">{formatted}</span>;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={formatted}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={transitions.base}
        className="inline-block tabular-nums"
      >
        {formatted}
      </motion.span>
    </AnimatePresence>
  );
}

/**
 * Subtle one-shot success pulse for the credit token after a CONFIRMED
 * purchase. Restrained: a single scale pulse — no glow loops, no confetti.
 */
export function CreditTokenPulse({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [fired, setFired] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      setFired(true);
    }
  }, []);

  if (reduce || !fired) return <>{children}</>;
  return (
    <motion.span
      initial={{ scale: 0.85 }}
      animate={{ scale: [0.85, 1.08, 1] }}
      transition={{ duration: 0.45, times: [0, 0.6, 1], ease: "easeOut" }}
      className="inline-flex"
    >
      {children}
    </motion.span>
  );
}

/** "+10,000 Prosventa Credits" reveal used on payment success. */
export function CreditGainReveal({ amount }: { amount: number }) {
  const reduce = useReducedMotion();
  const formatted = new Intl.NumberFormat("en-US").format(amount);
  if (reduce) {
    return (
      <p className="text-lg font-semibold text-green-700">+{formatted}</p>
    );
  }
  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.slow}
      className="text-2xl font-bold tracking-tight text-green-700 tabular-nums"
      role="status"
    >
      +{formatted}
    </motion.p>
  );
}
