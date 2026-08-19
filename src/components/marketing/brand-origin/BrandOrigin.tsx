"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { BRAND_ORBIT_PATHS } from "@/components/branding/BrandIcon";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Brand Origin — the single source of truth for the Prosventa name story.
 *
 * A wide, compact editorial band: PROSPECT + VENTURE → PROSVENTA.
 * Left-aligned content in a ~2:1 grid with a restrained warped-orbit echo
 * on the right — balanced across the content column without dominating.
 *
 * Animation sequence (runs once on viewport entry, then stops):
 *   1. Label fades in
 *   2. "Prosventa comes from" fades in
 *   3. PROSPECT slides in from the left
 *   4. "+" appears
 *   5. VENTURE slides in from the right
 *   6. Connector arrow subtly animates
 *   7. PROSVENTA resolves as the final result
 *   8. Right-side orbit mark draws in with a diamond accent
 *   9. "Two ideas behind one name." fades in
 */
export default function BrandOrigin() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();

  return (
    <section className="relative bg-slate-50 py-6 lg:py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={
            reduce ? undefined : isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }
          }
          transition={{ duration: 0.5, ease: EASE }}
          className="group grid overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-colors duration-300 hover:border-slate-300/80 lg:grid-cols-[1fr_0.5fr]"
        >
          {/* Left — primary content, aligned to the homepage content grid */}
          <div className="px-7 py-6 sm:px-8 lg:px-10 lg:py-7">
            {/* Label */}
            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              animate={reduce ? undefined : isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
              className="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            >
              A little detail
            </motion.p>

            {/* Intro line */}
            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              animate={reduce ? undefined : isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
              className="mt-2 text-sm text-slate-500"
            >
              Prosventa comes from
            </motion.p>

            {/* Word composition — one constructed line */}
            <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {/* PROSPECT — appears first, slides from the left */}
              <motion.span
                initial={reduce ? false : { opacity: 0, x: -10 }}
                animate={
                  reduce ? undefined : isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }
                }
                transition={{ duration: 0.45, ease: EASE, delay: 0.25 }}
                className="text-lg font-semibold tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-slate-950 sm:text-xl"
              >
                PROSPECT
              </motion.span>

              {/* + — tiny connector */}
              <motion.span
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                animate={
                  reduce ? undefined : isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }
                }
                transition={{ duration: 0.3, ease: EASE, delay: 0.4 }}
                className="text-sm font-light text-slate-400 sm:text-base"
                aria-hidden="true"
              >
                +
              </motion.span>

              {/* VENTURE — appears third, slides from the right */}
              <motion.span
                initial={reduce ? false : { opacity: 0, x: 10 }}
                animate={
                  reduce ? undefined : isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }
                }
                transition={{ duration: 0.45, ease: EASE, delay: 0.55 }}
                className="text-lg font-semibold tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-slate-950 sm:text-xl"
              >
                VENTURE
              </motion.span>

              {/* Arrow — subtle connector, blue accent */}
              <motion.span
                initial={reduce ? false : { opacity: 0, x: -3 }}
                animate={reduce ? undefined : isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -3 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.75 }}
                className="text-base font-normal text-blue-600 transition-transform duration-300 group-hover:translate-x-0.5 sm:text-lg"
                aria-hidden="true"
              >
                →
              </motion.span>

              {/* PROSVENTA — resolves as the final result */}
              <motion.span
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={reduce ? undefined : isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.9 }}
                className="text-lg font-semibold tracking-tight text-blue-600 transition-colors duration-300 group-hover:text-blue-700 sm:text-xl"
              >
                PROSVENTA
              </motion.span>
            </div>

            {/* One-line explanation */}
            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              animate={reduce ? undefined : isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 1.1 }}
              className="mt-2 text-sm leading-relaxed text-slate-500"
            >
              Two ideas behind one name.
            </motion.p>
          </div>

          {/* Right — restrained decorative mark (secondary, not a feature) */}
          <div
            aria-hidden
            className="relative hidden overflow-hidden border-l border-slate-100 lg:block"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-20 w-20 text-blue-600/25"
              >
                <motion.g
                  initial={reduce ? false : { opacity: 0 }}
                  animate={reduce ? undefined : isInView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE, delay: 0.8 }}
                >
                  {/* Ring */}
                  <motion.path
                    d={BRAND_ORBIT_PATHS[0]}
                    stroke="currentColor"
                    strokeWidth={0.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={reduce ? undefined : isInView ? { pathLength: 1 } : { pathLength: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.85 }}
                  />
                  {/* Crescent */}
                  <motion.path
                    d={BRAND_ORBIT_PATHS[1]}
                    stroke="currentColor"
                    strokeWidth={0.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={reduce ? undefined : isInView ? { pathLength: 1 } : { pathLength: 0 }}
                    transition={{ duration: 0.3, ease: EASE, delay: 1.0 }}
                  />
                  {/* Tick */}
                  <motion.path
                    d={BRAND_ORBIT_PATHS[2]}
                    stroke="currentColor"
                    strokeWidth={0.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={reduce ? undefined : isInView ? { pathLength: 1 } : { pathLength: 0 }}
                    transition={{ duration: 0.3, ease: EASE, delay: 1.05 }}
                  />
                  {/* Comet dash */}
                  <motion.path
                    d={BRAND_ORBIT_PATHS[3]}
                    stroke="currentColor"
                    strokeWidth={0.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={reduce ? undefined : isInView ? { pathLength: 1 } : { pathLength: 0 }}
                    transition={{ duration: 0.3, ease: EASE, delay: 1.1 }}
                  />
                  {/* Diamond accent — the opportunity where a venture lands */}
                  <motion.rect
                    x={15.5}
                    y={2.35}
                    width={1.4}
                    height={1.4}
                    transform="rotate(45 16.2 3.05)"
                    fill="currentColor"
                    className="text-blue-600/70"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={reduce ? undefined : isInView ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE, delay: 1.2 }}
                  />
                </motion.g>
              </svg>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}