import { DashboardIcon, type IconName } from "@/components/dashboard/navigation/icons";
import Link from "next/link";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function WelcomeSection({
  firstName,
  workspaceName,
}: {
  firstName: string;
  workspaceName: string;
}) {
  return (
    <section className="dashboard-enter">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-sm text-slate-500">
          Welcome back to your{" "}
          <span className="font-medium text-slate-700">{workspaceName}</span>{" "}
          workspace.
        </p>
      </div>
    </section>
  );
}

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: IconName;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "Find Prospects",
    description: "Discover new target companies",
    href: "/dashboard/prospects",
    icon: "prospects",
  },
  {
    title: "Create Saved List",
    description: "Organize prospects into groups",
    href: "/dashboard/saved-lists",
    icon: "lists",
  },
  {
    title: "View Workspace",
    description: "Manage your organization",
    href: "/dashboard/organization",
    icon: "organization",
  },
  {
    title: "Manage Settings",
    description: "Configure workspace preferences",
    href: "/dashboard/settings",
    icon: "settings",
  },
];

export function QuickActionsSection() {
  return (
    <section className="dashboard-enter" style={{ animationDelay: "60ms" }}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="card-hover group rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition-colors duration-150 group-hover:bg-blue-50 group-hover:text-blue-600">
                <DashboardIcon name={action.icon} size={18} />
              </div>
              <DashboardIcon
                name="chevron-down"
                size={14}
                className="-rotate-90 text-slate-300 transition-colors duration-150 group-hover:text-blue-400"
              />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              {action.title}
            </h3>
            <p className="mt-1 text-xs text-slate-500">{action.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
