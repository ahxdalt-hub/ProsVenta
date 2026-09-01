"use client";

import { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { backdropVariants, modalVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ============================================================================
// Modal — accessible dialog primitive
// Stage 8 — Phase 5
// ============================================================================
// Focus trap, Escape-to-close, aria-modal, portal rendering. Uses the shared
// Prosventa motion system (backdropVariants/modalVariants).
// ============================================================================

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible dialog title (visually rendered). */
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** role="alertdialog" for error/safety-critical dialogs. */
  tone?: "default" | "alert";
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  tone = "default",
}: ModalProps) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      // Focus trap: cycle tab focus within the dialog panel.
      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKeyDown, true);
    // Move focus into the dialog on open.
    const raf = requestAnimationFrame(() => {
      const node = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      node?.focus();
    });
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      cancelAnimationFrame(raf);
      previouslyFocused.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <motion.div
        variants={reduce ? undefined : backdropVariants}
        initial="hidden"
        animate="visible"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        ref={panelRef}
        role={tone === "alert" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-label={title}
        variants={reduce ? undefined : modalVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          "relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl",
          className
        )}
      >
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </motion.div>
    </div>,
    document.body
  );
}
