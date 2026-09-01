"use client";

// ============================================================================
// Prosventa Automation Control Center — History Filters
// ============================================================================
// URL-safe filter state (searchParams) — shareable and persistent during
// navigation. Submits via router.push so the server re-queries real data.
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  playbooks: Array<{ id: string; name: string }>;
}

export function HistoryFilters({ playbooks }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  function apply(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page"); // any filter change resets pagination
    startTransition(() => router.push(`/dashboard/automation/control-center?${params.toString()}`));
  }

  return (
    <form
      role="search"
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply({ q: search });
      }}
    >
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onBlur={() => {
          if ((searchParams.get("q") ?? "") !== search) apply({ q: search });
        }}
        placeholder="Search playbook, company, or execution ID"
        aria-label="Search executions"
        className="w-64 max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
      />

      <select
        value={searchParams.get("status") ?? "all"}
        onChange={(e) => apply({ status: e.target.value })}
        aria-label="Filter by status"
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
      >
        <option value="all">All statuses</option>
        <option value="attention">Needs attention</option>
        <option value="queued">Queued</option>
        <option value="running">Running</option>
        <option value="waiting">Waiting</option>
        <option value="paused">Paused</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <select
        value={searchParams.get("playbook") ?? ""}
        onChange={(e) => apply({ playbook: e.target.value })}
        aria-label="Filter by Playbook"
        className="max-w-[180px] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
      >
        <option value="">All Playbooks</option>
        {playbooks.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("range") ?? ""}
        onChange={(e) => apply({ range: e.target.value })}
        aria-label="Filter by date range"
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
      >
        <option value="">Any time</option>
        <option value="today">Today</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
      </select>

      {(search || searchParams.get("status") || searchParams.get("playbook") || searchParams.get("range")) && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            startTransition(() =>
              router.push("/dashboard/automation/control-center?tab=history")
            );
          }}
          className="rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
        >
          Clear filters
        </button>
      )}

      <span aria-live="polite" className={isPending ? "text-xs text-slate-400" : "sr-only"}>
        {isPending ? "Updating results…" : ""}
      </span>
    </form>
  );
}
