"use client";

import { useActionState } from "react";
import { completeOnboardingAction } from "@/lib/actions/onboarding";
import OnboardingInput from "@/components/onboarding/OnboardingInput";
import OnboardingSelect from "@/components/onboarding/OnboardingSelect";
import OnboardingErrorAlert from "@/components/onboarding/OnboardingErrorAlert";

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

export default function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initialState
  );

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

      <OnboardingSelect
        label="Industry"
        name="industry"
        options={INDUSTRY_OPTIONS}
        placeholder="Select your industry"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <OnboardingSelect
          label="Company Size"
          name="companySize"
          options={COMPANY_SIZE_OPTIONS}
          placeholder="Select size"
        />

        <OnboardingSelect
          label="Your Role"
          name="jobRole"
          options={JOB_ROLE_OPTIONS}
          placeholder="Select your role"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="w-full inline-flex items-center justify-center rounded-lg bg-navy-900 text-white font-semibold px-8 py-3 text-sm transition-all duration-150 hover:bg-navy-800 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {pending ? (
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Setting up your workspace...
            </span>
          ) : (
            "Complete Setup"
          )}
        </button>
      </div>

      <p className="text-xs text-center text-slate-400">
        You can update these details later in your profile settings.
      </p>
    </form>
  );
}