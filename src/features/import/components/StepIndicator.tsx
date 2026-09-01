"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ImportStep } from "../types";

const STEPS: { key: ImportStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "mapping", label: "Map" },
  { key: "review", label: "Review" },
  { key: "progress", label: "Import" },
];

const STEP_ORDER: ImportStep[] = ["upload", "mapping", "review", "progress"];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StepDot({ state }: { state: "done" | "current" | "future" }) {
  return (
    <span
      className={cn(
        "relative flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors duration-200",
        state === "done" && "border-navy-900 bg-navy-900 text-white",
        state === "current" && "border-navy-900 bg-white text-navy-900",
        state === "future" && "border-slate-200 bg-white text-slate-400"
      )}
    >
      {state === "done" ? (
        <CheckIcon className="h-3.5 w-3.5" />
      ) : (
        <span className={cn("h-2 w-2 rounded-full", state === "current" ? "bg-navy-900" : "bg-slate-300")} />
      )}
      {state === "current" && (
        <span className="absolute inset-0 -m-1 rounded-full ring-2 ring-blue-500/30" aria-hidden="true" />
      )}
    </span>
  );
}

/**
 * Compact step indicator. Completed steps show a filled check, the current
 * step is highlighted, and future steps stay muted. "Import" maps onto the
 * running + results phases.
 */
export function StepIndicator({ current }: { current: ImportStep }) {
  const activeIdx = STEP_ORDER.indexOf(current === "results" ? "progress" : current);

  return (
    <nav aria-label="Import progress" className="w-full">
      <ol className="flex items-center justify-center gap-2 sm:gap-3">
        {STEPS.map((step, i) => {
          const state: "done" | "current" | "future" =
            i < activeIdx ? "done" : i === activeIdx ? "current" : "future";
          const isLast = i === STEPS.length - 1;
          return (
            <li key={step.key} className="flex items-center gap-2 sm:gap-3">
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  initial={false}
                  animate={{ scale: state === "current" ? 1 : 0.96 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <StepDot state={state} />
                </motion.div>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors duration-200",
                    state === "done" && "text-navy-900",
                    state === "current" && "text-slate-900",
                    state === "future" && "text-slate-400"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  aria-hidden="true"
                  className={cn(
                    "h-0.5 w-6 rounded-full transition-colors duration-200 sm:w-12",
                    i < activeIdx ? "bg-navy-900" : "bg-slate-200"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}