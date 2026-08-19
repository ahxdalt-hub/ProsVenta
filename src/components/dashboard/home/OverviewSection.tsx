import { DashboardIcon, type IconName } from "@/components/dashboard/navigation/icons";
import Link from "next/link";

interface OverviewCardProps {
  label: string;
  value: number;
  icon: IconName;
  href: string;
  emptyHint: string;
}

function OverviewCard({ label, value, icon, href, emptyHint }: OverviewCardProps) {
  return (
    <Link
      href={href}
      className="card-hover rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
          <DashboardIcon name={icon} size={16} />
        </div>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      {value > 0 ? (
        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
          {value.toLocaleString()}
        </p>
      ) : (
        <p className="mt-3 text-sm font-medium text-slate-400">No data yet</p>
      )}
      {value === 0 && <p className="mt-1 text-xs text-slate-400">{emptyHint}</p>}
    </Link>
  );
}

export function OverviewSection({
  prospectCount,
  savedListCount,
  memberCount,
}: {
  prospectCount: number;
  savedListCount: number;
  memberCount: number;
}) {
  return (
    <section className="dashboard-enter" style={{ animationDelay: "120ms" }}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Workspace Overview
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <OverviewCard
          label="Total Prospects"
          value={prospectCount}
          icon="prospects"
          href="/dashboard/prospects"
          emptyHint="Add prospects to get started"
        />
        <OverviewCard
          label="Saved Lists"
          value={savedListCount}
          icon="lists"
          href="/dashboard/saved-lists"
          emptyHint="Create a list to organize prospects"
        />
        <OverviewCard
          label="Organization Members"
          value={memberCount}
          icon="members"
          href="/dashboard/organization"
          emptyHint="Invite teammates to collaborate"
        />
      </div>
    </section>
  );
}
