"use client";

import { motion } from "framer-motion";
import ProductPreview from "./ProductPreview";

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

const frameVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay: 0.15 } },
};

export default function ProductExperience() {
  return (
    <section id="experience" className="relative bg-slate-50 pb-24 lg:pb-32">
      {/* Ambient background — restrained continuation of the journey */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="grid-pattern absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_15%,black,transparent)]" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        {/* Section intro */}
        <motion.div variants={introVariants} className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Product experience
          </span>
          <h2 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 lg:text-[44px] lg:leading-[1.15]">
            See Prosventa{" "}
            <span className="text-gradient">in motion.</span>
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-lg leading-relaxed text-slate-600">
            Discovery, intelligence, prioritization, and action — together in
            one workspace for your team.
          </p>
        </motion.div>

        {/* Product preview frame */}
        <motion.div variants={frameVariants} className="relative mx-auto mt-14 max-w-5xl lg:mt-20">
          <ProductPreview />
        </motion.div>
      </motion.div>
    </section>
  );
}