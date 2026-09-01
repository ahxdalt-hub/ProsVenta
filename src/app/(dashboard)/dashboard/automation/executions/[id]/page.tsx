import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getExecutionDetail } from "@/lib/db/automation-control-center";
import { ExecutionControls } from "@/features/automation/orchestrator/components/ExecutionControls";
import { ExecutionTimeline } from "@/features/automation/control-center/components/ExecutionTimeline";
import { RetryExecutionButton } from "@/features/automation/control-center/components/RetryExecutionButton";
import { StatusBadge } from "@/features/automation/control-center/components/StatusBadge";
import { AutoRefresh } from "@/features/automation/control-center/components/AutoRefresh";
import {
  failureExplanation,
  formatDuration,
  triggerLabel,
  isUserRetryable,
} from "@/features/automation/control-center/labels";

export const dynamic = "force-dynamic";

export default async function ExecutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getExecutionDetail(id);
  if (!detail) notFound();

  const isActive = ["queued", "running", "waiting", "paused"].includes(detail.status);
  const isFailed = detail.status === "failed";

  const facts: Array<[string, ReactNode]> = [
    [
      "Prospect",
      detail.prospect_name ? (
        <Link href="/dashboard/prospects" className="font-medium text-blue-700 hover:underline">
          {detail.prospect_name} <span aria-hidden>→</span>
        </Link>
      ) : (
        "No linked prospect"
      ),
    ],
    [
      "Playbook",
      detail.playbook_id ? (
        <Link
          href={`/dashboard/automation/playbooks/${detail.playbook_id}`}
          className="font-medium text-blue-700 hover:underline"
        >
          {detail.playbook_name}
        </Link>
      ) : (
        detail.playbook_name
      ),
    ],
    ["Playbook version", detail.playbook_version !== null ? `Version ${detail.playbook_version}` : "—"],
    ["Trigger", triggerLabel(detail.trigger_type)],
    ["Started", detail.started_at ? new Date(detail.started_at).toLocaleString("en-US") : "—"],
    ["Completed", detail.completed_at ? new Date(detail.completed_at).toLocaleString("en-US") : "—"],
    ["Duration", formatDuration(detail.started_at ?? detail.created_at, detail.completed_at)],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Keep live state accurate without a manual reload while active. */}
      <AutoRefresh enabled={isActive && !isFailed} intervalMs={15000} />

      <Link
        href="/dashboard/automation/control-center"
        className="inline-block text-sm text-slate-500 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
      >
        ← Back to Control Center
      </Link>

      {/* Header + controls */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{detail.playbook_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={detail.status} />
            {detail.playbook_version !== null && (
              <span className="text-xs text-slate-400">Version {detail.playbook_version}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isActive && <ExecutionControls executionId={detail.id} status={detail.status} />}
          {isFailed && isUserRetryable(detail.failure_category) && (
            <RetryExecutionButton executionId={detail.id} />
          )}
        </div>
      </div>

      {/* Why it ran — human-readable, never a raw payload */}
      <section aria-labelledby="why-heading" className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="why-heading" className="text-sm font-semibold text-slate-900">Why it ran</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          {detail.reason
            ? detail.reason.charAt(0).toUpperCase() + detail.reason.slice(1)
            : triggerLabel(detail.trigger_type)}
          .
        </p>
        <p className="mt-1 text-xs text-slate-400">Trigger: {triggerLabel(detail.trigger_type)}</p>
      </section>

      {/* Failure / cancellation detail */}
      {isFailed && (
        <section aria-labelledby="error-heading" className="rounded-xl border border-red-100 bg-red-50/60 p-4">
          <h2 id="error-heading" className="text-sm font-semibold text-red-800">What went wrong</h2>
          <p className="mt-1.5 text-sm text-red-700">
            {failureExplanation(detail.failure_category, detail.error_message)}
          </p>
          <p className="mt-1 text-xs text-red-700/80">
            {isUserRetryable(detail.failure_category)
              ? "You can retry this automation — it continues from the failed step; completed work is preserved."
              : "This failure is permanent until the underlying problem (configuration or provider) is fixed."}
          </p>
        </section>
      )}
      {detail.status === "cancelled" && detail.cancel_reason && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Cancellation</h2>
          <p className="mt-1 text-sm text-slate-600">
            {detail.cancel_reason}. Already-completed steps were not reversed.
          </p>
        </section>
      )}

      {/* Facts */}
      <section aria-label="Execution details" className="premium-card p-5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 [&>dt]:min-w-[140px]">
          {facts.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="text-sm text-slate-700">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Timeline */}
      <section aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="mb-3 text-sm font-semibold text-slate-900">Timeline</h2>
        {detail.steps.length === 0 && detail.upcoming_steps.length === 0 ? (
          <p className="text-sm text-slate-500">No step activity recorded yet.</p>
        ) : (
          <div className="premium-card p-5">
            <ExecutionTimeline detail={detail} />
          </div>
        )}
      </section>

      {/* Advanced diagnostics — technical identifiers kept out of the way */}
      <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500">
          Advanced details
        </summary>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-xs text-slate-500">
          <dt className="font-medium text-slate-400">Execution ID</dt>
          <dd className="break-all font-mono">{detail.id}</dd>
          <dt className="font-medium text-slate-400">Chain depth</dt>
          <dd>{detail.origin_chain_depth}</dd>
          <dt className="font-medium text-slate-400">Created</dt>
          <dd>{new Date(detail.created_at).toLocaleString("en-US")}</dd>
        </dl>
      </details>
    </div>
  );
}

