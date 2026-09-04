"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import PricingPlans from "@/components/marketing/pricing/PricingPlans";
import TransitionLink from "@/components/transitions/TransitionLink";
import { MARKETING_ROUTES } from "@/components/marketing/routes";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const slideFromRight = {
  hidden: { opacity: 0, x: 90 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};

/**
 * PricingSection — inline homepage pricing (no separate page round-trip).
 *
 * The plans grid is statically rendered as part of the homepage, so it is
 * already present the moment the page loads — scrolling to it is instant.
 * Content sweeps in from the right with a soft, buttery ease-out as it
 * enters the viewport, matching the rest of the marketing motion language.
 */
export default function PricingSection() {
  const reduce = useReducedMotion();

  return (
    <section id="pricing" className="relative scroll-mt-20 bg-slate-50 pb-24 lg:pb-32">
      {/* Ambient background — same restrained depth as the other sections */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="grid-pattern absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_15%,black,transparent)]" />
      </div>

      <motion.div
        variants={container}
        initial={reduce ? false : "hidden"}
        whileInView={reduce ? undefined : "show"}
        viewport={{ once: true, amount: 0.15 }}
        className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        {/* Section intro — slides in from the right */}
        <motion.div variants={slideFromRight} className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Pricing
          </span>
          <h2 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 lg:text-[44px] lg:leading-[1.15]">
            Simple, <span className="text-gradient">transparent pricing.</span>
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-lg leading-relaxed text-slate-600">
            Start free with 100 credits. Upgrade for more capacity and
            intelligence features.
          </p>
        </motion.div>

        {/* Plans — billing toggle and cards sweep in from the right (in PricingPlans). */}
        <PricingPlans />

        {/* Bridge to the full pricing page — credits, FAQ, contact-sales plan */}
        <motion.div variants={slideFromRight} className="mt-12 text-center">
          <TransitionLink
            href={MARKETING_ROUTES.PRICING}
            className="group inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 transition-colors duration-150 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            View full pricing details
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </TransitionLink>
        </motion.div>
      </motion.div>
    </section>
  );
}