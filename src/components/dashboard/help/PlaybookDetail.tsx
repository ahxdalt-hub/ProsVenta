"use client";

// ============================================================================
// Prosventa Help Center — Playbook Detail View
// ============================================================================
// In-product learning guide: step-by-step navigation, per-step completion
// tracking (persisted to localStorage), animated progress, and a completion
// state. Rendered at /dashboard/help/[slug] for playbook slugs.
//
// Performance notes:
// - Animations use transform + opacity only (GPU-friendly), consistent with
//   the global motion tokens in @/lib/motion.
// - No backdrop overlays or blur effects.
// - Content scrolls naturally with the dashboard document flow.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { EASE_OUT } from "@/lib/motion";
import {
  PLAYBOOK_DIFFICULTY_LABELS,
  type Playbook,
} from "./playbook-content";
import { PlaybookArtwork } from "./PlaybookArtwork";

// ============================================================================
// Progress persistence (localStorage)
// ============================================================================

function storageKey(slug: string) {
  return `prosventa.help.playbook.${slug}`;
}

function loadCompletedSteps(slug: string): number[] {
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (value): value is number => typeof value === "number" && Number.isInteger(value)
    );
  } catch {
    return [];
  }
}

function saveCompletedSteps(slug: string, steps: number[]) {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(steps));
  } catch {
    // Storage unavailable (private mode etc.) — progress simply won't persist.
  }
}

// ============================================================================
// Small shared icons
// ============================================================================

