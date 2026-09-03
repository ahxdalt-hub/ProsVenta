"use client";

// ============================================================================
// Faq — animated accordion for the pricing page
// ============================================================================
// Replaces the native <details> FAQ with a state-driven accordion so we can
// animate height (expand/collapse), rotate the "+" into a filled "×" with a
// spring, and add hover lift on the cards. Respects reduced motion.
// Questions/answers come in via the `faqs` prop from the pricing page.
// ============================================================================

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export interface FaqItem {
  q: string;
  a: string;
}

export default function Faq({ faqs }: { faqs: FaqItem[] }) {
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);
  const reduce = useReducedMotion();

  const toggle = (i: number) =>
    setOpenIndexes((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );

  return (
    <div className="space-y-4">
      {faqs.map((faq, i) => {
        const open = openIndexes.includes(i);
        return (
          <motion.div
            key={faq.q}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: EASE, delay: i * 0.05 }}
            className={`group rounded-2xl border px-6 py-5 transition-all duration-300 ease-out ${
              open
                ? "border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 shadow-md shadow-blue-100/50"
                : "border-blue-100 bg-white shadow-xs hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md hover:shadow-blue-100/50"
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={open}
              className="flex w-full cursor-pointer items-center justify-between gap-4 text-left text-sm font-semibold text-slate-900"
            >
              {faq.q}
              {/* "+" that springs into a filled "×" */}
              <motion.span
                aria-hidden="true"
                animate={{ rotate: open ? 135 : 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 320, damping: 20 }
                }
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-lg leading-none transition-colors duration-300 ${
                  open
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-blue-200 bg-blue-50 text-blue-600 group-hover:border-blue-300 group-hover:bg-blue-100"
                }`}
              >
                +
              </motion.span>
            </button>

            {/* Smooth height-animated answer */}
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="answer"
                  initial={reduce ? { opacity: 1 } : { height: 0, opacity: 0 }}
                  animate={
                    reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }
                  }
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-xl border border-blue-100/80 bg-white/80 px-4 py-3">
                    <p className="text-sm leading-relaxed text-slate-600">
                      {faq.a}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
