"use client";

// ============================================================================
// Prosventa — Reusable Minimized Action Window (Phase 4)
// ============================================================================
// THE single action-window interaction architecture used by Prospects, Saved
// Lists, and Import. Replaces per-page modal duplication while keeping:
//   • open / close / minimize / restore (state is PRESERVED while minimized)
//   • open animation that originates from the triggering button
//   • close animation that reverses the open motion naturally
//   • restrained backdrop (hidden when minimized)
//   • focus management (trap on open, restore to trigger on close)
//   • Escape, busy-guard (no close while a mutation is in flight), and
//     dirty-state close confirmation (close vs minimize stay distinct)
//   • responsive sizing (full-width sheet on mobile, comfortable modal on desktop)
// Only transform + opacity are animated for smooth interactions.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export interface ActionWindowProps {
  open: boolean;
  onClose: () => void;
  /** Called after the exit animation completes (parent restores focus/state). */
  onExitComplete?: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** True when the window holds meaningful input -> closing asks to confirm. */
  dirty?: boolean;
  /** True while a mutation is in flight -> block close/minimize/Escape. */
  busy?: boolean;
  /** False removes the minimize control entirely (simple open → use → close). */
  minimizable?: boolean;
  /** Accessible label for the close button (e.g. "Close members"). */
  closeLabel?: string;
  /** Visual width tier. */
  size?: "md" | "lg";
  className?: string;
}

/**
 * The single reusable action-window panel. Children stay MOUNTED while open
 * (only visually hidden when minimized/confirming) so form values and
 * selections are never lost.
 */
