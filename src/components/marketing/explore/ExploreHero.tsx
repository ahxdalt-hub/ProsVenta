"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import ExploreHeroVisual from "./ExploreHeroVisual";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const visualVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay: 0.35 } },
};

const cueVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: EASE, delay: 0.9 } },
};

/**
 * Explore — Phase 2 hero.
 *
 * A centered, product-focused hero that introduces what Prosventa is
 * and invites the visitor into the product story. The primary CTA
 * scrolls to the next section of the Explore page; the secondary CTA
 * scrolls to the product/demo area further down.
 */
export default function ExploreHero() {
  const reduce = useReducedMotion();

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  };

  return (
    <section className="relative overflow-hidden bg-slate-50">
      {/* Ambient background — restrained brand depth, no neon */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="grid-pattern absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-blue-500/[0.05] blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={container}
          initial={reduce ? false : "hidden"}
          animate={reduce ? undefined : "show"}
          className="mx-auto max-w-3xl pt-32 pb-16 text-center lg:pt-40 lg:pb-20"
        >
          {/* Eyebrow — small product label */}
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Explore Prosventa
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={item}
            className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[56px] lg:leading-[1.1]"
          >
            Find opportunities{" "}
            <span className="text-gradient">worth understanding.</span>
          </motion.h1>

          {/* Supporting copy */}
          <motion.p
            variants={item}
            className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-600"
          >
            Prosventa helps you discover promising prospects, understand
            their context, and move toward the right opportunities.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={item}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="#explore-product"
              onClick={(e) => scrollToSection(e, "explore-product")}
              className="btn-press group inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              Explore the product
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="#explore-how-it-works"
              onClick={(e) => scrollToSection(e, "explore-how-it-works")}
              className="btn-press group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              See how it works
            </a>
          </motion.div>

          {/* Subtle scroll cue */}
          <motion.div variants={cueVariants} className="mt-12 flex justify-center">
            <motion.span
              aria-hidden
              animate={reduce ? undefined : { y: [0, 6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-xs"
            >
              <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
            </motion.span>
          </motion.div>
        </motion.div>

        {/* Product visual */}
        <motion.div
          id="explore-product"
          variants={visualVariants}
          initial={reduce ? false : "hidden"}
          animate={reduce ? undefined : "show"}
          className="relative mx-auto max-w-4xl scroll-mt-24 pb-24 lg:pb-32"
        >
          <ExploreHeroVisual />
        </motion.div>
      </div>
    </section>
  );
}