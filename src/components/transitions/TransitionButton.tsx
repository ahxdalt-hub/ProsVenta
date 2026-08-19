"use client";

import { useRouteTransition } from "./RouteTransitionProvider";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

interface TransitionButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onTransitionStart?: () => void;
  onClick?: () => void;
  ariaLabel?: string;
  type?: "button" | "submit";
}

export default function TransitionButton({
  href,
  children,
  className,
  onTransitionStart,
  onClick,
  ariaLabel,
  type = "button",
}: TransitionButtonProps) {
  const { navigate, isTransitioning } = useRouteTransition();
  const reduce = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    onClick?.();
    if (isTransitioning) return;

    setPressed(true);
    setLoading(true);

    // Slight tactile delay to let the press animation register
    setTimeout(() => {
      onTransitionStart?.();
      navigate(href);
    }, 120);
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      aria-label={ariaLabel}
      className={className}
      style={reduce ? undefined : { transition: "transform 120ms cubic-bezier(0.16, 1, 0.3, 1)" }}
      onMouseDown={reduce ? undefined : () => setPressed(true)}
      onMouseUp={reduce ? undefined : () => setTimeout(() => setPressed(false), 80)}
      onMouseLeave={reduce ? undefined : () => setPressed(false)}
    >
      {reduce ? (
        children
      ) : (
        <motion.span
          className="inline-flex items-center justify-center gap-2"
          animate={pressed ? { scale: 0.97 } : { scale: 1 }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "inline-flex" }}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Please wait&hellip;</span>
            </>
          ) : (
            children
          )}
        </motion.span>
      )}
    </button>
  );
}