"use client";

import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Building2,
  Check,
  Info,
  ScanSearch,
  Target,
} from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Explore hero product visual — a refined prospect/company interface.
 *
 * Two-column layout showing the core Prosventa concepts:
 *   Left:  Company header, ICP match, intent signals
 *   Right: Company intelligence, next best action, qualification
 *
 * All data is clearly labeled as demo/sample — no real company
 * intelligence is presented as verified.
 */
export default function ExploreHeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
      className="relative"
    >
      {/* Layered depth frames — quiet, architectural */}
      <div aria-hidden className="absolute -inset-2 rounded-[22px] border border-slate-200/50" />
      <div aria-hidden className="absolute -inset-5 rounded-[28px] border border-slate-100" />

      {/* Product card */}
      <div className="card-hover relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12),0_8px_24px_-8px_rgba(15,23,42,0.06)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" iconSize={15} />
            <span className="text-[13px] font-semibold tracking-tight text-navy-900">
              Prosventa
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            <span className="h-1 w-1 rounded-full bg-amber-500" />
            Demo
          </span>
        </div>

        {/* Body — two-column prospect interface */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* ── Left — Prospect overview ─────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.55 }}
            className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r"
          >
            {/* Company header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600">
                A
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
                    Acme Corp
                  </p>
                  <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    Sample
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  SaaS · Chicago · 200–500 employees
                </p>
              </div>
            </div>

            {/* ICP Match */}
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" strokeWidth={2.2} />
                  <span className="text-[13px] font-medium text-slate-900">
                    ICP Match
                  </span>
                </div>
                <span className="inline-flex items-baseline gap-0.5 text-sm font-semibold text-blue-600">
                  92
                  <span className="text-[11px] font-medium text-blue-400">/100</span>
                </span>
              </div>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-blue-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "92%" }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.8 }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                />
              </div>
              <p className="mt-2 text-[11px] font-medium text-slate-600">
                Strong fit for your ideal customer profile
              </p>
            </div>

            {/* Intent signals */}
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <Activity className="h-3.5 w-3.5" strokeWidth={2.2} />
                Intent signals
              </p>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between rounded-md px-1.5 py-1">
                  <span className="text-[12px] text-slate-600">
                    Researching & evaluating tools
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-blue-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md px-1.5 py-1">
                  <span className="text-[12px] text-slate-600">
                    Expanding tooling budget
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Rising
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Right — Intelligence & next step ─────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.72 }}
            className="p-5"
          >
            {/* Company intelligence */}
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <ScanSearch className="h-3.5 w-3.5" strokeWidth={2.2} />
              Company intelligence
            </p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between rounded-md px-1.5 py-1">
                <span className="text-[12px] text-slate-600">Firmographics</span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Available
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md px-1.5 py-1">
                <span className="text-[12px] text-slate-600">Research</span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Available
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md px-1.5 py-1">
                <span className="text-[12px] text-slate-600">Enrichment</span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Detected
                </span>
              </div>
            </div>

            {/* Next best action */}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <Building2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Next best action
                </p>
                <p className="mt-1 truncate text-[13px] font-medium text-slate-900">
                  Research further before outreach
                </p>
              </div>
              <span className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            </div>

            {/* Qualification */}
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
              <span className="text-[13px] font-medium text-slate-900">
                Qualified prospect
              </span>
            </div>
          </motion.div>
        </div>

        {/* Footnote — honest about demo data */}
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
          <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="text-[11px] text-slate-400">
            Illustrative example — no real company data shown.
          </p>
        </div>
      </div>
    </motion.div>
  );
}