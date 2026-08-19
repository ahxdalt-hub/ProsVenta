"use client";

import { useMemo } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { WorkspaceData } from "../types";
import type { WorkspaceSectionStatus } from "../types";
import { WorkspaceSectionHeader, WorkspaceEmptyState } from "./sections";
import { ConfidenceBadge, SourceAttribution, veracityFromConfidence } from "./confidence";
import { SIGNAL_IMPORTANCE_LABELS, SIGNAL_TYPE_LABELS } from "../../signals/types";
import { getScoreCategoryLabel } from "../../scoring/types";

type OverviewOps = "enrich_company" | "score" | "detect_signals" | "generate_recommendations";

export function OverviewTab({
  data,
  status,
  onRun,
}: {
  data: WorkspaceData | null;
  status: WorkspaceSectionStatus;
  onRun: (op: OverviewOps) => void;
}) {
  const prospect = data?.prospect ?? null;
  const enrichment = data?.companyEnrichment?.data ?? null;
  const score = data?.score ?? null;
  const signals = data?.signals ?? [];
  const recommendations = data?.recommendations ?? [];
  const companyResearch = data?.companyResearch?.result ?? null;

  const facts = useMemo(() => {
    const list: Array<{
      label: string;
      value: string;
      source: string | null;
      confidence: number | null;
      retrievedAt: string | null;
    }> = [];
    if (prospect?.industry) {
      list.push({ label: "Industry", value: prospect.industry, source: "Prosventa data", confidence: null, retrievedAt: null });
    }
    if (enrichment?.industry && enrichment.industry !== prospect?.industry) {
      list.push({ label: "Industry", value: enrichment.industry, source: data?.companyEnrichment?.provider ?? "Enrichment", confidence: data?.companyEnrichment?.confidence ?? null, retrievedAt: data?.companyEnrichment?.enriched_at ?? null });
    }
    if (enrichment?.employeeRange) {
      list.push({ label: "Company size", value: enrichment.employeeRange, source: data?.companyEnrichment?.provider ?? "Enrichment", confidence: data?.companyEnrichment?.confidence ?? null, retrievedAt: data?.companyEnrichment?.enriched_at ?? null });
    } else if (prospect?.employee_count) {
      list.push({ label: "Company size", value: String(prospect.employee_count), source: "Prosventa data", confidence: null, retrievedAt: null });
    }
    if (enrichment?.technologies?.length) {
      list.push({ label: "Technologies", value: enrichment.technologies.slice(0, 6).join(", "), source: data?.companyEnrichment?.provider ?? "Enrichment", confidence: data?.companyEnrichment?.confidence ?? null, retrievedAt: data?.companyEnrichment?.enriched_at ?? null });
    }
    const location = [prospect?.city, prospect?.country].filter(Boolean).join(", ") || prospect?.location;
    if (location) {
      list.push({ label: "Location", value: location, source: "Prosventa data", confidence: null, retrievedAt: null });
    }
    const hq = [enrichment?.city, enrichment?.country].filter(Boolean).join(", ") || enrichment?.headquarters;
    if (hq) {
      list.push({ label: "HQ", value: hq, source: data?.companyEnrichment?.provider ?? "Enrichment", confidence: data?.companyEnrichment?.confidence ?? null, retrievedAt: data?.companyEnrichment?.enriched_at ?? null });
    }
    if (enrichment?.revenue) {
      list.push({ label: "Revenue", value: `$${enrichment.revenue.toLocaleString()}`, source: data?.companyEnrichment?.provider ?? "Enrichment", confidence: data?.companyEnrichment?.confidence ?? null, retrievedAt: data?.companyEnrichment?.enriched_at ?? null });
    }
    return list;
  }, [data, enrichment, prospect]);

  const topSignals = useMemo(() => {
    const priority = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    return [...signals]
      .sort((a, b) => {
        const p = priority[a.importance] - priority[b.importance];
        if (p !== 0) return p;
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      })
      .slice(0, 3);
  }, [signals]);

  const topRecommendation = recommendations[0] ?? null;

  const why = useMemo(() => {
    const parts: string[] = [];
    if (score) {
      parts.push(`${getScoreCategoryLabel(score.category)} ICP fit (${score.score}/100) — the company and role align well with your target profile.`);
    }
    if (companyResearch?.salesRelevance) parts.push(companyResearch.salesRelevance);
    if (topSignals[0]) parts.push(`Recent activity suggests momentum: ${topSignals[0].title.toLowerCase()}.`);
    if (parts.length === 0) return null;
    return parts.join(" ");
  }, [score, companyResearch, topSignals]);

  if (status === "loading" || status === "processing") {
    return (
      <div className="space-y-6">
        <WorkspaceSectionHeader title="Intelligence Overview" description="Loading the highest-value intelligence for this prospect…" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-white p-4 animate-pulse">
                <div className="h-4 w-1/3 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-full rounded bg-slate-100" />
                <div className="mt-1.5 h-3 w-2/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-white p-4 animate-pulse">
                <div className="h-4 w-1/2 rounded bg-slate-100" />
                <div className="mt-2 h-6 w-16 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (status === "error" || !prospect) {
    return (
      <WorkspaceEmptyState
        title="Intelligence is not available for this prospect."
        description="The prospect may have been deleted or you no longer have access to it."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="why-heading">
        <WorkspaceSectionHeader title="Why This Prospect" description="Based only on available intelligence." />
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-5">
          {why ? (
            <p className="text-sm leading-relaxed text-slate-700">{why}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">
              Not enough intelligence collected yet. Run enrichment, scoring, or research to build an evidence-based summary.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="key-intel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Key Intelligence</h2>
            <p className="text-xs text-slate-400 mt-0.5">Verified facts and high-confidence observations.</p>
          </div>
          {facts.length === 0 && (
            <Button size="sm" variant="secondary" onClick={() => onRun("enrich_company")}>
              Start enrichment
            </Button>
          )}
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white overflow-hidden">
          {facts.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-400 italic">No company intelligence has been collected yet.</p>
            </div>
          ) : (
            <dl className="divide-y divide-slate-50">
              {facts.map((f, i) => (
                <div key={i} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">{f.label}</dt>
                    <dd className="text-sm text-slate-700 truncate mt-0.5">{f.value}</dd>
                    {f.source && <SourceAttribution source={f.source} retrievedAt={f.retrievedAt} className="mt-0.5" />}
                  </div>
                  <ConfidenceBadge level={veracityFromConfidence(f.confidence)} confidence={f.confidence} className="shrink-0" />
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <section aria-labelledby="recent-signals">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Recent Signals</h2>
          <p className="text-xs text-slate-400 mt-0.5">Most important observed events.</p>
        </div>
        <div className="mt-3">
          {topSignals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-5 py-6 text-center">
              <p className="text-sm text-slate-400 italic">No signals detected yet.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {topSignals.map((signal) => (
                <li key={signal.id} className="rounded-lg border border-slate-100 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-800">{signal.title}</p>
                    <span className="text-[11px] font-medium text-slate-400 shrink-0">{SIGNAL_IMPORTANCE_LABELS[signal.importance]}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{signal.description}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {SIGNAL_TYPE_LABELS[signal.signal_type]} · {formatDate(signal.detected_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="next-step">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Recommended Next Step</h2>
          <p className="text-xs text-slate-400 mt-0.5">Highest-priority action.</p>
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-5">
          {topRecommendation ? (
            <div>
              <p className="text-sm font-semibold text-slate-800">{topRecommendation.title}</p>
              <p className="text-sm text-slate-600 mt-1">{topRecommendation.reasoning}</p>
              <p className="text-xs text-slate-400 mt-2">Confidence: {topRecommendation.confidence}% · {formatDate(topRecommendation.created_at)}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-slate-400 italic">No recommendations yet.</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => onRun("generate_recommendations")}>
                Generate recommendations
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}