"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { WorkspaceData } from "../types";
import { WorkspaceSectionHeader } from "./sections";
import { ConfidenceBadge } from "./confidence";

export function ResearchTab({
  data,
  isProcessing,
  onRun,
}: {
  data: WorkspaceData | null;
  isProcessing: boolean;
  onRun: (op: "research_company" | "research_prospect") => void;
}) {
  const companyRecord = data?.companyResearch ?? null;
  const prospectRecord = data?.prospectResearch ?? null;
  const company = companyRecord?.result ?? null;
  const prospect = prospectRecord?.result ?? null;
  const hasDomain = Boolean(data?.prospect?.domain || data?.prospect?.website);
  const hasProspectData = Boolean(
    data?.prospect?.contact_name ||
    data?.prospect?.name ||
    data?.prospect?.contact_email ||
    data?.prospect?.company_name
  );

  const [expanded, setExpanded] = useState<"company" | "prospect" | null>(null);

  return (
    <div className="space-y-6">
      <WorkspaceSectionHeader
        title="Research"
        description="Business intelligence briefs grounded in your stored data."
      />

      {/* Company Research */}
      <section aria-labelledby="company-research" className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded(expanded === "company" ? null : "company")}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          aria-expanded={expanded === "company"}
        >
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Company Research</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {company ? `Researched ${formatDate(companyRecord?.researched_at ?? company.researchedAt)}` : "Concise business intelligence brief"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => { e.stopPropagation(); onRun("research_company"); }}
              loading={isProcessing}
              disabled={isProcessing || !hasDomain}
            >
              {company ? "Research again" : "Research Company"}
            </Button>
            <svg className={cn("w-4 h-4 text-slate-400 transition-transform duration-150", expanded === "company" && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {!hasDomain && (
          <p className="px-5 pb-3 text-xs text-slate-400">
            Add a company domain or website to this prospect to enable company research.
          </p>
        )}

        {expanded === "company" && (
          <div className="border-t border-slate-100 px-5 py-4">
            {!company && (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-400 italic">No company research brief has been created yet.</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => onRun("research_company")} disabled={!hasDomain}>
                  Research Company
                </Button>
              </div>
            )}
            {company && (
              <CompanyBrief
                overview={company.overview}
                whatTheyDo={company.whatTheyDo}
                industry={company.industry}
                companySize={company.companySize}
                headquarters={company.headquarters}
                businessModel={company.businessModel}
                salesRelevance={company.salesRelevance}
                confidenceScore={company.confidence?.score ?? 0}
                notes={company.notableInfo ?? []}
              />
            )}
          </div>
        )}
      </section>

      {/* Prospect Research */}
      <section aria-labelledby="prospect-research" className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded(expanded === "prospect" ? null : "prospect")}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          aria-expanded={expanded === "prospect"}
        >
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Prospect Research</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {prospect ? `Researched ${formatDate(prospectRecord?.researched_at ?? prospect.researchedAt)}` : "Professional context brief"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => { e.stopPropagation(); onRun("research_prospect"); }}
              loading={isProcessing}
              disabled={isProcessing || !hasProspectData}
            >
              {prospect ? "Research again" : "Research Prospect"}
            </Button>
            <svg className={cn("w-4 h-4 text-slate-400 transition-transform duration-150", expanded === "prospect" && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {!hasProspectData && (
          <p className="px-5 pb-3 text-xs text-slate-400">
            Add a contact name, email, or company to this prospect to enable prospect research.
          </p>
        )}

        {expanded === "prospect" && (
          <div className="border-t border-slate-100 px-5 py-4">
            {!prospect && (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-400 italic">No prospect research brief has been created yet.</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => onRun("research_prospect")} disabled={!hasProspectData}>
                  Research Prospect
                </Button>
              </div>
            )}
            {prospect && <ProspectBrief brief={prospect} />}
          </div>
        )}
      </section>
    </div>
  );
}

function CompanyBrief({
  overview,
  whatTheyDo,
  industry,
  companySize,
  headquarters,
  businessModel,
  salesRelevance,
  confidenceScore,
  notes,
}: {
  overview: string | null;
  whatTheyDo: string | null;
  industry: string | null;
  companySize: string | null;
  headquarters: string | null;
  businessModel: string | null;
  salesRelevance: string | null;
  confidenceScore: number;
  notes: string[];
}) {
  return (
    <div className="space-y-4">
      {overview && <p className="text-sm font-medium text-slate-800">{overview}</p>}
      {whatTheyDo && <ResearchLine label="What they do" value={whatTheyDo} />}
      {(industry || companySize || headquarters || businessModel) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {industry && <div><span className="text-slate-400">Industry: </span><span className="text-slate-700">{industry}</span></div>}
          {companySize && <div><span className="text-slate-400">Size: </span><span className="text-slate-700">{companySize}</span></div>}
          {headquarters && <div><span className="text-slate-400">HQ: </span><span className="text-slate-700">{headquarters}</span></div>}
          {businessModel && <div><span className="text-slate-400">Model: </span><span className="text-slate-700">{businessModel}</span></div>}
        </div>
      )}
      {salesRelevance && <ResearchLine label="Sales relevance" value={salesRelevance} />}
      {notes.length > 0 && <ResearchLine label="Notable information" value={notes.join(" · ")} />}
      <div className="border-t border-slate-100 pt-2">
        <ConfidenceBadge level={confidenceScore >= 80 ? "high" : confidenceScore >= 50 ? "medium" : "low"} confidence={confidenceScore} />
      </div>
    </div>
  );
}

function ProspectBrief({ brief }: { brief: NonNullable<WorkspaceData["prospectResearch"]>["result"] }) {
  const b = brief as {
    professionalSummary?: string | null;
    currentRole?: { title?: string | null; company?: string | null } | null;
    seniority?: string | null;
    likelyResponsibilities?: string[] | null;
    potentialBusinessRelevance?: string | null;
    verifiedFacts?: Array<{ value: string; confidence?: string }> | null;
    inferredFacts?: Array<{ value: string; confidence?: string }> | null;
    confidence?: { score?: number; label?: string } | null;
    researchedAt?: string | null;
  };

  return (
    <div className="space-y-4">
      {b.professionalSummary && <p className="text-sm text-slate-700">{b.professionalSummary}</p>}
      {(b.currentRole?.title || b.currentRole?.company) && (
        <ResearchLine label="Current role" value={[b.currentRole.title, b.currentRole.company].filter(Boolean).join(" · ")} />
      )}
      {b.seniority && <ResearchLine label="Seniority" value={b.seniority} />}
      {b.likelyResponsibilities && b.likelyResponsibilities.length > 0 && (
        <ResearchLine label="Likely responsibilities" value={b.likelyResponsibilities.join(", ")} />
      )}
      {b.potentialBusinessRelevance && <ResearchLine label="Business relevance" value={b.potentialBusinessRelevance} />}
      {b.verifiedFacts && b.verifiedFacts.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-1">Verified facts</p>
          <ul className="space-y-1">
            {b.verifiedFacts.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                {f.value}
              </li>
            ))}
          </ul>
        </div>
      )}
      {b.inferredFacts && b.inferredFacts.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-1">Inferred</p>
          <ul className="space-y-1">
            {b.inferredFacts.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
                {f.value}
              </li>
            ))}
          </ul>
        </div>
      )}
      {b.confidence?.score !== undefined && b.confidence?.score !== null && (
        <ConfidenceBadge level={b.confidence.score >= 80 ? "high" : b.confidence.score >= 50 ? "medium" : "low"} confidence={b.confidence.score} />
      )}
      {b.researchedAt && <p className="text-[11px] text-slate-400">Researched: {formatDate(b.researchedAt)}</p>}
    </div>
  );
}

function ResearchLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-slate-600 whitespace-pre-wrap">{value}</p>
    </div>
  );
}