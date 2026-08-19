"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Check,
  Info,
  ScanSearch,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/branding/BrandLogo";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Fictional sample company — clearly marked as demo data.
 * Matches the prospect selected in Phase 3 and analyzed in Phase 4
 * to visually imply DISCOVER → UNDERSTAND → DECIDE → ACT.
 */
const SAMPLE_COMPANY = {
  initial: "M",
  name: "Meridian Systems",
  meta: "Fintech · London · 201–500",
};

const INTELLIGENCE_ITEMS = [
  { label: "Research", icon: ScanSearch },
  { label: "ICP fit", icon: Target },
  { label: "Signal", icon: Activity },
];

const STEP_EXPLANATIONS = {
  prospect:
    "The prospect you discovered and understood in the previous steps.",
  intelligence:
    "Prosventa brings research, fit and signal context together.",
  opportunity:
    "Prosventa identifies what matters from the surrounding context.",
  action:
    "Prosventa suggests the next step so you can act with confidence.",
};

function SampleBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
      Sample
    </span>
  );
}

/**
 * Reveal — controlled opacity/transform reveal used for the
 * progressive workflow sequence. No layout shift: the element
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

/**
 * Connection — a subtle vertical line that draws downward and
 * carries a small pulse once, communicating that information is
 * moving through the process. No flashy effects.
 */
function Connection({
  active,
  visible,
  delay = 0,
}: {
  active: boolean;
  visible: boolean;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto h-8 w-6 transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Base line — quiet rail */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-slate-200" />
      {/* Progress line — draws when active */}
      <motion.div
        initial={false}
        animate={{ scaleY: active ? 1 : 0 }}
        transition={{ duration: 0.5, ease: EASE, delay }}
        style={{ transformOrigin: "top" }}
        className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-blue-400"
      />
      {/* Pulse — travels once when the connection activates */}
      {active && (
        <motion.div
          initial={{ top: "0%", opacity: 0, x: "-50%", y: "-50%" }}
          animate={{ top: "100%", opacity: [0, 1, 0], x: "-50%", y: "-50%" }}
          transition={{ duration: 0.7, ease: "easeInOut", delay: delay + 0.15 }}
          className="absolute left-1/2 h-1.5 w-1.5 rounded-full bg-blue-500"
        />
      )}
    </div>
  );
}

/**
 * StepLabel — small step indicator reinforcing the
 * FIND → UNDERSTAND → DECIDE → ACT story.
 */
function StepLabel({ number, label }: { number: string; label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
      <span className="text-slate-300">{number}</span>
      {label}
    </span>
  );
}

/**
 * HoverDetail — lightweight inline explanation revealed on hover.
 * Uses max-height + opacity so it never affects the layout of the
 * surrounding workflow.
 */
function HoverDetail({ text }: { text: string }) {
  return (
    <div className="mt-2.5 max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-12 group-hover:opacity-100">
      <p className="border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-500">
        {text}
      </p>
    </div>
  );
}

/**
 * WorkflowInterface — deterministic, marketing-only simulation of the
 * Prosventa workflow concept.
 *
 * The interface plays a one-time sequence when it enters view:
 *   prospect → connection → intelligence (research → ICP → signal)
 *   → connection → opportunity → connection → next action → emphasis.
 *
 * It is fully self-contained: no API calls, no backend, no real data,
 * no real workflow execution.
 */