const ICON = {
  className: "w-4 h-4",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function ClockIcon() {
  return (
    <svg {...ICON} strokeWidth={1.75}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON} className={className ?? ICON.className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg {...ICON}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg {...ICON}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ============================================================================
// Component
// ============================================================================

interface PlaybookDetailProps {
  playbook: Playbook;
}

export function PlaybookDetail({ playbook }: PlaybookDetailProps) {
  const totalSteps = playbook.steps.length;
  const reduceMotion = useReducedMotion();

  // --- Progress state -------------------------------------------------------
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    setCompletedSteps(loadCompletedSteps(playbook.slug));
    setProgressLoaded(true);
  }, [playbook.slug]);

  const isStepComplete = useCallback(
    (index: number) => completedSteps.includes(index),
    [completedSteps]
  );

  const allComplete =
    progressLoaded && totalSteps > 0 && completedSteps.length >= totalSteps;

  // Start on the first incomplete step once progress is known.
  const [currentStep, setCurrentStep] = useState(0);
  const initialStepChosenRef = useRef(false);
  useEffect(() => {
    if (!progressLoaded || initialStepChosenRef.current) return;
    initialStepChosenRef.current = true;
    const firstIncomplete = playbook.steps.findIndex((_, i) => !isStepComplete(i));
    setCurrentStep(firstIncomplete === -1 ? 0 : firstIncomplete);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressLoaded]);

  // --- Navigation -----------------------------------------------------------
  const goToStep = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(totalSteps - 1, index));
      setCurrentStep(clamped);
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    },
    [totalSteps, reduceMotion]
  );

  const goPrevious = useCallback(() => goToStep(currentStep - 1), [currentStep, goToStep]);
  const goNext = useCallback(() => goToStep(currentStep + 1), [currentStep, goToStep]);

  // Keyboard navigation (arrow keys). Safe: this page contains no text inputs.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goPrevious, goNext]);

  // --- Completion actions ---------------------------------------------------
  const markCompleteAndContinue = useCallback(() => {
    setCompletedSteps((prev) => {
      if (prev.includes(currentStep)) return prev;
      const next = [...prev, currentStep].sort((a, b) => a - b);
      saveCompletedSteps(playbook.slug, next);
      return next;
    });
    if (currentStep < totalSteps - 1) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, playbook.slug, goToStep]);

  const resetProgress = useCallback(() => {
    setCompletedSteps([]);
    saveCompletedSteps(playbook.slug, []);
    setCurrentStep(0);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [playbook.slug, reduceMotion]);

  // Focus the step heading after each transition for keyboard/AT continuity.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRenderRef = useRef(true);
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [currentStep]);

  const step = playbook.steps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const completedCount = completedSteps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back navigation */}
      <nav
        className="flex items-center gap-2 text-sm"
        aria-label="Breadcrumb"
      >
        <Link
          href="/dashboard/help"
          className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-800 transition-colors duration-150"
        >
          <ArrowLeftIcon />
          Help Center
        </Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <span className="font-medium text-slate-700">Playbooks</span>
      </nav>

      {/* Header card */}
      <header className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <PlaybookArtwork playbook={playbook} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
              {playbook.title}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
              {playbook.description}
            </p>
            <div className="mt-3 flex items-center gap-4 flex-wrap text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon />
                ~{playbook.estimatedMinutes} min
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    playbook.difficulty === "beginner" ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  aria-hidden="true"
                />
                {PLAYBOOK_DIFFICULTY_LABELS[playbook.difficulty]}
              </span>
              <span>
                {totalSteps} {totalSteps === 1 ? "step" : "steps"}
              </span>
            </div>
          </div>
        </div>

        {/* Overall progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <p className="text-xs font-medium text-slate-600" role="status">
              {allComplete
                ? "All steps complete"
                : `${completedCount} of ${totalSteps} ${totalSteps === 1 ? "step" : "steps"} complete`}
            </p>
            {(progressLoaded && completedCount > 0) && (
              <button
                type="button"
                onClick={resetProgress}
                className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors duration-150"
              >
                Reset progress
              </button>
            )}
          </div>
          <div
            className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-label={`${playbook.title} progress`}
          >
            <motion.div
              className="h-full rounded-full bg-navy-900"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            />
          </div>
        </div>
      </header>

      {/* Step stepper */}
      {!allComplete && (
        <nav aria-label="Playbook steps" className="overflow-x-auto pb-1 -mx-1 px-1">
          <ol className="flex items-center min-w-max">
            {playbook.steps.map((s, index) => {
              const done = isStepComplete(index);
              const current = index === currentStep;
              return (
                <li key={s.title} className="flex items-center shrink-0 last:flex-1">
                  <button
                    type="button"
                    onClick={() => goToStep(index)}
                    aria-current={current ? "step" : undefined}
                    aria-label={`Step ${index + 1}: ${s.title}${done ? " (complete)" : ""}`}
                    className={`btn-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-150 ${
                      current
                        ? "border-navy-900 bg-navy-900 text-white shadow-sm ring-4 ring-blue-500/10"
                        : done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
                          : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                    }`}
                  >
                    {done ? <CheckIcon className="h-3.5 w-3.5" /> : index + 1}
                  </button>
                  {index < totalSteps - 1 && (
                    <span
                      className={`h-[1px] w-6 sm:w-10 ${
                        isStepComplete(index) ? "bg-emerald-300" : "bg-slate-200"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Content area */}
      <AnimatePresence mode="wait" initial={false}>
        {allComplete ? (
          <CompletionPanel key="completion" playbook={playbook} onRestart={resetProgress} />
        ) : (
          <motion.section
            key={currentStep}
            initial={{ opacity: 0, x: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduceMotion ? 0 : -16 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm"
            aria-live="polite"
          >
            {/* Step label */}
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
              Step {currentStep + 1} of {totalSteps}
            </p>

            {/* Step title */}
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="mt-1.5 text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-snug focus:outline-none"
            >
              {step.title}
            </h2>

            {/* Step body */}
            <div className="mt-4 space-y-3">
              {step.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-sm sm:text-[15px] text-slate-600 leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Why it matters callout */}
            <div className="mt-5 rounded-lg border-l-[3px] border-blue-500 bg-blue-50/50 px-4 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Why this matters
              </p>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">{step.why}</p>
            </div>

            {/* In-product action reference */}
            {step.action && (
              <Link
                href={step.action.href}
                className="group mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 transition-all duration-150 hover:border-blue-200 hover:bg-blue-50/40"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors duration-150">
                    {step.action.label}
                    <span className="ml-2 inline-flex items-center text-[11px] font-medium uppercase tracking-wide text-slate-400 group-hover:text-blue-500 transition-colors duration-150">
                      in Prosventa
                    </span>
                  </span>
                  {step.action.hint && (
                    <span className="mt-0.5 block text-xs text-slate-500 truncate">
                      {step.action.hint}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-150">
                  <ArrowRightIcon />
                </span>
              </Link>
            )}

            {/* Controls */}
            <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={goPrevious}
                disabled={currentStep === 0}
                className="-ml-2"
              >
                <ArrowLeftIcon />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {!isLastStep && (
                  <Button variant="secondary" size="sm" onClick={goNext}>
                    Next
                    <ArrowRightIcon />
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={markCompleteAndContinue}
                  isSuccess={isStepComplete(currentStep)}
                >
                  {isLastStep
                    ? "Finish playbook"
                    : isStepComplete(currentStep)
                      ? "Continue"
                      : "Mark complete & continue"}
                  {!isStepComplete(currentStep) && <ArrowRightIcon />}
                </Button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Completion panel
// ============================================================================

function CompletionPanel({
  playbook,
  onRestart,
}: {
  playbook: Playbook;
  onRestart: () => void;
}) {
  const finalStep = playbook.steps[playbook.steps.length - 1];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-center"
    >
      {/* Animated check */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
      >
        <CheckIcon className="h-7 w-7 success-pop" />
      </motion.div>

      <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
        Playbook complete
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 leading-relaxed">
        You&apos;ve finished all {playbook.steps.length} steps of{" "}
        <span className="font-semibold text-slate-700">{playbook.title}</span>. Put it into
        practice{finalStep.action ? ` — start with ${finalStep.action.label.toLowerCase()}` : ""}.
      </p>

      {/* Final step's action reference, repeated for convenience */}
      {finalStep.action && (
        <div className="mx-auto mt-5 max-w-md">
          <Link
            href={finalStep.action.href}
            className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-left transition-all duration-150 hover:border-blue-200 hover:bg-blue-50/40"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors duration-150">
                {finalStep.action.label}
              </span>
              {finalStep.action.hint && (
                <span className="mt-0.5 block text-xs text-slate-500 truncate">
                  {finalStep.action.hint}
                </span>
              )}
            </span>
            <span className="shrink-0 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-150">
              <ArrowRightIcon />
            </span>
          </Link>
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
        <Link href="/dashboard/help">
          <Button variant="secondary" size="sm">
            Back to Help Center
          </Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={onRestart}>
          Restart playbook
        </Button>
      </div>
    </motion.section>
  );
}