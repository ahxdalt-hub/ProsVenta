"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  completeOnboardingAction,
  saveOnboardingIcpAction,
} from "@/lib/actions/onboarding";
import OnboardingInput from "@/components/onboarding/OnboardingInput";
import OnboardingSelect from "@/components/onboarding/OnboardingSelect";
import OnboardingErrorAlert from "@/components/onboarding/OnboardingErrorAlert";

// ============================================================================
// Onboarding wizard — 3 short steps to first value:
//   1. Your details & workspace (required)
//   2. Your ideal customer (optional — powers ICP scoring immediately)
//   3. Add your first prospects (import, find leads, or explore)
// Advanced configuration is deliberately NOT part of onboarding.
// ============================================================================

const initialState = {
  error: "",
};

const INDUSTRY_OPTIONS = [
  { value: "software", label: "Software" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "finance", label: "Finance" },
  { value: "healthcare", label: "Healthcare" },
  { value: "retail", label: "Retail" },
  { value: "other", label: "Other" },
];

const COMPANY_SIZE_OPTIONS = [
  { value: "solo", label: "Solo" },
  { value: "2-10", label: "2-10" },
  { value: "11-50", label: "11-50" },
  { value: "51-200", label: "51-200" },
  { value: "200+", label: "200+" },
];

const JOB_ROLE_OPTIONS = [
  { value: "founder", label: "Founder" },
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "other", label: "Other" },
];

const STEPS = ["Your details", "Ideal customer", "First prospects"];

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center justify-center gap-2" aria-label="Setup progress">
      {STEPS.map((label, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                isDone
                  ? "bg-green-100 text-green-700"
                  : isCurrent
                    ? "bg-navy-900 text-white"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {isDone ? (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <span
              className={`hidden text-xs font-medium sm:inline ${
                isCurrent ? "text-slate-900" : "text-slate-400"
              }`}
            >
              {label}
            </span>
            {index < STEPS.length - 1 && (
              <span className={`h-px w-6 ${isDone ? "bg-green-300" : "bg-slate-200"}`} aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function PrimaryButton({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center rounded-lg bg-navy-900 text-white font-semibold px-8 py-3 text-sm transition-all duration-150 hover:bg-navy-800 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {pendingLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
}

// ---- Step 1 ----------------------------------------------------------------

function StepProfile({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initialState
  );

  // Success (no redirect — the wizard advances to step 2).
  useEffect(() => {
    if (state?.success) onDone();
  }, [state?.success, onDone]);

  return (
    <form action={formAction} className="space-y-5">
      <OnboardingErrorAlert message={state?.error} />

      <OnboardingInput
        label="Full Name"
        name="fullName"
        placeholder="Enter your full name"
        autoFocus
      />

      <OnboardingInput
        label="Company Name"
        name="companyName"
        placeholder="Enter your company name"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <OnboardingSelect
          label="Industry"
          name="industry"
          options={INDUSTRY_OPTIONS}
          placeholder="Select your industry"
        />

        <OnboardingSelect
          label="Company Size"
          name="companySize"
          options={COMPANY_SIZE_OPTIONS}
          placeholder="Select size"
        />
      </div>

      <OnboardingSelect
        label="Your Role"
        name="jobRole"
        options={JOB_ROLE_OPTIONS}
        placeholder="Select your role"
      />

      <div className="pt-2">
        <PrimaryButton
          pending={pending}
          label="Continue"
          pendingLabel="Setting up your workspace..."
        />
      </div>

      <p className="text-xs text-center text-slate-400">
        This creates your workspace. You can update these details later in
        settings.
      </p>
    </form>
  );
}

// ---- Step 2 ----------------------------------------------------------------

function StepIcp({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    saveOnboardingIcpAction,
    initialState
  );

  useEffect(() => {
    if (state?.success) onDone();
  }, [state?.success, onDone]);

  return (
    <form action={formAction} className="space-y-5">
      <OnboardingErrorAlert message={state?.error} />

      <p className="text-sm leading-relaxed text-slate-500">
        Tell Prosventa who your best customers look like. This powers prospect
        scoring right away — and takes 30 seconds. Everything is optional.
      </p>

      <OnboardingInput
        label="Industries you sell to"
        name="targetIndustries"
        placeholder="e.g. Software, Manufacturing"
      />

      <OnboardingInput
        label="Countries or regions"
        name="targetCountries"
        placeholder="e.g. United States, Germany"
      />

      <OnboardingInput
        label="Roles you sell to"
        name="targetJobTitles"
        placeholder="e.g. Head of Sales, Procurement Manager"
      />

      <div className="pt-2 flex flex-col gap-2 sm:flex-row-reverse">
        <div className="flex-1">
          <PrimaryButton
            pending={pending}
            label="Save & continue"
            pendingLabel="Saving..."
          />
        </div>
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto rounded-lg px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors duration-150"
        >
          Back
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors duration-150"
        >
          Skip for now — I&apos;ll set this up later in Settings
        </button>
      </div>
    </form>
  );
}

// ---- Step 3 ----------------------------------------------------------------

function StepFirstProspects() {
  const options = [
    {
      title: "Import a list",
      description: "Bring your existing prospects from a CSV or Excel file.",
      href: "/dashboard/import",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
    },
    {
      title: "Find new leads",
      description: "Search for companies and decision-makers that match your ICP.",
      href: "/dashboard/find-leads",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      title: "Explore the dashboard",
      description: "Look around first — you can add prospects whenever you're ready.",
      href: "/dashboard",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-slate-500">
        Your workspace is ready. Add prospects to start getting ICP scores,
        enrichment and signals — pick whichever way suits you.
      </p>

      <div className="space-y-3">
        {options.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 transition-all duration-150 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors duration-150 group-hover:bg-blue-100 group-hover:text-blue-600">
              {option.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                {option.title}
              </span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-500">
                {option.description}
              </span>
            </span>
            <svg className="ml-auto mt-2.5 h-4 w-4 shrink-0 text-slate-300 transition-colors duration-150 group-hover:text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---- Wizard shell ----------------------------------------------------------

const STEP_HEADINGS = [
  {
    title: "Welcome to Prosventa",
    subtitle: "Set up your profile to tailor the experience for you.",
  },
  {
    title: "Who are your ideal customers?",
    subtitle: "A few basics are enough — you can refine this any time.",
  },
  {
    title: "Add your first prospects",
    subtitle: "One step away from your first scored prospect.",
  },
];

export default function OnboardingForm() {
  const [step, setStep] = useState(0);
  const heading = STEP_HEADINGS[step];

  return (
    <div>
      <StepIndicator current={step} />

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {heading.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{heading.subtitle}</p>
      </div>

      {step === 0 && <StepProfile onDone={() => setStep(1)} />}
      {step === 1 && (
        <StepIcp onBack={() => setStep(0)} onDone={() => setStep(2)} />
      )}
      {step === 2 && <StepFirstProspects />}
    </div>
  );
}
