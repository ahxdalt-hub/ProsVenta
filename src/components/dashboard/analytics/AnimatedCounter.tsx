"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  /** Duration in milliseconds (max 250ms per spec, but counters need a bit more for readability). */
  duration?: number;
  className?: string;
  /** Number of decimal places to display. */
  decimals?: number;
}

/**
 * Smoothly animates a number from 0 to the target value when it scrolls
 * into view. Uses requestAnimationFrame for 60 FPS performance.
 * Respects prefers-reduced-motion.
 */
export function AnimatedCounter({
  value,
  duration = 600,
  className,
  decimals = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    // Respect reduced motion — show final value immediately.
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }

    let frame: number;
    const start = performance.now();
    const startValue = 0;
    const delta = value - startValue;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic for a premium feel
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + delta * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration]);

  const formatted = displayValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  );
}