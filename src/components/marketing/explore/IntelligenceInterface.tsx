"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import {
  Activity,
  Building2,
  Check,
  Globe,
  Info,
  Lock,
  ScanSearch,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/branding/BrandLogo";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type TabId = "overview" | "research" | "enrichment" | "icp" | "intent";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "research", label: "Research" },
  { id: "enrichment", label: "Enrichment" },
  { id: "icp", label: "ICP" },
  { id: "intent", label: "Intent" },
];

/**
 * Fictional sample company — clearly marked as demo data.
 * Matches the prospect selected in the Phase 3 discovery interface
 * to visually imply the DISCOVER → UNDERSTAND progression.
 */
const COMPANY_CONTEXT = [
  { label: "Industry", value: "Fintech" },
  { label: "Location", value: "London, UK" },
  { label: "Company size", value: "201–500" },
];

const ENRICHMENT_FIELDS = [
  { label: "Website", value: "meridian.example", verified: true },
  { label: "Industry", value: "Fintech", verified: true },
  { label: "Location", value: "London, UK", verified: true },
  { label: "Company size", value: "201–500", verified: true },
  { label: "Technology", value: "••••••••", locked: true },
  { label: "Business context", value: "••••••••", locked: true },
];

const RESEARCH_SECTIONS = [
  {
    label: "Company context",
    text: "Sample research summary — a fictional overview of the company's market position and business model.",
  },
  {
    label: "Relevant signals",
    text: "Sample signal — recent activity suggests the company may be evaluating tools in this category.",
  },
  {
    label: "Potential opportunity",
    text: "Sample recommendation — a suggested next step based on the sample context.",
  },
];

const OVERVIEW_INTENT = [
  { label: "Recent activity", dot: "bg-blue-500" },
  { label: "Potential buying signal", dot: "bg-emerald-500" },
];

const INTENT_SIGNALS = [
  { label: "Recent activity", dot: "bg-blue-500" },
  { label: "Potential buying signal", dot: "bg-emerald-500" },
  { label: "Company change", dot: "bg-amber-500" },
  { label: "Relevant business event", dot: "bg-slate-400" },
];

function SampleBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
      Sample
    </span>
  );
}

function DemoBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded border border-emerald-100 bg-emerald-50 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-600">
      Demo
    </span>
  );
}

/**
 * Reveal — controlled opacity/transform reveal used for the
 * progressive intelligence sequence. No layout shift: the element
 * always occupies space, only opacity and a subtle y-offset animate.
 */
function Reveal({
  show,
  children,
  delay = 0,
  className,
}: {
  show: boolean;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 8 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className={cn(className, !show && "pointer-events-none")}
    >
      {children}
    </motion.div>
  );
}