export default function WorkflowInterface() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  const [stage, setStage] = useState(0);

  // Deterministic demo sequence — runs once when the interface is in view.
  useEffect(() => {
    if (!inView) return;

    if (reduce) {
      // Reduced motion: reveal the final state statically, no timers.
      setStage(10);
      return;
    }

    const timers = [
      window.setTimeout(() => setStage(1), 500),
      window.setTimeout(() => setStage(2), 1100),
      window.setTimeout(() => setStage(3), 1700),
      window.setTimeout(() => setStage(4), 2100),
      window.setTimeout(() => setStage(5), 2500),
      window.setTimeout(() => setStage(6), 3100),
      window.setTimeout(() => setStage(7), 3700),
      window.setTimeout(() => setStage(8), 4300),
      window.setTimeout(() => setStage(9), 4900),
      window.setTimeout(() => setStage(10), 5500),
    ];

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [inView, reduce]);

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative mx-auto w-full max-w-[480px]"
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
              Prosventa · Workflow
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            <span className="h-1 w-1 rounded-full bg-amber-500" />
            Demo
          </span>
        </div>

        {/* Workflow body */}
        <div className="px-5 py-5">
          {/* Step 1 — Prospect */}
          <Reveal show={stage >= 1}>
            <div className="group rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-colors duration-200 hover:border-blue-200">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-semibold text-blue-600">
                  {SAMPLE_COMPANY.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold tracking-tight text-slate-900">
                      {SAMPLE_COMPANY.name}
                    </p>
                    <SampleBadge />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {SAMPLE_COMPANY.meta}
                  </p>
                </div>
                <StepLabel number="01" label="Discover" />
              </div>
              <HoverDetail text={STEP_EXPLANATIONS.prospect} />
            </div>
          </Reveal>

          {/* Connection 1 — prospect → intelligence */}
          <Connection active={stage >= 2} visible={stage >= 1} delay={0.1} />

          {/* Step 2 — Intelligence */}
          <Reveal show={stage >= 3}>
            <div className="group rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-colors duration-200 hover:border-blue-200">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Intelligence
                </p>
                <StepLabel number="02" label="Understand" />
              </div>
              <div className="mt-2.5 space-y-1.5">
                {INTELLIGENCE_ITEMS.map((item, i) => {
                  const Icon = item.icon;
                  const active = stage >= 3 + i;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-md px-1.5 py-1"
                    >
                      <span className="flex items-center gap-2 text-[12px] text-slate-600">
                        <Icon
                          className="h-3.5 w-3.5 text-slate-400"
                          strokeWidth={2.2}
                        />
                        {item.label}
                      </span>
                      <motion.span
                        initial={false}
                        animate={{ opacity: active ? 1 : 0.3 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full transition-colors duration-300",
                          active
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-300"
                        )}
                      >
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </motion.span>
                    </div>
                  );
                })}
              </div>
              <HoverDetail text={STEP_EXPLANATIONS.intelligence} />
            </div>
          </Reveal>

          {/* Connection 2 — intelligence → opportunity */}
          <Connection active={stage >= 6} visible={stage >= 3} delay={0.1} />

          {/* Step 3 — Opportunity */}
          <Reveal show={stage >= 7}>
            <div
              className={cn(
                "group rounded-xl border bg-white p-3.5 transition-all duration-500",
                stage >= 7
                  ? "border-blue-300 bg-blue-50/40 shadow-[0_4px_16px_-4px_rgba(59,130,246,0.2)]"
                  : "border-slate-200/80 shadow-xs"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <Target className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Opportunity
                </p>
                <StepLabel number="03" label="Decide" />
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <p className="text-[13px] font-medium text-slate-900">
                  High-fit opportunity
                </p>
                <SampleBadge />
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                Sample: strong ICP fit with active buying signals.
              </p>
              <HoverDetail text={STEP_EXPLANATIONS.opportunity} />
            </div>
          </Reveal>

          {/* Connection 3 — opportunity → next action */}
          <Connection active={stage >= 8} visible={stage >= 7} delay={0.1} />

          {/* Step 4 — Next Action */}
          <Reveal show={stage >= 9}>
            <div
              className={cn(
                "group rounded-xl border bg-white p-3.5 transition-all duration-500",
                stage >= 10
                  ? "border-blue-300 ring-2 ring-blue-100"
                  : "border-slate-200/80 shadow-xs"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Recommended next step
                </p>
                <StepLabel number="04" label="Act" />
              </div>
              <p className="mt-2 text-[13px] font-medium text-slate-900">
                Review this opportunity
              </p>
              <motion.button
                type="button"
                initial={false}
                animate={stage >= 10 ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 0.5, ease: EASE }}
                className="btn-press mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                View recommendation
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </motion.button>
              <HoverDetail text={STEP_EXPLANATIONS.action} />
            </div>
          </Reveal>
        </div>

        {/* Footnote — honest about demo data */}
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
          <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="text-[11px] text-slate-400">
            Illustrative workflow — fictional company for demonstration only.
          </p>
        </div>
      </div>
    </motion.div>
  );
}