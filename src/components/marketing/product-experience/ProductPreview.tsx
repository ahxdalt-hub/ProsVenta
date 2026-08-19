"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Check,
  Info,
  ScanSearch,
  Search,
} from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface IntelligenceRow {
  label: string;
  status: string;
  dotClass: string;
  statusClass: string;
}

interface Prospect {
  id: string;
  initials: string;
  name: string;
  meta: string;
  fit: "High" | "Medium";
  fitScore: number;
  signal: "Active" | "Rising" | "Watching";
  signalText: string;
  qualification: string;
  intelligence: IntelligenceRow[];
  nextStep: string;
}

const FIT_STYLES = {
  High: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

const SIGNAL_STYLES = {
  Active: { dot: "bg-blue-500", text: "text-slate-600" },
  Rising: { dot: "bg-emerald-500", text: "text-slate-600" },
  Watching: { dot: "bg-slate-300", text: "text-slate-500" },
} as const;

/**
 * Illustrative sample workspace — all companies and fields are
 * fictional demo content used to communicate the product concept.
 * No real company data is shown or implied to be verified.
 */
const PROSPECTS: Prospect[] = [
  {
    id: "meridian",
    initials: "ML",
    name: "Meridian Labs",
    meta: "SaaS · Austin · 50–200 employees",
    fit: "High",
    fitScore: 92,
    signal: "Active",
    signalText: "Researching & evaluating tools",
    qualification: "Strong ICP alignment",
    intelligence: [
      { label: "Firmographics", status: "Available", dotClass: "bg-emerald-500", statusClass: "text-emerald-600" },
      { label: "Intent signals", status: "Detected", dotClass: "bg-blue-500", statusClass: "text-blue-600" },
      { label: "Research", status: "Available", dotClass: "bg-blue-500", statusClass: "text-blue-600" },
    ],
    nextStep: "Share the research summary with your team",
  },
  {
    id: "atlas",
    initials: "AG",
    name: "Atlas Grid",
    meta: "Infrastructure · Denver · 500–1,000 employees",
    fit: "High",
    fitScore: 88,
    signal: "Rising",
    signalText: "Expanding tooling budget",
    qualification: "Good ICP alignment",
    intelligence: [
      { label: "Firmographics", status: "Available", dotClass: "bg-emerald-500", statusClass: "text-emerald-600" },
      { label: "Intent signals", status: "Detected", dotClass: "bg-blue-500", statusClass: "text-blue-600" },
      { label: "Research", status: "Partial", dotClass: "bg-amber-500", statusClass: "text-amber-600" },
    ],
    nextStep: "Prepare outreach around the expansion signal",
  },
  {
    id: "harborline",
    initials: "HL",
    name: "Harborline",
    meta: "Logistics · Seattle · 200–500 employees",
    fit: "Medium",
    fitScore: 64,
    signal: "Watching",
    signalText: "No active evaluation",
    qualification: "Moderate fit — monitor",
    intelligence: [
      { label: "Firmographics", status: "Available", dotClass: "bg-emerald-500", statusClass: "text-emerald-600" },
      { label: "Intent signals", status: "None", dotClass: "bg-slate-300", statusClass: "text-slate-500" },
      { label: "Research", status: "Available", dotClass: "bg-blue-500", statusClass: "text-blue-600" },
    ],
    nextStep: "No action required yet — keep watching",
  },
];

export default function ProductPreview() {
  const [selectedId, setSelectedId] = useState(PROSPECTS[0].id);
  const selected = PROSPECTS.find((p) => p.id === selectedId) ?? PROSPECTS[0];

  return (
    <div className="relative">
      {/* Layered depth frames — quiet continuation of the hero */}
      <div aria-hidden className="absolute -inset-2 rounded-[22px] border border-slate-200/50" />
      <div aria-hidden className="absolute -inset-5 rounded-[28px] border border-slate-100" />

      {/* Product frame */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12),0_8px_24px_-8px_rgba(15,23,42,0.06)]">
        {/* Frame header */}
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

        {/* Workspace body */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_1fr]">
          {/* ── Prospect list panel ─────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.25 }}
            className="border-b border-slate-100 p-4 lg:border-b-0 lg:border-r lg:p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Prospects
              </p>
              <span className="text-[11px] font-medium text-slate-400">3 sample</span>
            </div>

            {/* Decorative search — visual only, not functional */}
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2">
              <Search className="h-3.5 w-3.5 text-slate-400" strokeWidth={2.2} />
              <span className="text-xs text-slate-400">Search prospects…</span>
            </div>

            {/* Column headers */}
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Company</span>
              <span className="w-14 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fit</span>
              <span className="w-[74px] text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Signal</span>
            </div>

            {/* Prospect rows */}
            <div className="mt-1.5 space-y-1">
              {PROSPECTS.map((prospect) => {
                const isActive = prospect.id === selectedId;
                return (
                  <motion.button
                    key={prospect.id}
                    type="button"
                    aria-pressed={isActive}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.32 + PROSPECTS.findIndex((p) => p.id === prospect.id) * 0.08 }}
                    onClick={() => setSelectedId(prospect.id)}
                    className={`relative grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg border px-2 py-2.5 text-left transition-colors duration-200 ${
                      isActive
                        ? "border-blue-200 bg-blue-50/60"
                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {/* Active left rail */}
                    {isActive && (
                      <motion.span
                        layoutId="preview-active-rail"
                        transition={{ duration: 0.25, ease: EASE }}
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-blue-600"
                      />
                    )}

                    {/* Company */}
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold transition-colors duration-200 ${
                        isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                        {prospect.initials}
                      </span>
                      <span className={`truncate text-[13px] font-medium transition-colors duration-200 ${
                        isActive ? "text-slate-900" : "text-slate-600"
                      }`}>
                        {prospect.name}
                      </span>
                    </span>

                    {/* Fit */}
                    <span className={`w-14 justify-self-end rounded-full border px-1.5 py-0.5 text-center text-[10px] font-semibold ${FIT_STYLES[prospect.fit]}`}>
                      {prospect.fit}
                    </span>

                    {/* Signal */}
                    <span className="flex w-[74px] items-center justify-end gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${SIGNAL_STYLES[prospect.signal].dot}`} />
                      <span className={`text-[11px] font-medium ${SIGNAL_STYLES[prospect.signal].text}`}>
                        {prospect.signal}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* ── Detail panel ────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.42 }}
            className="p-4 sm:p-5"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                {/* Company header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[13px] font-semibold text-blue-600">
                      {selected.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                          {selected.name}
                        </h3>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                          Sample
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                        {selected.meta}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Qualification */}
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-blue-600" strokeWidth={2.5} />
                      <span className="text-[13px] font-medium text-slate-900">ICP Fit</span>
                    </div>
                    <span className="inline-flex items-baseline gap-0.5 text-sm font-semibold text-blue-600">
                      {selected.fitScore}
                      <span className="text-[11px] font-medium text-blue-400">/100</span>
                    </span>
                  </div>
                  {/* Score bar */}
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-blue-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selected.fitScore}%` }}
                      transition={{ duration: 0.7, ease: EASE }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-slate-600">
                    {selected.qualification}
                  </p>
                </div>

                {/* Intelligence */}
                <div className="mt-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <ScanSearch className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Company intelligence
                  </p>
                  <div className="mt-2 space-y-1">
                    {selected.intelligence.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between rounded-md px-1.5 py-1"
                      >
                        <span className="text-[12px] text-slate-600">{row.label}</span>
                        <span className={`flex items-center gap-1.5 text-[11px] font-medium ${row.statusClass}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${row.dotClass}`} />
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended next step */}
                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <Building2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                      Recommended next step
                    </p>
                    <p className="mt-1 truncate text-[13px] font-medium text-slate-900">
                      {selected.nextStep}
                    </p>
                  </div>
                  <span className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Footnote — honest about demo data */}
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
          <Info className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-[11px] text-slate-400">
            Illustrative sample workspace — no real company data shown.
          </p>
        </div>
      </div>
    </div>
  );
}