"use client";

/**
 * AnchoredPopover — lightweight anchored floating-menu primitive.
 *
 * Why a portal?
 * Cards across the dashboard (`.premium-card`) create their own stacking
 * contexts (`will-change: transform`), so an absolutely-positioned menu
 * rendered inside a card gets painted underneath sibling cards that come
 * later in the DOM (e.g. the prospects table). Rendering through a portal
 * into <body> with `position: fixed` lifts the popover into the root
 * stacking context, guaranteeing it paints above tables, rows and filter
 * chips without escalating z-index values anywhere else.
 *
 * Positioning is derived from the anchor's bounding box on open and kept in
 * sync on scroll/resize, so the menu stays visually attached to its trigger,
 * never pushes page content, flips above the trigger when there isn't enough
 * room below, and is clamped to remain inside the viewport on small screens.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Minimum distance kept between the popover and the viewport edges. */
const VIEWPORT_GUTTER = 8;
/**
 * Floating-surface layer shared with the detail panel and dialogs
 * (see ProspectDetailPanel / CreateProspectDialog). Intentionally the same
 * value — no z-index escalation across the app.
 */
const POPOVER_Z_INDEX = 50;

export interface AnchoredPopoverProps {
  /** Whether the popover is visible. */
  open: boolean;
  /** Called when the popover requests to close (outside click / Escape). */
  onClose: () => void;
  /** Ref of the element the popover anchors to. */
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  /** Horizontal alignment relative to the anchor. Defaults to "end". */
  align?: "start" | "center" | "end";
  /** Preferred vertical side. "auto" flips when there is no room below. */
  side?: "bottom" | "top" | "auto";
  /** Gap between the anchor and the popover, in px. */
  offset?: number;
  /** Desired width in px. Clamped to stay inside the viewport. */
  width?: number;
  /** Maximum height before the content scrolls internally. */
  maxHeight?: number;
  className?: string;
  role?: string;
  ariaLabel?: string;
}

interface PopoverPlacement {
  top: number;
  left: number;
  maxHeight: number;
  side: "bottom" | "top";
}

// useLayoutEffect is a no-op (with a console warning) during SSR; swap for
// useEffect on the server. Both run before paint after hydration.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function AnchoredPopover({
  open,
  onClose,
  anchorRef,
  children,
  align = "end",
  side = "auto",
  offset = 6,
  width = 208,
  maxHeight = 288,
  className,
  role,
  ariaLabel,
}: AnchoredPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [placement, setPlacement] = useState<PopoverPlacement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  const computePlacement = useCallback((): PopoverPlacement | null => {
    const anchorEl = anchorRef.current;
    const popEl = popoverRef.current;
    if (!anchorEl || !popEl) return null;

    const anchorRect = anchorEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // offsetWidth/offsetHeight are layout dimensions and therefore immune to
    // the entrance transform, keeping flip decisions stable mid-animation.
    const popWidth = Math.min(
      popEl.offsetWidth || width,
      viewportWidth - VIEWPORT_GUTTER * 2
    );
    const popHeight = popEl.offsetHeight;

    const spaceBelow = viewportHeight - anchorRect.bottom - offset;
    const spaceAbove = anchorRect.top - offset;

    let resolvedSide: "bottom" | "top";
    if (side === "auto") {
      resolvedSide =
        spaceBelow < Math.min(popHeight, maxHeight) && spaceAbove > spaceBelow
          ? "top"
          : "bottom";
    } else {
      resolvedSide = side;
    }

    const availableSpace = resolvedSide === "bottom" ? spaceBelow : spaceAbove;
    const fittedMaxHeight = Math.max(140, Math.min(maxHeight, availableSpace));

    const top =
      resolvedSide === "bottom"
        ? anchorRect.bottom + offset
        : Math.max(
            VIEWPORT_GUTTER,
            anchorRect.top - offset - Math.min(popHeight, fittedMaxHeight)
          );

    let left: number;
    if (align === "center") {
      left = anchorRect.left + anchorRect.width / 2 - popWidth / 2;
    } else if (align === "end") {
      left = anchorRect.right - popWidth;
    } else {
      left = anchorRect.left;
    }
    left = Math.min(
      Math.max(left, VIEWPORT_GUTTER),
      Math.max(VIEWPORT_GUTTER, viewportWidth - popWidth - VIEWPORT_GUTTER)
    );

    return { top, left, maxHeight: fittedMaxHeight, side: resolvedSide };
  }, [align, anchorRef, maxHeight, offset, side, width]);

  // Position before paint whenever the popover opens (no coordinate flash).
  useIsomorphicLayoutEffect(() => {
    if (!open || !mounted) return;
    setPlacement(computePlacement());
  }, [open, mounted, computePlacement]);

  // Stay glued to the anchor while the page scrolls or the viewport resizes.
  useEffect(() => {
    if (!open || !mounted) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      setPlacement((prev) => {
        const next = computePlacement();
        if (
          prev &&
          next &&
          prev.top === next.top &&
          prev.left === next.left &&
          prev.maxHeight === next.maxHeight &&
          prev.side === next.side
        ) {
          return prev; // Skip re-render when nothing changed.
        }
        return next;
      });
    };
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Capture phase catches scrolls from nested containers too.
    window.addEventListener("scroll", scheduleUpdate, true);
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [open, mounted, computePlacement]);

  // Close on pointer presses outside both the popover and its anchor.
  useEffect(() => {
    if (!open || !mounted) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, mounted, onClose, anchorRef]);

  // Close on Escape.
  useEffect(() => {
    if (!open || !mounted) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, mounted, onClose]);

  if (!mounted) return null;

  const activeSide = placement?.side ?? "bottom";
  const transformOrigin =
    activeSide === "top"
      ? align === "center"
        ? "bottom center"
        : align === "start"
          ? "bottom left"
          : "bottom right"
      : align === "center"
        ? "top center"
        : align === "start"
          ? "top left"
          : "top right";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef}
          role={role}
          aria-label={ariaLabel}
          className={cn(
            // Solid surface with the existing Prosventa border, radius and
            // shadow. No backdrop blur/dim — the page behind stays stable.
            "fixed overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50",
            className
          )}
          style={{
            top: placement?.top ?? -9999,
            left: placement?.left ?? -9999,
            maxHeight: placement?.maxHeight ?? maxHeight,
            width,
            maxWidth: `calc(100vw - ${VIEWPORT_GUTTER * 2}px)`,
            visibility: placement ? "visible" : "hidden",
            transformOrigin,
            zIndex: POPOVER_Z_INDEX,
          }}
          initial={
            prefersReducedMotion
              ? { opacity: 1 }
              : { opacity: 0, y: activeSide === "top" ? 4 : -4, scale: 0.98 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: activeSide === "top" ? 4 : -4, scale: 0.98 }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.15, ease: [0.16, 1, 0.3, 1] }
          }
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}