import Link from "next/link";
import { settingsHref } from "@/lib/settings/navigation";
import { SettingsCard, SettingsCardHeader } from "../SettingsCard";

// ============================================================================
// SupportSection - Settings > Help & Support
// ============================================================================
// Phase 2 rebuild: a real support center. Only destinations that actually
// exist are linked - the in-app Help Center (/dashboard/help) and the support
// email used there (support@prosventa.com). Troubleshooting flows match actual
// product behavior. No fake forms, no fabricated URLs.
// ============================================================================

const QUICK_HELP = [
  {
    title: "Prospects",
    description: "Importing, scoring and managing your prospect pipeline.",
    href: "/dashboard/help",
  },
  {
    title: "Intelligence",
    description: "Enrichment, research, signals and recommendations explained.",
    href: "/dashboard/help",
  },
  {
    title: "Credits",
    description: "How Credits work, what operations cost, and your balance.",
    href: settingsHref("credits"),
  },
  {
    title: "Billing",
    description: "Plans, purchases and payment history.",
    href: settingsHref("plan-billing"),
  },
  {
    title: "Workspace",
    description: "Organization identity, members and roles.",
    href: "/dashboard/organization",
  },
  {
    title: "Account",
    description: "Profile details, password and account protection.",
    href: settingsHref("profile"),
  },
];

const TROUBLESHOOTING = [
  {
    problem: "Credits didn't update after an operation",
    steps: [
      "Refresh the page - the balance is fetched live from the server.",
      "Check Credits & Usage: failed operations are never charged.",
      "Still wrong after a few minutes? Contact support with the approximate time of the operation.",
    ],
  },
  {
    problem: "An intelligence operation failed",
    steps: [
      "Open the prospect and retry the operation once - transient provider errors are common.",
      "If every operation fails, the workspace's intelligence provider may be unavailable (see AI & Intelligence status).",
      "Repeated failures are never charged to your credit balance.",
    ],
  },
  {
    problem: "An import didn't complete",
    steps: [
      "Re-open Import Center - completed rows are kept, so re-importing is safe.",
      "Check the file format: CSV or Excel with a clear header row works best.",
    ],
  },
  {
    problem: "A payment is still pending",
    steps: [
      "Purchases can take a few minutes to confirm at the payment provider.",
      "Check Purchases for the latest status before contacting support.",
    ],
  },
  {
    problem: "Profile photo failed to upload",
    steps: [
      "Use a JPG, PNG, WebP or GIF image under 5MB.",
      "Try again after refreshing - uploads are retried safely and never leave a broken avatar.",
    ],
  },
];

export function SupportSection() {
  return (
    <div className="space-y-6">
      {/* Support contact - prominent, real destination */}
      <SettingsCard className="border-blue-100 bg-gradient-to-br from-blue-50/70 to-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-blue-100">
              <HelpIcon />
            </span>
            <div>
              <h3 className="text-[15px] font-bold tracking-tight text-slate-900">
                Something isn&apos;t working?
              </h3>
              <p className="mt-0.5 max-w-lg text-[13px] leading-relaxed text-slate-500">
                Write to{" "}
                <a
                  href="mailto:support@prosventa.com"
                  className="font-semibold text-blue-600 transition-colors hover:text-blue-700"
                >
                  support@prosventa.com
                </a>{" "}
                - our team answers by email, usually within business hours.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/help"
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Open Help Center
          </Link>
        </div>
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[13px] font-semibold text-slate-800">What to include when contacting support</p>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 text-[13px] leading-relaxed text-slate-500 sm:grid-cols-2">
            <Bullet>What happened, and what you expected instead</Bullet>
            <Bullet>The relevant prospect, operation or purchase</Bullet>
            <Bullet>The approximate time it occurred</Bullet>
            <Bullet>A screenshot if it helps - never passwords or keys</Bullet>
          </ul>
        </div>
      </SettingsCard>

      {/* Quick help categories */}
      <SettingsCard>
        <SettingsCardHeader
          title="Quick help"
          description="Jump straight to the area you need."
        />
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_HELP.map((item) => (
            <li key={item.title}>
              <Link
                href={item.href}
                className="group block h-full rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-300"
              >
                <span className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
                  {item.title}
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </SettingsCard>

      {/* Troubleshooting */}
      <SettingsCard>
        <SettingsCardHeader
          title="Troubleshooting"
          description="Fast fixes for the most common issues."
        />
        <div className="space-y-3">
          {TROUBLESHOOTING.map((item) => (
            <details
              key={item.problem}
              className="group rounded-xl border border-slate-200 bg-white open:border-slate-300"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                {item.problem}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <ol className="space-y-1.5 border-t border-slate-100 px-4 pb-4 pt-3 text-[13px] leading-relaxed text-slate-500">
                {item.steps.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-semibold tabular-nums text-slate-400">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
      {children}
    </li>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
