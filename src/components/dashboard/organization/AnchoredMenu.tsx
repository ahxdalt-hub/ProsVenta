"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnchoredMenuProps {
  /** Render prop for the trigger button. Receives open state, toggle handler, and a ref for focus restoration. */
  trigger: (props: {
    open: boolean;
    toggle: () => void;
    ref: (node: HTMLButtonElement | null) => void;
  }) => React.ReactNode;
  /** Menu content. Can be a node or a function receiving a close() callback. */
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  /** Horizontal alignment relative to the trigger. */
  align?: "start" | "end";
  /** Menu width in pixels. */
  width?: number;
  /** Accessible label for the menu. */
  label?: string;
  className?: string;
}

/**
 * A popover menu that stays anchored to its trigger.
 *
 * Positioning is computed from the trigger's bounding rect at open time and
 * re-measured on scroll/resize/content change. The menu is clamped to the
 * viewport so it never clips at an edge, and it flips upward when it would
 * overflow the bottom. No hardcoded coordinates are used.
 */
export function AnchoredMenu({
  trigger,
  children,
  align = "end",
  width = 208,
  label = "Menu",
  className = "",
}: AnchoredMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);

  const updatePosition = useCallback(() => {
    const wrapperEl = wrapperRef.current;
    const menuEl = menuRef.current;
    if (!wrapperEl) return;

    const rect = wrapperEl.getBoundingClientRect();
    const menuWidth = width;
    const menuHeight = menuEl?.offsetHeight ?? 0;
    const margin = 8;

    // Horizontal: align to the trigger, then clamp to the viewport.
    let left = align === "end" ? rect.right - menuWidth : rect.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin));

    // Vertical: open below the trigger, flip upward if it would overflow.
    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - menuHeight - 6);
    }

    setPosition({ top, left });
  }, [align, width]);

  const close = useCallback(() => {
    setOpen(false);
    setPosition(null);
    // Restore focus to the trigger for keyboard users.
    triggerButtonRef.current?.focus();
  }, []);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        // Wait for the menu to render before measuring.
        requestAnimationFrame(updatePosition);
        return true;
      }
      setPosition(null);
      return false;
    });
  }, [updatePosition]);

  const setTriggerRef = useCallback((node: HTMLButtonElement | null) => {
    triggerButtonRef.current = node;
  }, []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  // Reposition on scroll/resize while open.
  useEffect(() => {
    if (!open) return;
    function onScroll() {
      updatePosition();
    }
    function onResize() {
      updatePosition();
    }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  // Re-measure when the menu content changes size (e.g. role options expand).
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const observer = new ResizeObserver(() => updatePosition());
    observer.observe(menuRef.current);
    return () => observer.disconnect();
  }, [open, updatePosition]);

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      {trigger({ open, toggle, ref: setTriggerRef })}

      <AnimatePresence>
        {open && position && (
          <motion.div
            ref={menuRef}
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/5",
              className
            )}
            style={{ top: position.top, left: position.left, width }}
          >
            {typeof children === "function" ? children(close) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}