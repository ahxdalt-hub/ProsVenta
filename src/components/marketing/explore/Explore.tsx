"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import TransitionLink from "@/components/transitions/TransitionLink";
import { MARKETING_ROUTES } from "@/components/marketing/routes";

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

const railVariants = {
  hidden: { opacity: 0, scaleY: 0 },
  show: {
    opacity: 1,
    scaleY: 1,
    transition: { duration: 0.7, ease: EASE, delay: 0.15 },
  },
};

const stageVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const ctaVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const stages = [
  {
    number: "01",
    label: "Discover",
    description: "Find the right companies and people.",
  },
  {
    number: "02",
    label: "Understand",
    description: "See the full picture behind each prospect.",
  },
  {
    number: "03",
    label: "Qualify",
    description: "Focus on what actually matters.",
  },
  {
    number: "04",
    label: "Act",
    description: "Take the next step with confidence.",
  },
];

/**
 * Explore — Phase 6 CTA section.
 *
 * A compact, balanced bridge between the homepage ("here's what Prosventa is")
 * and the dedicated /explore destination ("here's how the whole system works").
 *
 * Left column: eyebrow, curiosity-driven heading, concise explanation, and the
 * primary Explore CTA. Right column: a restrained vertical journey visual —
 * DISCOVER → UNDERSTAND → QUALIFY → ACT — with a subtle connecting rail that
 * draws downward as the steps reveal sequentially.
 *
 * The section is intentionally not a hero: it is a small invitation to discover
 * more, not a second feature showcase.
 */
export default function Explore() {
  const reduce = useReducedMotion();

  return (
    <section id="explore" className="relative scroll-mt-20 bg-slate-50 pt-10 pb-16 lg:pt-14 lg:pb-20">
      {/* Ambient background — restrained continuation of the journey */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="grid-pattern absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_15%,black,transparent)]" />
      </div>

      <motion.div
        variants={container}
        initial={reduce ? false : "hidden"}
        whileInView={reduce ? undefined : "show"}
        viewport={{ once: true, amount: 0.3 }}
        className="group relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          {/* Left — eyebrow, heading, copy, CTA */}
          <div>
            <motion.div variants={introVariants}>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Explore Prosventa
              </span>
            </motion.div>

            <motion.h2
              variants={introVariants}
              className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 lg:text-[44px] lg:leading-[1.15]"
            >
              Curious how <span className="text-gradient">Prosventa works?</span>
            </motion.h2>

            <motion.p
              variants={introVariants}
              className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600"
            >
              See how Prosventa turns scattered prospects into clearer
              opportunities and actionable next steps.
            </motion.p>

            <motion.div variants={ctaVariants} className="mt-8">
              <TransitionLink
                href={MARKETING_ROUTES.EXPLORE}
                className="btn-press group/cta inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                Explore Prosventa
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
              </TransitionLink>
            </motion.div>
          </div>

          {/* Right — journey visual */}
          <motion.div variants={introVariants} className="relative">
            <div className="relative mx-auto max-w-sm">
              {/* Vertical connector rail — draws downward as steps reveal */}
              <motion.div
                aria-hidden
                variants={railVariants}
                style={{ transformOrigin: "top" }}
                className="absolute left-5 top-5 bottom-5 w-px bg-gradient-to-b from-slate-200 via-blue-200 to-slate-200 transition-colors duration-300 group-hover:from-slate-300 group-hover:via-blue-300 group-hover:to-slate-300"
              />

              <ol className="space-y-6">
                {stages.map((stage) => (
                  <motion.li
                    key={stage.number}
                    variants={stageVariants}
                    className="relative flex items-center gap-4"
                  >
                    <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-xs transition-colors duration-200 group-hover:border-blue-200 group-hover:bg-blue-50/50">
                      <span className="text-xs font-semibold text-slate-500 transition-colors duration-200 group-hover:text-blue-600">
                        {stage.number}
                      </span>
                    </span>
                    <div>
                      <span className="block text-sm font-semibold tracking-tight text-slate-900">
                        {stage.label}
                      </span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-slate-500">
                        {stage.description}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}