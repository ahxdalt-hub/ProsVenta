"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  isPending?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

/**
 * Lightweight confirmation dialog used for role changes and destructive
 * actions. Centered, subtle backdrop, keyboard accessible, Escape to close.
 * Uses restrained styling — clear without being dramatic.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  confirmVariant = "primary",
  isPending = false,
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes the dialog unless an action is pending.
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !isPending) onOpenChange(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, isPending, onOpenChange]);

  // Focus the dialog when it opens so the action stays keyboard accessible.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => dialogRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Subtle backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => !isPending && onOpenChange(false)}
            className="absolute inset-0 bg-slate-900/20"
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl focus-visible:outline-none"
          >
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {body && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>}
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmVariant}
                size="sm"
                onClick={onConfirm}
                loading={isPending}
                disabled={isPending}
              >
                {isPending ? "Changing…" : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}