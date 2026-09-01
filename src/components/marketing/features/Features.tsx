"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const introVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/**
 * Feature groups — mirrors the actual in-app feature catalog
 * (src/features/entitlement/features.ts). Nothing listed here is a
 * capability the product does not have.
 */
const featureGroups = [
  {
    title: "Find & organize",
    items: [
      "Prospect search and discovery",
      "Saved lists to organize your pipeline",
      "CSV import and data export",
    ],
  },
  {
    title: "Enrich & understand",
    items: [
      "Company enrichment — industry, size, technology, signals",
      "Prospect enrichment — roles and contact details",
      "Company and prospect research briefs",
    ],
  },
  {
    title: "Prioritize & act",
    items: [
      "ICP scoring against your Ideal Customer Profile",
      "Buying-intent and engagement signal detection",
      "Evidence-based next-step recommendations",
    ],
  },
  {
    title: "Automate & collaborate",
    items: [
      "Automation of repetitive prospecting workflows",
      "Multi-step workflows with approval gates",
      "Team collaboration and pipeline analytics",
    ],
  },
];

export default function Features() {
  return (
    <section id="features" className="relative scroll-mt-20 bg-slate-50 pb-24 lg:pb-32">
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
        <motion.div variants={introVariants} className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Features
          </span>
          <h2 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 lg:text-[44px] lg:leading-[1.15]">
            Practical prospecting,{" "}
            <span className="text-gradient">backed by evidence.</span>
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-lg leading-relaxed text-slate-600">
            Everything Prosventa does is built around one goal — helping you
            understand which prospects deserve your attention.
          </p>
        </motion.div>

        {/* Feature groups */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          {featureGroups.map((group) => (
            <motion.div
              key={group.title}
              variants={cardVariants}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-colors duration-200 hover:border-slate-300"
            >
              <h3 className="text-base font-semibold tracking-tight text-slate-900">
                {group.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    <span className="text-sm leading-relaxed text-slate-600">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
