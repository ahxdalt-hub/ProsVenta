"use client";

import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Info,
  ScanSearch,
} from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface StageRowProps {
  icon: typeof Building2;
  iconClassName?: string;
  delay: number;
  children: React.ReactNode;
}

function StageRow({ icon: Icon, iconClassName = "", delay, children }: StageRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE, delay }}
      className="relative flex gap-3.5"
    >
      <div
        className={`relative z-10 mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] border bg-white ${iconClassName}`}
      >
        <Icon className="h-[15px] w-[15px]" strokeWidth={2.1} />
      </div>
      <div className="min-w-0 flex-1 pb-5">{children}</div>
    </motion.div>
  );
}

function StageLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </p>
  );
}

export default function HeroProductVisual() {
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

        {/* Journey body */}
        <div className="relative px-5 pb-5 pt-4">
          {/* Vertical rail */}
          <div
            aria-hidden
            className="absolute left-[14px] top-2 bottom-10 w-px bg-gradient-to-b from-slate-100 via-slate-200 to-slate-100"
          />

          {/* Travelling indicator — slow and steady */}
          <motion.span
            aria-hidden
            className="absolute left-[13px] top-2 z-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-blue-500"
            animate={{ top: ["8px", `calc(100% - 40px)`], opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 4.8,
              times: [0, 0.25, 0.75, 1],
              repeat: Infinity,
              repeatDelay: 2.4,
              ease: "easeInOut",
              delay: 1.6,
            }}
          />

          {/* Stage 1 — Prospect */}
          <StageRow delay={0.55} icon={Building2} iconClassName="border-slate-200 text-slate-500">
            <StageLabel>Prospect</StageLabel>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[13px] font-semibold text-blue-600">
                A
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Acme Corp</p>
                <p className="mt-0.5 text-xs text-slate-500">SaaS · Chicago · 200–500 employees</p>
              </div>
            </div>
          </StageRow>

          {/* Stage 2 — Intelligence */}
          <StageRow delay={0.72} icon={ScanSearch} iconClassName="border-slate-200 text-navy-600">
            <StageLabel>Company Intelligence</StageLabel>
            <div className="mt-2.5 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-slate-600">Research</span>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Available
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-slate-600">Enrichment</span>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Available
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-slate-600">Signals</span>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Detected
                </span>
              </div>
            </div>
          </StageRow>

          {/* Stage 3 — ICP Match (active focus) */}
          <StageRow
            delay={0.89}
            icon={CheckCircle2}
            iconClassName="border-blue-300 bg-blue-50 text-blue-600 shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
          >
            <StageLabel>ICP Match</StageLabel>
            <div className="mt-2.5 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 p-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" strokeWidth={2.5} />
                <span className="text-sm font-medium text-slate-900">Strong match</span>
              </div>
              <span className="inline-flex items-baseline gap-0.5 text-sm font-semibold text-blue-600">
                92
                <span className="text-[11px] font-medium text-blue-400">/100</span>
              </span>
            </div>
          </StageRow>

          {/* Stage 4 — Intent Signal */}
          <StageRow delay={1.06} icon={Activity} iconClassName="border-slate-200 text-slate-500">
            <StageLabel>Intent Signal</StageLabel>
            <div className="mt-2.5 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <span className="text-[13px] text-slate-600">
                Researching & evaluating tools
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-blue-500" />
                Active
              </span>
            </div>
          </StageRow>

          {/* Stage 5 — Next Best Action */}
          <StageRow
            delay={1.22}
            icon={ArrowRight}
            iconClassName="border-navy-900 bg-navy-900 text-white"
          >
            <StageLabel>Next Best Action</StageLabel>
            <div className="mt-2.5 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <span className="text-sm font-medium text-slate-900">Research further</span>
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue-600">
                Open
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </StageRow>
        </div>

        {/* Footnote — honest about demo data */}
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
          <Info className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-[11px] text-slate-400">
            Illustrative example — no real company data shown.
          </p>
        </div>
      </div>
    </motion.div>
  );
}