"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Info, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/branding/BrandLogo";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const SAMPLE_QUERY = "B2B SaaS · Series B · North America";

type Fit = "Strong fit" | "Exploring" | "New";
type Filter = "All" | Fit;

interface SampleCompany {
  id: string;
  initial: string;
  name: string;
  meta: string;
  fit: Fit;
}

/**
 * Fictional sample companies — clearly marked as demo data.
 * No real prospect information is presented as verified.
 */
const SAMPLE_COMPANIES: SampleCompany[] = [
  {
    id: "northwind",
    initial: "N",
    name: "Northwind Labs",
    meta: "Enterprise SaaS · Austin · 51–200",
    fit: "Strong fit",
  },
  {
    id: "meridian",
    initial: "M",
    name: "Meridian Systems",
    meta: "Fintech · London · 201–500",
    fit: "Strong fit",
  },
  {
    id: "harborpeak",
    initial: "H",
    name: "Harborpeak",
    meta: "Logistics · Rotterdam · 501–1k",
    fit: "Exploring",
  },
  {
    id: "cascade",
    initial: "C",
    name: "Cascade Bio",
    meta: "Healthtech · Boston · 11–50",
    fit: "New",
  },
];

const FILTERS: Filter[] = ["All", "Strong fit", "New"];

const FIT_META: Record<Fit, { dot: string; label: string }> = {
  "Strong fit": { dot: "bg-emerald-500", label: "text-emerald-600" },
  Exploring: { dot: "bg-blue-500", label: "text-blue-600" },
  New: { dot: "bg-slate-400", label: "text-slate-500" },
};

const searchVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE, delay: 0.15 } },
};

const chipVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.35 } },
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.5 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/**
 * DiscoveryInterface — deterministic, marketing-only simulation of the
 * Prosventa discovery workspace.
 *
 * The interface plays a one-time sequence when it enters view:
 *   search field → sample query → results reveal → highlight → select → cue.
 *
 * It is fully self-contained: no API calls, no backend, no real data.
 * Filters and selection are lightweight local state for demonstration.
 */
export default function DiscoveryInterface() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCue, setShowCue] = useState(false);

  // Deterministic demo sequence — runs once when the interface is in view.
  useEffect(() => {
    if (!inView) return;

    if (reduce) {
      // Reduced motion: reveal the final state statically, no timers.
      setQuery((q) => (q === "" ? SAMPLE_QUERY : q));
      setHighlightedId("meridian");
      setSelectedId("meridian");
      setShowCue(true);
      return;
    }

    const timers = [
      window.setTimeout(() => setQuery((q) => (q === "" ? SAMPLE_QUERY : q)), 900),
      window.setTimeout(() => setHighlightedId("meridian"), 1700),
      window.setTimeout(() => setSelectedId("meridian"), 2200),
      window.setTimeout(() => setShowCue(true), 2700),
    ];

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [inView, reduce]);

  const handleSelect = (id: string) => {
    setHighlightedId(id);
    setSelectedId((current) => (current === id ? null : id));
  };

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative mx-auto w-full max-w-[540px]"
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
              Prosventa · Discovery
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            <span className="h-1 w-1 rounded-full bg-amber-500" />
            Demo
          </span>
        </div>

        {/* Search row */}
        <motion.div
          variants={searchVariants}
          initial={reduce ? false : "hidden"}
          animate={inView ? "show" : "hidden"}
          className="p-5 pb-3"
        >
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xs transition-all duration-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
            <Search className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2.2} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies, industries, or location…"
              aria-label="Search prospects (demo data)"
              className="w-full bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
            {query === "" && (
              <span className="hidden shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
                ⌘K
              </span>
            )}
          </div>
        </motion.div>

        {/* Filter chips */}
        <motion.div
          variants={chipVariants}
          initial={reduce ? false : "hidden"}
          animate={inView ? "show" : "hidden"}
          className="flex items-center gap-1.5 px-5 pb-4"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2.2} />
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-200",
                filter === f
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                  : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              {f}
            </button>
          ))}
        </motion.div>

        {/* Sample results */}
        <motion.ol
          variants={listVariants}
          initial={reduce ? false : "hidden"}
          animate={inView ? "show" : "hidden"}
          className="space-y-2 px-5 pb-5"
        >
          {SAMPLE_COMPANIES.map((company) => {
            const isHighlighted = highlightedId === company.id;
            const isSelected = selectedId === company.id;
            const isDimmed = filter !== "All" && company.fit !== filter;
            const fitMeta = FIT_META[company.fit];

            return (
              <motion.li key={company.id} variants={cardVariants}>
                <button
                  type="button"
                  onClick={() => handleSelect(company.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200",
                    isSelected
                      ? "border-blue-400 bg-blue-50/60 shadow-sm"
                      : isHighlighted
                        ? "border-blue-200 bg-white shadow-sm"
                        : "border-slate-200/80 bg-white shadow-xs hover:border-slate-300 hover:bg-slate-50/60",
                    isDimmed && !isSelected ? "opacity-45 saturate-50" : "opacity-100"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors duration-200",
                      isSelected
                        ? "bg-blue-600 text-white"
                        : isHighlighted
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {company.initial}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold tracking-tight text-slate-900">
                      {company.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {company.meta}
                    </span>
                  </span>

                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 text-[11px] font-medium",
                      fitMeta.label
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", fitMeta.dot)} />
                    {company.fit}
                  </span>

                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 bg-white text-transparent"
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                </button>
              </motion.li>
            );
          })}
        </motion.ol>

        {/* Footnote — honest about demo data */}
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
          <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="text-[11px] text-slate-400">
            Illustrative sample data — fictional companies for demonstration only.
          </p>
        </div>
      </div>

      {/* Discover → Understand transition cue (Phase 4 will expand this) */}
      <motion.div
        initial={false}
        animate={{ opacity: showCue || reduce ? 1 : 0, y: showCue || reduce ? 0 : 6 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mt-8 flex items-center justify-center gap-3 text-sm"
      >
        <span className="font-semibold text-slate-900">Discover</span>
        <ArrowRight className="h-3.5 w-3.5 text-slate-300" strokeWidth={2.5} />
        <span className="font-medium text-slate-400">Understand</span>
      </motion.div>
    </motion.div>
  );
}