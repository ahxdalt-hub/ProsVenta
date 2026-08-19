"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Layers3 } from "lucide-react";
import WorkflowInterface from "./WorkflowInterface";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const introVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const noteVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.25 } },
};

/**
 * Workflow Action — Phase 5 of the Explore page.
 *
 * A two-column section that demonstrates how Prosventa turns prospect
 * intelligence into an actionable workflow. The left column carries the
 * narrative; the right column is a live, deterministic simulation of the
 * workflow concept — DISCOVER → UNDERSTAND → DECIDE → ACT.
 *
 * The section mirrors the layout of Prospect Discovery (Phase 3) and
 * Prospect Intelligence (Phase 4) so the story flows naturally:
 * DISCOVER → UNDERSTAND → ACTION.
 *
 * This is a marketing/product demonstration only. No real database,
 * no API calls, no real prospect data, no real workflow execution.
 */
export default function WorkflowAction() {
  const reduce = useReducedMotion();

  return (
    <section
      id="explore-workflow"
      className="relative scroll-mt-20 overflow-hidden border-t border-slate-200/60 bg-slate-50 py-20 lg:py-28"
    >
      {/* Ambient background — restrained continuation, inverted surface for separation */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="grid-pattern absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,black,transparent)]" />
        <div className="absolute top-1/4 right-[-160px] h-[400px] w-[400px] rounded-full bg-blue-500/[0.04] blur-3xl" />
      </div>

      <motion.div
        variants={container}
        initial={reduce ? false : "hidden"}
        whileInView={reduce ? undefined : "show"}
        viewport={{ once: true, amount: 0.3 }}
        className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          {/* Left — narrative */}
          <div className="lg:pr-4">
            <motion.div variants={introVariants}>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                From intelligence to action
              </span>
            </motion.div>

            <motion.h2
              variants={introVariants}
              className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 lg:text-[44px] lg:leading-[1.15]"
            >
              Turn insight into{" "}
              <span className="text-gradient">your next move.</span>
            </motion.h2>

            <motion.p
              variants={introVariants}
              className="mt-4 max-w-lg text-lg leading-relaxed text-slate-600"
            >
              Prosventa connects the information around your prospects to the
              actions that matter next.
            </motion.p>

            {/* Before / After feeling — scattered signals → clear action */}
            <motion.div
              variants={introVariants}
              className="mt-8 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Scattered signals
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    Research, fit, intent — separate places.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-blue-500" strokeWidth={2.2} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                    Clear action
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    One recommended next step.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Phase 4 → Phase 5 transition language */}
            <motion.p
              variants={noteVariants}
              className="mt-8 flex items-center gap-2 text-xs text-slate-400"
            >
              <Layers3 className="h-3.5 w-3.5" strokeWidth={2.2} />
              Understanding becomes action — one connected workflow.
            </motion.p>
          </div>

          {/* Right — animated workflow interface */}
          <WorkflowInterface />
        </div>
      </motion.div>
    </section>
  );
}