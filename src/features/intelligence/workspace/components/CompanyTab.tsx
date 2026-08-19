"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import type { WorkspaceData } from "../types";
import { WorkspaceSectionHeader, WorkspaceEmptyState } from "./sections";
import { FactRow } from "./confidence";

export function CompanyTab({
  data,
  isProcessing,
  onEnrich,
}: {
  data: WorkspaceData | null;
  isProcessing: boolean;
  onEnrich: () => void;
}) {
  const record = data?.companyEnrichment ?? null;
  const enriched = record?.data ?? null;
  const hasDomain = Boolean(data?.prospect?.domain || data?.prospect?.website);

  // Build company facts from prospect + enrichment. Sources preserved.
  const facts = useMemo(() => {
    const list: Array<{
      label: string;
      value: string;
      source?: string | null;
      retrievedAt?: string | null;
      confidence?: number | null;
    }> = [];
    const p = data?.prospect;
    const provider = record?.provider ?? "Prosventa data";
    const retrievedAt = record?.enriched_at ?? null;
    const confidence = record?.confidence ?? null;

    if (p?.company_name) list.push({ label: "Company", value: p.company_name, source: "Prosventa data" });
    if (enriched?.companyName && enriched.companyName !== p?.company_name) list.push({ label: "Company (enriched)", value: enriched.companyName, source: provider, retrievedAt, confidence });
    if (enriched?.domain || p?.domain) list.push({ label: "Domain", value: enriched?.domain ?? p?.domain ?? "", source: provider, retrievedAt, confidence });
    if (enriched?.description || p?.description) list.push({ label: "Overview", value: enriched?.description ?? p?.description ?? "", source: provider, retrievedAt, confidence });
    if (enriched?.industry || p?.industry) list.push({ label: "Industry", value: enriched?.industry ?? p?.industry ?? "", source: provider, retrievedAt, confidence });
    if (enriched?.employeeRange) list.push({ label: "Employees", value: enriched.employeeRange, source: provider, retrievedAt, confidence });
    else if (p?.employee_count) list.push({ label: "Employees", value: String(p.employee_count), source: "Prosventa data" });
    const location = enriched?.headquarters ?? [enriched?.city, enriched?.country].filter(Boolean).join(", ") ?? p?.location ?? [p?.city, p?.country].filter(Boolean).join(", ");
    if (location) list.push({ label: "Location", value: location, source: provider, retrievedAt, confidence });
    if (enriched?.companyType) list.push({ label: "Company type", value: enriched.companyType, source: provider, retrievedAt, confidence });
    if (enriched?.foundedYear) list.push({ label: "Founded", value: String(enriched.foundedYear), source: provider, retrievedAt, confidence });
    if (enriched?.website) list.push({ label: "Website", value: enriched.website, source: provider, retrievedAt, confidence });
    return list;
  }, [data, record, enriched]);

  return (
    <div className="space-y-6">
      <WorkspaceSectionHeader
        title="Company Intelligence"
        description="The company profile built from your stored prospect data and enrichment."
        action={
          <Button size="sm" onClick={onEnrich} loading={isProcessing} disabled={isProcessing || !hasDomain}>
            {isProcessing ? "Enriching..." : "Enrich Company"}
          </Button>
        }
      />

      {!hasDomain && !isProcessing && (
        <p className="text-xs text-slate-400">
          Add a company domain or website to this prospect to enable enrichment.
        </p>
      )}

      {facts.length === 0 && !isProcessing && (
        <WorkspaceEmptyState
          title="No company intelligence has been collected yet."
          description="Enrich this company to discover industry, company size, technology, and other business information."
          actionLabel="Start Enrichment"
          onAction={onEnrich}
        />
      )}

      {facts.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <dl className="px-5 py-1">
            {facts.map((f, i) => (
              <FactRow key={i} {...f} />
            ))}
          </dl>
        </div>
      )}

      {enriched?.technologies && enriched.technologies.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-2">Technologies</p>
          <div className="flex flex-wrap gap-1.5">
            {enriched.technologies.map((tech) => (
              <span key={tech} className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}