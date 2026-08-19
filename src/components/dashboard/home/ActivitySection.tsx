import { DashboardIcon } from "@/components/dashboard/navigation/icons";

export function ActivitySection() {
  return (
    <section className="dashboard-enter" style={{ animationDelay: "180ms" }}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Recent Activity
      </h2>
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <DashboardIcon name="sparkles" size={22} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">No activity yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Your workspace activity will appear here as you work with prospects and lists.
        </p>
      </div>
    </section>
  );
}