export function ActionWindow({
  open,
  onClose,
  onExitComplete,
  title,
  description,
  children,
  footer,
  dirty = false,
  busy = false,
  minimizable = true,
  closeLabel = "Close",
  size = "lg",
  className,
}: ActionWindowProps) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const chipToggleRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // Always-current close handler for the keydown listener (avoids stale closures
  // when dirty/confirming/busy change after the effect was set up).
  const requestCloseRef = useRef<() => void>(() => {});
  const containerRef = useRef<HTMLDivElement>(null);
  // Portals require a real DOM node, which does not exist during SSR. Only
  // render the portal after mounting on the client to avoid
  // "Target container is not a DOM element".
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [minimized, setMinimized] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  // Capture the opening trigger so we can originate from + return focus to it.
  useEffect(() => {
    if (!open) return;
    setMinimized(false);
    setConfirming(false);
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const el = document.activeElement;
    const rect = el instanceof HTMLElement ? el.getBoundingClientRect() : null;
    setOrigin(
      rect && rect.width > 0
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : null
    );
  }, [open]);

  // Return focus to the triggering button once the window closes.
  useEffect(() => {
    if (open) return;
    requestAnimationFrame(() => {
      previouslyFocused.current?.focus?.();
      previouslyFocused.current = null;
    });
  }, [open]);

  // Keyboard: focus trap + Escape (busy blocks Escape).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (busy) return;
        e.stopPropagation();
        requestCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !containerRef.current) return;
      const visible = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter(
        // Offset check drops display:none content; the inert-ancestor check
        // drops minimized window content that stays mounted for state keeping.
        (n) => n.offsetParent !== null && n.closest("[inert]") === null
      );
      if (visible.length === 0) return;
      const first = visible[0];
      const last = visible[visible.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (
        e.shiftKey &&
        (active === first || !containerRef.current.contains(active))
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);
    const raf = requestAnimationFrame(() =>
      containerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    );
    return () => {
      document.removeEventListener("keydown", onKey, true);
      cancelAnimationFrame(raf);
    };
  }, [open, busy]);

  // Keep focus on the minimized chip's restore control.
  useEffect(() => {
    if (open && minimized) {
      const raf = requestAnimationFrame(() => chipToggleRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [open, minimized]);

  // Body scroll lock only while fully expanded.
  useEffect(() => {
    if (!open || minimized) return;
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
    };
  }, [open, minimized]);

  // Close vs minimize must behave differently: close asks before discarding
  // meaningful input (dirty); minimize always preserves the interaction.
  const requestClose = () => {
    if (busy) return;
    if (dirty && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onClose();
  };
  requestCloseRef.current = requestClose;

  // Subtle spatial offset toward the triggering control. Only a FRACTION of
  // the real distance is used so the motion feels connected to the trigger
  // without turning into a dramatic fly-in.
  let originX = 0;
  let originY = 12;
  if (origin != null && typeof window !== "undefined") {
    originX = Math.max(
      -24,
      Math.min((origin.x - window.innerWidth / 2) * 0.08, 24)
    );
    originY = Math.max(
      -48,
      Math.min((origin.y - window.innerHeight / 2) * 0.18, 48)
    );
  }

  // Open ~340ms, close ~280ms, minimize/restore ~320ms — fast enough for
  // productivity, slow enough to be perceived. Fast-in / gentle-deceleration
  // easing throughout; transform + opacity only (GPU-friendly).
  const initial = reduce
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.97, x: originX, y: originY };
  const animate = reduce
    ? minimized
      ? { opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }
      : { opacity: 1, transition: { duration: 0.15, ease: EASE_OUT } }
    : minimized
      ? {
          // Minimize: compress + drift toward the docked chip position.
          opacity: 0,
          scale: 0.96,
          y: 20,
          transition: { duration: 0.32, ease: EASE_OUT },
        }
      : {
          opacity: 1,
          scale: 1,
          x: 0,
          y: 0,
          transition: { duration: 0.34, ease: EASE_OUT },
        };
  const exit = reduce
    ? { opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }
    : {
        // Close: reverse the open motion back toward the triggering control.
        opacity: 0,
        scale: 0.97,
        x: originX,
        y: originY,
        transition: { duration: 0.28, ease: EASE_OUT },
      };

  if (!mounted) return null;

  return createPortal(
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-[120]"
      aria-hidden={!open}
    >
      <AnimatePresence>
        {open && !minimized && (
          <motion.div
            key="aw-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.18, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
            onClick={requestClose}
            className="pointer-events-auto absolute inset-0 bg-slate-900/30"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={onExitComplete}>
        {open && (
          <motion.div
            key="aw-wrap"
            className="pointer-events-none flex h-full w-full items-end justify-center px-4 pb-4 pt-4 sm:items-center sm:pb-6"
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal={!minimized}
              aria-label={title}
              initial={initial}
              animate={animate}
              exit={exit}
              className={cn(
                "relative flex max-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10",
                // The minimized chip takes over interaction while the full
                // window is compressed away — no layout switch, pure motion.
                minimized ? "pointer-events-none" : "pointer-events-auto",
                size === "lg" ? "w-full max-w-2xl" : "w-full max-w-xl",
                className
              )}
            >
              {/* Minimized content stays MOUNTED (state preserved) but inert:
                  unfocusable and non-interactive while the chip represents it. */}
              <div
                className="flex min-h-0 flex-1 flex-col"
                inert={minimized || undefined}
              >
              <div className="flex shrink-0 items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-slate-900">{title}</h2>
                  {description && !minimized && (
                    <p className="mt-0.5 truncate text-sm text-slate-500">{description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {minimizable && (
                    <button
                      type="button"
                      onClick={() => setMinimized(true)}
                      disabled={busy}
                      aria-label="Minimize window"
                      title="Minimize"
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={requestClose}
                    disabled={busy}
                    aria-label={dirty && !confirming ? `${closeLabel} (discard changes)` : closeLabel}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:bg-slate-200 active:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {confirming ? (
                // Confirm overlay. The form below stays MOUNTED (hidden) so
                // choosing "Keep editing" preserves everything entered.
                <div className="absolute inset-0 z-10 flex items-start bg-white/90 px-5 pb-5 pt-16 backdrop-blur-[1px]">
                  <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-800">Discard changes?</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Closing now will undo anything you&apos;ve entered.
                    </p>
                    <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                        Keep editing
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => onClose()}>
                        Discard
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              <div
                className={cn(
                  "flex min-h-0 flex-1 flex-col",
                  confirming && "hidden"
                )}
              >
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
                {footer != null && (
                  <div className="shrink-0 border-t border-slate-100 px-5 py-3">{footer}</div>
                )}
              </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Minimized chip. The window visually transforms into this control:  */}
      {/* it enters as the full window compresses away and reverses on       */}
      {/* restore. AnimatePresence keeps rapid toggles glitch-free.          */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {open && minimized && (
          <motion.div
            key="aw-chip"
            initial={
              reduce
                ? { opacity: 0, x: "-50%" }
                : { opacity: 0, x: "-50%", y: 14, scale: 0.96 }
            }
            animate={
              reduce
                ? { opacity: 1, x: "-50%", transition: { duration: 0.15, ease: EASE_OUT } }
                : {
                    opacity: 1,
                    x: "-50%",
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.32, ease: EASE_OUT },
                  }
            }
            exit={
              reduce
                ? { opacity: 0, x: "-50%", transition: { duration: 0.12, ease: EASE_OUT } }
                : {
                    opacity: 0,
                    x: "-50%",
                    y: 10,
                    scale: 0.97,
                    transition: { duration: 0.2, ease: EASE_OUT },
                  }
            }
            className="pointer-events-auto absolute bottom-4 left-1/2 z-[121] flex max-w-[calc(100vw-2rem)] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white py-2 pl-4 pr-2 shadow-xl shadow-slate-900/10 sm:bottom-6"
            role="dialog"
            aria-label={`${title} (minimized)`}
          >
            <span className="truncate text-sm font-semibold text-slate-900">{title}</span>
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                ref={chipToggleRef}
                onClick={() => setMinimized(false)}
                aria-label="Restore window"
                title="Restore"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <button
                type="button"
                onClick={requestClose}
                disabled={busy}
                aria-label={dirty ? "Close (discard changes)" : "Close"}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}