import Link from "next/link";

interface StepProps {
  number: number;
  title: string;
  description: string;
  href: string;
  done: boolean;
}

function Step({ number, title, description, href, done }: StepProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-lg px-3 py-3 transition-colors duration-150 hover:bg-slate-50"
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-150 ${
          done
            ? "bg-green-50 text-green-600"
            : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"
        }`}
      >
        {done ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          number
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </Link>
  );
}

export function GettingStartedSection({
  profileComplete,
  hasOrganization,
  hasIcp,
  hasProspects,
  hasLists,
}: {
  profileComplete: boolean;
  hasOrganization: boolean;
  hasIcp: boolean;
  hasProspects: boolean;
  hasLists: boolean;
}) {
  const steps: StepProps[] = [
    {
      number: 1,
      title: "Complete your profile",
      description: profileComplete ? "Your profile is complete" : "Add your details to personalize your workspace",
      href: "/dashboard/settings?section=profile",
      done: profileComplete && hasOrganization,
    },
    {
      number: 2,
      title: "Add prospects",
      description: hasProspects ? "You have prospects in your workspace" : "Import a CSV or find new leads to get started",
      href: "/dashboard/prospects",
      done: hasProspects,
    },
    {
      number: 3,
      title: "Define your ideal customer",
      description: hasIcp ? "ICP scoring is active on your prospects" : "A few basics power automatic prospect scoring",
      href: "/dashboard/settings?section=icp",
      done: hasIcp,
    },
    {
      number: 4,
      title: "Organize & activate",
      description: hasLists ? "You have saved lists" : "Group prospects into targeted lists and run intelligence",
      href: "/dashboard/saved-lists",
      done: hasLists,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <section className="dashboard-enter" style={{ animationDelay: "240ms" }}>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Getting Started
          </h2>
          <span className="text-xs font-medium text-slate-400">
            {completedCount} of {steps.length} complete
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {steps.map((step) => (
            <Step key={step.number} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
}
