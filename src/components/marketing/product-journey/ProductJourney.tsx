"use client";

import { motion } from "framer-motion";
import {
  ActVisual,
  DiscoverVisual,
  PrioritizeVisual,
  UnderstandVisual,
} from "./stage-visuals";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.05,
    },
  },
};

const introVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const railVariants = {
  hidden: { opacity: 0, scaleX: 0 },
  show: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: 0.7, ease: EASE },
  },
};

const stageVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const stages = [
  {
    number: "01",
    title: "Discover",
    description: "Find companies and prospects that fit your target.",
    visual: <DiscoverVisual />,
  },
  {
    number: "02",
    title: "Understand",
    description: "Go beyond the basics with company and prospect intelligence.",
    visual: <UnderstandVisual />,
  },
  {
    number: "03",
    title: "Prioritize",
    description: "Identify which opportunities deserve attention.",
    visual: <PrioritizeVisual />,
  },
  {
    number: "04",
    title: "Act",
    description: "Turn the insight into a relevant next step.",
    visual: <ActVisual />,
  },
];

export default function ProductJourney() {
  return (
    <section id="product" className="relative scroll-mt-20 bg-slate-50 pb-24 lg:pb-32">
      {/* Ambient background — restrained continuation of the hero */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="grid-pattern absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_15%,black,transparent)]" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="relative mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8"
      >
        {/* Section intro */}
        <motion.div variants={introVariants} className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Product journey
          </span>
          <h2 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 lg:text-[44px] lg:leading-[1.15]">
            From prospect to{" "}
            <span className="text-gradient">opportunity.</span>
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
            Prosventa turns scattered prospect information into a clearer path
            from discovery to action.
          </p>
        </motion.div>

        {/* Journey */}
        <div className="relative mt-14 lg:mt-20">
          {/* Connector rail — sits behind the stage nodes */}
          <motion.div
            aria-hidden
            variants={railVariants}
            style={{ transformOrigin: "left" }}
            className="absolute left-2 right-2 top-5 hidden h-px origin-left bg-gradient-to-r from-slate-200 via-blue-200 to-slate-200 lg:block"
          />

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7">
            {stages.map((stage) => (
              <motion.article
                key={stage.number}
                variants={stageVariants}
                className="group relative"
              >
                {/* Node */}
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-xs transition-colors duration-200 group-hover:border-blue-200 group-hover:bg-blue-50/50">
                  <span className="text-xs font-semibold text-slate-500 transition-colors duration-200 group-hover:text-blue-600">
                    {stage.number}
                  </span>
                </div>

                {/* Copy */}
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">
                  {stage.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {stage.description}
                </p>

                {/* Stage visual */}
                <div className="mt-6 h-[168px]">{stage.visual}</div>
              </motion.article>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}