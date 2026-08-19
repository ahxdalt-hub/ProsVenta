"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import { EASE_OUT, DURATION } from "@/lib/motion";

/**
 * Dropdown animation variants.
 * Uses only opacity + transform for 60 FPS GPU-accelerated animation.
 * - Opening: fade in + scale 0.98 → 1 + slight translate down
 * - Closing: smooth fade out
 */
const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.98, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -4,
    transition: { duration: DURATION.fast, ease: EASE_OUT },
  },
};

/**
 * Export menu — UI foundation only.
 * Shows CSV, PDF, and Excel options. No export logic is implemented yet.
 * Displays a "coming soon" toast when an option is clicked.
 */
export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleSelect = (format: string) => {
    setOpen(false);
    setToast(`${format} export is coming soon`);
    setTimeout(() => setToast(null), 2500);
  };

  const options = [
    {
      format: "CSV",
      icon: "lists" as const,
      description: "Spreadsheet-compatible",
    },
    {
      format: "PDF",
      icon: "analytics" as const,
      description: "Formatted report",
    },
    {
      format: "Excel",
      icon: "organization" as const,
      description: "Microsoft Excel",
    },
  ];

  return (
    <>
      {/* Relative wrapper establishes positioning context for the dropdown.
          `isolate` creates a new stacking context so the dropdown's z-index
          is scoped correctly and always layers above sibling content. */}
      <div ref={ref} className="relative isolate">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="btn-press inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <DashboardIcon name="refresh" size={14} />
          Export
          <DashboardIcon name="chevron-down" size={14} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              role="menu"
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute right-0 top-full z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5"
            >
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Export analytics
                </p>
              </div>
              <div className="p-1.5">
                {options.map((opt) => (
                  <button
                    key={opt.format}
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(opt.format)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                      <DashboardIcon name={opt.icon} size={14} />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {opt.format}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {opt.description}
                      </p>
                    </div>
                    <span className="settings-badge-soon">Soon</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast — fixed positioned, always above all content */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-lg"
          >
            <p className="text-sm font-medium text-slate-700">{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}