/* ── Overview tab — progressive reveal: context → ICP → intent ── */
function OverviewContent({ revealStage }: { revealStage: number }) {
  return (
    <div className="space-y-4">
      {/* Company context */}
      <Reveal show={revealStage >= 3}>
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Building2 className="h-3.5 w-3.5" strokeWidth={2.2} />
            Company context
          </p>
          <dl className="mt-2 divide-y divide-slate-50 rounded-xl border border-slate-200/80 bg-white">
            {COMPANY_CONTEXT.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 px-3.5 py-2"
              >
                <dt className="text-xs text-slate-500">{row.label}</dt>
                <dd className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                  {row.value}
                  <SampleBadge />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>

      {/* Why this prospect */}
      <Reveal show={revealStage >= 3} delay={0.1}>
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
            Why this prospect
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-700">
            Sample: Fintech company in London with a strong fit signal for your
            ideal customer profile.
          </p>
        </div>
      </Reveal>

      {/* ICP Fit */}
      <Reveal show={revealStage >= 4}>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" strokeWidth={2.2} />
              <span className="text-[13px] font-medium text-slate-900">
                ICP Fit
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <SampleBadge />
              •• / 100
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i < 4 ? "bg-blue-500" : "bg-slate-200"
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Compare prospects against your Ideal Customer Profile.
          </p>
        </div>
      </Reveal>

      {/* Intent signals */}
      <Reveal show={revealStage >= 5}>
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Activity className="h-3.5 w-3.5" strokeWidth={2.2} />
            Intent signals
          </p>
          <div className="mt-2 space-y-1.5">
            {OVERVIEW_INTENT.map((signal) => (
              <div
                key={signal.label}
                className="flex items-center justify-between rounded-md px-1.5 py-1"
              >
                <span className="flex items-center gap-2 text-[12px] text-slate-600">
                  <span className={cn("h-1.5 w-1.5 rounded-full", signal.dot)} />
                  {signal.label}
                </span>
                <SampleBadge />
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/* ── Research tab — clearly marked sample research preview ── */
function ResearchContent() {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <ScanSearch className="h-3.5 w-3.5" strokeWidth={2.2} />
        Research preview
      </p>
      {RESEARCH_SECTIONS.map((section) => (
        <div
          key={section.label}
          className="rounded-xl border border-slate-200/80 bg-white p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-slate-900">
              {section.label}
            </p>
            <SampleBadge />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {section.text}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Enrichment tab — verified/demo indicators + locked previews ── */
function EnrichmentContent() {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <Globe className="h-3.5 w-3.5" strokeWidth={2.2} />
        Enrichment preview
      </p>
      <dl className="divide-y divide-slate-50 rounded-xl border border-slate-200/80 bg-white">
        {ENRICHMENT_FIELDS.map((field) => (
          <div
            key={field.label}
            className="flex items-center justify-between gap-3 px-3.5 py-2"
          >
            <dt className="text-xs text-slate-500">{field.label}</dt>
            <dd className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
              {field.locked ? (
                <>
                  <Lock className="h-3 w-3 text-slate-300" strokeWidth={2.2} />
                  {field.value}
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-emerald-500" strokeWidth={2.5} />
                  {field.value}
                  <DemoBadge />
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] text-slate-400">
        Demo values — real enrichment is retrieved from verified providers.
      </p>
    </div>
  );
}

/* ── ICP tab — sample score, never presented as a real result ── */
function IcpContent() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-[13px] font-medium text-slate-900">
            <Target className="h-4 w-4 text-blue-600" strokeWidth={2.2} />
            ICP Score
          </p>
          <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700">
            Sample score
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full",
                i < 4 ? "bg-blue-500" : "bg-blue-100"
              )}
            />
          ))}
        </div>
        <p className="mt-2 text-xs font-medium text-slate-600">•• / 100</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          Compare prospects against your Ideal Customer Profile.
        </p>
      </div>
      <p className="text-[11px] text-slate-400">
        Sample preview — not a real score.
      </p>
    </div>
  );
}

/* ── Intent tab — demo concepts, no real events claimed ── */
function IntentContent() {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <Activity className="h-3.5 w-3.5" strokeWidth={2.2} />
        Intent signals
      </p>
      <div className="space-y-1.5">
        {INTENT_SIGNALS.map((signal) => (
          <div
            key={signal.label}
            className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2"
          >
            <span className="flex items-center gap-2 text-[12px] text-slate-600">
              <span className={cn("h-1.5 w-1.5 rounded-full", signal.dot)} />
              {signal.label}
            </span>
            <SampleBadge />
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400">
        Demo concepts — no real events are claimed.
      </p>
    </div>
  );
}

/**
 * IntelligenceInterface — deterministic, marketing-only simulation of the
 * Prosventa intelligence workspace.
 *
 * The interface plays a one-time sequence when it enters view:
 *   selected prospect → company context → ICP → intent signals.
 *
 * Tabs (Overview / Research / Enrichment / ICP / Intent) are lightweight
 * local state for demonstration. No API calls, no backend, no real data.
 */
export default function IntelligenceInterface() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [revealStage, setRevealStage] = useState(0);

  // Deterministic demo sequence — runs once when the interface is in view.
  useEffect(() => {
    if (!inView) return;

    if (reduce) {
      // Reduced motion: reveal the final state statically, no timers.
      setRevealStage(5);
      return;
    }

    const timers = [
      window.setTimeout(() => setRevealStage(1), 500),
      window.setTimeout(() => setRevealStage(2), 1100),
      window.setTimeout(() => setRevealStage(3), 1700),
      window.setTimeout(() => setRevealStage(4), 2300),
      window.setTimeout(() => setRevealStage(5), 2900),
    ];

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [inView, reduce]);

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
              Prosventa · Intelligence
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            <span className="h-1 w-1 rounded-full bg-amber-500" />
            Demo
          </span>
        </div>

        {/* Company header — selected prospect from Phase 3 */}
        <Reveal show={revealStage >= 1} className="px-5 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600">
              M
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
                  Meridian Systems
                </p>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  Selected from discovery
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                Fintech · London · 201–500
              </p>
            </div>
          </div>
        </Reveal>

        {/* Tabs — segmented control, mirrors the real workspace */}
        <Reveal show={revealStage >= 2} className="px-5 pt-4">
          <div
            role="tablist"
            aria-label="Intelligence sections"
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/50 p-1"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "min-w-[64px] flex-1 whitespace-nowrap rounded-md px-2 py-1.5 text-[11px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Tab content — stable min-height prevents layout jumps */}
        <div className="min-h-[400px] px-5 pb-5 pt-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {activeTab === "overview" && (
                <OverviewContent revealStage={revealStage} />
              )}
              {activeTab === "research" && <ResearchContent />}
              {activeTab === "enrichment" && <EnrichmentContent />}
              {activeTab === "icp" && <IcpContent />}
              {activeTab === "intent" && <IntentContent />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footnote — honest about demo data */}
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
          <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="text-[11px] text-slate-400">
            Illustrative sample data — fictional company for demonstration only.
          </p>
        </div>
      </div>
    </motion.div>
  );
}