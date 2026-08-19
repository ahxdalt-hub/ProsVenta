"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Layers3, Sparkles } from "lucide-react";
import IntelligenceInterface from "./IntelligenceInterface";

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
 * Prospect Intelligence — Phase 4 of the Explore page.
 *
 * A two-column section that demonstrates how Prosventa helps users
 * understand the context around a company or prospect. The left column
 * carries the narrative; the right column is a live, deterministic
 * simulation of the intelligence workspace (company context, research,
 * enrichment, ICP scoring, intent signals).
 *
 * The section mirrors the layout of Prospect Discovery (Phase 3) so the
 * story flows naturally: DISCOVER → UNDERSTAND.
 *
 * This is a marketing/product demonstration only. No real database,
 * no API calls, no real prospect data, no AI providers.
 */
export default function ProspectIntelligence() {
  const reduce = useReducedMotion();

  return (
    <section
      id="explore-intelligence"
      className="relative scroll-mt-20 overflow-hidden border-t border-slate-200/60 bg-white py-20 lg:py-28"
    >
      {/* Ambient background — restrained continuation, inverted surface for separation */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="grid-pattern absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,black,transparent)]" />
        <div className="absolute top-1/4 left-[-160px] h-[400px] w-[400px] rounded-full bg-blue-500/[0.04] blur-3xl" />
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
                Prospect Intelligence
              </span>
            </motion.div>

            <motion.h2
              variants={introVariants}
              className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 lg:text-[44px] lg:leading-[1.15]"
            >
              {"Don't just find prospects. "}
              <span className="text-gradient">Understand them.</span>
            </motion.h2>

            <motion.p
              variants={introVariants}
              className="mt-4 max-w-lg text-lg leading-relaxed text-slate-600"
            >
              Bring company context, research, fit signals and intent into one
              place so your team can focus on the opportunities that matter.
            </motion.p>

            <motion.ul variants={introVariants} className="mt-8 space-y-3">
              {[
                "Company & prospect enrichment",
                "Research summaries in context",
                "ICP fit scoring",
                "Intent signals that explain why",
              ].map((detail) => (
                <li key={detail} className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  {detail}
                </li>
              ))}
            </motion.ul>

            {/* Phase 3 → Phase 4 transition language */}
            <motion.p
              variants={noteVariants}
              className="mt-8 flex items-center gap-2 text-xs text-slate-400"
            >
              <Layers3 className="h-3.5 w-3.5" strokeWidth={2.2} />
              Discovery becomes understanding — one connected intelligence workspace.
            </motion.p>
          </div>

          {/* Right — interactive intelligence interface */}
          <IntelligenceInterface />
        </div>
      </motion.div>
    </section>
  );
}