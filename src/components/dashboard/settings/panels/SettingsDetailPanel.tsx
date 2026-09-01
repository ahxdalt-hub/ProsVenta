"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { backdropVariants, EASE_OUT } from "@/lib/motion";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import type { IconName } from "@/components/dashboard/navigation/icons";

// ============================================================================
// SettingsDetailPanel — large Settings workspace overlay
// ============================================================================
// Phase 1 of the Settings detail-panel architecture: opens an existing
// Settings section's content in a large focused panel on top of the (state-
// preserved) Settings landing page. Uses the existing Prosventa motion system
// (framer-motion + @/lib/motion), the existing border/radius treatment, a
// sticky header with a real SVG icon and close button, and an independently
// scrollable body. Fully accessible: dialog semantics, Escape to close, focus
// trap, focus moves into the panel on open and returns to the trigger on
// close. All motion stays inside this Client Component.
// ============================================================================

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

interface SettingsDetailPanelProps {
  open: boolean;
  onClose: () => void;
  /** Section title rendered in the sticky header (also the dialog label). */
  title: string;
  /** Optional one-line description rendered under the title. */
  description?: string;
  /** Existing dashboard SVG icon name for the header. */
  icon: IconName;
  children: React.ReactNode;
  /**
   * True when the section inside the panel has unsaved local edits. While
   * dirty, every close attempt (close button, Escape, overlay click) is
   * intercepted and an inline confirmation is shown first — the user must
   * explicitly keep editing or discard. Never faked: sections without
   * editable state simply don't pass this prop.
   */
  isDirty?: boolean;
}

export function SettingsDetailPanel({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  isDirty = false,
}: SettingsDetailPanelProps) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const keepEditingButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  /** True while the "Unsaved changes" confirmation is visible. */
  const [confirmingClose, setConfirmingClose] = useState(false);
  const confirmingRef = useRef(false);
  confirmingRef.current = confirmingClose;

  // Single close gateway: dirty panels ask for confirmation first.
  const requestClose = useCallback(() => {
    if (isDirty && !confirmingClose) {
      setConfirmingClose(true);
      return;
    }
    onClose();
  }, [isDirty, confirmingClose, onClose]);

  // Leaving the panel (fully closed or back to clean) always resets the
  // confirmation so reopening starts from a neutral state.
  useEffect(() => {
    if (!open || !isDirty) setConfirmingClose(false);
  }, [open, isDirty]);

  // Escape to close + Tab focus trap while open; focus restoration on close.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        // First Escape while the unsaved-changes confirmation is open
        // dismisses the confirmation (back to editing), not the panel.
        if (confirmingRef.current) {
          setConfirmingClose(false);
          return;
        }
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    // Move focus into the panel (close button first — always reachable).
    const raf = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      cancelAnimationFrame(raf);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  // Move focus into the confirmation when it appears (safe default: keep
  // editing), and back to the close button when it is dismissed.
  useEffect(() => {
    if (!confirmingClose) return;
    const raf = requestAnimationFrame(() => {
      keepEditingButtonRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [confirmingClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
          {/* Overlay */}
          <motion.div
            variants={reduce ? undefined : backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={requestClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduce ? undefined : { opacity: 0, y: 24 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="relative flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.25)] sm:max-h-[85vh] sm:max-w-3xl sm:rounded-2xl lg:max-w-4xl"
          >
            {/* Sticky header (safe-area aware on notched mobile devices) */}
            <div className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7 [padding-top:env(safe-area-inset-top)] sm:[padding-top:1rem]">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600"
              >
                <DashboardIcon name={icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold tracking-tight text-slate-900">
                  {title}
                </h2>
                {description && (
                  <p className="mt-0.5 truncate text-[13px] leading-snug text-slate-500">
                    {description}
                  </p>
                )}
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={requestClose}
                aria-label={`Close ${title}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Scrollable content area */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-7">
              {children}
            </div>

            {/* Unsaved-changes confirmation — contained, panel stays mounted */}
            <AnimatePresence>
              {confirmingClose && (
                <div
                  className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/30 p-6"
                  role="presentation"
                >
                  <motion.div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="settings-unsaved-title"
                    aria-describedby="settings-unsaved-description"
                    initial={reduce ? undefined : { opacity: 0, y: 8 }}
                    animate={reduce ? undefined : { opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: 8 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.2)]"
                  >
                    <h3
                      id="settings-unsaved-title"
                      className="text-[15px] font-semibold tracking-tight text-slate-900"
                    >
                      Unsaved changes
                    </h3>
                    <p
                      id="settings-unsaved-description"
                      className="mt-1.5 text-sm leading-relaxed text-slate-500"
                    >
                      You have changes that haven&apos;t been saved.
                    </p>
                    <div className="mt-4 flex items-center justify-end gap-2.5">
                      <button
                        ref={keepEditingButtonRef}
                        type="button"
                        onClick={() => setConfirmingClose(false)}
                        className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      >
                        Keep editing
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      >
                        Discard changes
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

