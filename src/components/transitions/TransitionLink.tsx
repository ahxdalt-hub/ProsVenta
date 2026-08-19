"use client";

import Link from "next/link";
import { useRouteTransition } from "./RouteTransitionProvider";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

interface TransitionLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onTransitionStart?: () => void;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  ariaLabel?: string;
}

export default function TransitionLink({
  href,
  children,
  className,
  onTransitionStart,
  onClick,
  ariaLabel,
}: TransitionLinkProps) {
  const { navigate, isTransitioning } = useRouteTransition();
  const reduce = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Allow cmd/ctrl+click or middle-click for new tab
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    // Let custom onClicks run first
    onClick?.(e);
    if (e.defaultPrevented) return;

    // Same-page anchor links should use normal behavior
    if (href.startsWith("#")) return;

    e.preventDefault();
    if (isTransitioning) return;

    setPressed(true);
    // Slight tactile delay to let the press animation register
    setTimeout(() => {
      onTransitionStart?.();
      navigate(href);
    }, 80);
  };

  return (
    <Link
      href={href}
      prefetch={true}
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
          className="inline-flex items-center"
          animate={pressed ? { scale: 0.97 } : { scale: 1 }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "inline-flex" }}
        >
          {children}
        </motion.span>
      )}
    </Link>
  );
}