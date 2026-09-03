"use client";

// ============================================================================
// FinalCta — closing call-to-action card on the pricing page
// ============================================================================
// Same light-blue theme and cursor-spotlight interaction as CreditInfo.
// Buttons animate in on scroll (framer-motion) and their arrow icons slide
// on hover. Links come from MARKETING_ROUTES.
// ============================================================================

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import TransitionButton from "@/components/transitions/TransitionButton";
import TransitionLink from "@/components/transitions/TransitionLink";
import { MARKETING_ROUTES } from "@/components/marketing/routes";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function FinalCta() {
  const cardRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spotlight-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spotlight-y", `${e.clientY - rect.top}px`);
  };

  const fadeUp = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.4 },
          transition: { duration: 0.6, ease: EASE, delay },
        };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="relative mt-24 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-6 py-16 text-center shadow-lg shadow-blue-100/60 sm:px-12"
    >
      {/* Cursor spotlight — soft blue glow tracking the pointer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--spotlight-x, 50%) var(--spotlight-y, 0%), rgba(59, 130, 246, 0.10), transparent 65%)",
        }}
      />
      {/* Decorative gradient blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl"
      />
      {/* Top hairline highlight */}
      <div
        aria-hidden="true"
        className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
      />

      <div className="relative">
        <motion.span
          {...fadeUp(0)}
          className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 shadow-xs"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Ready when you are
        </motion.span>

        <motion.h2
          {...fadeUp(0.08)}
          className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
        >
          Start finding{" "}
          <span className="text-gradient">better prospects.</span>
        </motion.h2>

        <motion.p
          {...fadeUp(0.16)}
          className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-600"
        >
          Create a free workspace — search, organize, and export prospects
          today. Add intelligence when you are ready.
        </motion.p>

        <motion.div
          {...fadeUp(0.24)}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          {/* Primary — arrow slides right on hover */}
          <TransitionButton
            href={MARKETING_ROUTES.GET_STARTED}
            className="btn-press group inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-navy-800 hover:shadow-lg hover:shadow-navy-900/25 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            Get Started
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
            />
          </TransitionButton>

          {/* Secondary — compass rotates on hover */}
          <TransitionLink
            href={MARKETING_ROUTES.EXPLORE}
            className="btn-press group inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-xs transition-all duration-300 ease-out hover:scale-[1.03] hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 hover:shadow-md hover:shadow-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <Compass
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-500 ease-out group-hover:rotate-45"
            />
            Explore Prosventa
          </TransitionLink>
        </motion.div>

        <motion.p {...fadeUp(0.32)} className="mt-6 text-xs text-slate-400">
          By using Prosventa you agree to our{" "}
          <Link href="/terms" className="text-slate-500 underline decoration-slate-300 hover:text-slate-700">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-slate-500 underline decoration-slate-300 hover:text-slate-700">
            Privacy Policy
          </Link>
          .
        </motion.p>
      </div>
    </div>
  );
}

