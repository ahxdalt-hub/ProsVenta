import Link from "next/link";
import {
  getControlCenterOverview,
  getPlaybookFilterOptions,
  listControlCenterExecutions,
} from "@/lib/db/automation-control-center";
import { getPlaybooks } from "@/lib/db/playbooks";
import { EmptyState } from "@/components/ui/EmptyState";
import { AutoRefresh } from "@/features/automation/control-center/components/AutoRefresh";
import { ExecutionCard } from "@/features/automation/control-center/components/ExecutionCard";
import { HistoryFilters } from "@/features/automation/control-center/components/HistoryFilters";
import { HistoryPagination } from "@/features/automation/control-center/components/HistoryPagination";
import { PlaybookOperations } from "@/features/automation/control-center/components/PlaybookOperations";
import { OverviewSection } from "@/features/automation/control-center/components/OverviewSection";
import { HistorySection } from "@/features/automation/control-center/components/HistorySection";
import { failureExplanation } from "@/features/automation/control-center/labels";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "running", label: "Running" },
  { key: "attention", label: "Needs Attention" },
  { key: "history", label: "History" },
  { key: "playbooks", label: "Playbooks" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ControlCenterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tabParam = first(params.tab) as TabKey | undefined;
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "overview";

  const overview = await getControlCenterOverview();
  const hasRunning = overview.runningCount > 0;

  // Section-specific data — only fetched for the visible tab.
  let history: Awaited<ReturnType<typeof listControlCenterExecutions>> | null = null;
  let playbookOptions: Array<{ id: string; name: string }> = [];
  let playbookStats: Awaited<ReturnType<typeof getPlaybooks>> = [];
  if (tab === "history") {
    [history, playbookOptions] = await Promise.all([
      listControlCenterExecutions({
        status: first(params.status),
        playbookId: first(params.playbook),
        search: first(params.q),
        range: (first(params.range) as "today" | "7d" | "30d" | "") ?? "",
        page: parseInt(first(params.page) ?? "1", 10) || 1,
        pageSize: 20,
      }),
      getPlaybookFilterOptions(),
    ]);
  }
  if (tab === "playbooks") {
    playbookStats = await getPlaybooks();
  }

  // Deterministic attention priority: failures before paused executions.
  const attention = [...overview.attention].sort(
    (a, b) => (a.status === "failed" ? 0 : 1) - (b.status === "failed" ? 0 : 1)
  );

  const historyQuery = new URLSearchParams({ tab: "history" });
  for (const key of ["status", "playbook", "q", "range"] as const) {
    const v = first(params[key]);
    if (v) historyQuery.set(key, v);
  }

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={tab !== "history" && hasRunning} />

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Automation Control Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            What Prosventa is automating, why it happened, and what needs your attention.
          </p>
        </div>
        <Link
          href="/dashboard/automation/playbooks"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-navy-300 hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
        >
          Manage Playbooks →
        </Link>
      </div>

      {/* Tabs */}
      <nav aria-label="Control Center sections" className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const active = t.key === tab;
          const badgeCount =
            t.key === "running" ? overview.runningCount : t.key === "attention" ? overview.attentionCount : null;
          return (
            <Link
              key={t.key}
              href={`/dashboard/automation/control-center?tab=${t.key}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 ${
                active
                  ? "border-navy-900 text-navy-900"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {t.label}
              {badgeCount !== null && badgeCount > 0 && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {!overview.hasAnyExecutions && tab !== "playbooks" && (
        <EmptyState
          title="No automation activity yet"
          description="When a Playbook runs — manually or from a trigger — its executions appear here."
          action={{ label: "Open Playbooks", href: "/dashboard/automation/playbooks" }}
        />
      )}

      {overview.hasAnyExecutions && tab === "overview" && <OverviewSection overview={overview} />}

      {hasRunning && tab === "running" && (
        <section aria-labelledby="running-heading" className="space-y-3">
          <h2 id="running-heading" className="text-sm font-semibold text-slate-900">
            Currently running ({overview.runningCount})
          </h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {overview.running.map((e) => (
              <ExecutionCard key={e.id} execution={e} />
            ))}
          </div>
        </section>
      )}
      {!hasRunning && tab === "running" && overview.hasAnyExecutions && (
        <EmptyState
          title="No automations are running."
          description="Queued and running executions will appear here."
        />
      )}

      {attention.length > 0 && tab === "attention" && (
        <section aria-labelledby="attention-heading" className="space-y-3">
          <h2 id="attention-heading" className="text-sm font-semibold text-slate-900">
            Needs attention ({overview.attentionCount})
          </h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {attention.map((e) => (
              <ExecutionCard
                key={e.id}
                execution={e}
                detailLine={
                  e.status === "failed"
                    ? `Reason: ${failureExplanation(e.failure_category, e.error_message)}`
                    : "Paused — resume it to continue from where it stopped."
                }
              />
            ))}
          </div>
        </section>
      )}
      {attention.length === 0 && tab === "attention" && overview.hasAnyExecutions && (
        <EmptyState
          title="Nothing needs your attention."
          description="Failed or paused automations will appear here with clear recovery options."
        />
      )}

      {tab === "history" && history && (
        <>
          <HistoryFilters playbooks={playbookOptions} />
          {history.executions.length === 0 ? (
            <EmptyState
              title="No matching executions."
              description="No automation executions match these filters yet."
            />
          ) : (
            <>
              <HistorySection history={history} />
              <HistoryPagination
                page={history.page}
                pageSize={history.pageSize}
                total={history.total}
                baseQuery={`/dashboard/automation/control-center?${historyQuery.toString()}`}
              />
            </>
          )}
        </>
      )}

      {tab === "playbooks" && <PlaybookOperations playbooks={playbookStats} />}
    </div>
  );
}

