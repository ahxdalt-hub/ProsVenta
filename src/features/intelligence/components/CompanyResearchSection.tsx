"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { researchProspectCompany, getStoredCompanyResearch } from "../research/actions";
import { CreditCostBadge, InsufficientCreditsNotice, getBillingInfo } from "@/components/dashboard/credits/CreditCostBadge";
import type {
  CompanyResearchOperationResult,
  CompanyResearchRecord,
  CompanyResearchResult,
  ResearchSource,
} from "../research/types";

// ============================================================================
// Company Research Section
// Stage 4 â€” Phase 4: AI Company Research
// ============================================================================
// Displays the grounded company research brief and provides the explicit
// "Research Company" action. Never runs research on page load â€” only on an
// explicit user action. Cached results are displayed without AI calls.
// ============================================================================

interface CompanyResearchSectionProps {
  prospectId: string;
  /** True when the prospect has a domain/website (enables research) */
  hasDomain: boolean;
}

export function CompanyResearchSection({ prospectId, hasDomain }: CompanyResearchSectionProps) {
  const [record, setRecord] = useState<CompanyResearchRecord | null>(null);
  const [operation, setOperation] = useState<CompanyResearchOperationResult | null>(null);
  const [isLoadingCached, setIsLoadingCached] = useState(true);
  const [isResearching, setIsResearching] = useState(false);

  // Load cached research on mount â€” does NOT run AI.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingCached(true);
    setRecord(null);
    setOperation(null);

    getStoredCompanyResearch(prospectId)
      .then((stored) => {
        if (!cancelled) setRecord(stored);
      })
      .catch(() => {
        // Ignore â€” cached research is best-effort.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCached(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prospectId]);

  // Explicit "Research Company" action.
  // One user action produces one research operation. Prevent duplicates.
  const handleResearch = useCallback(
    async (refresh = false) => {
      if (isResearching) return;
      setIsResearching(true);
      setOperation(null);
      try {
        const result = await researchProspectCompany(prospectId, { refresh });
        setOperation(result);
        // Refresh the cached record so it reflects the new state.
        if (result.status === "completed") {
          const stored = await getStoredCompanyResearch(prospectId).catch(() => null);
          if (stored) setRecord(stored);
        }
      } catch {
        setOperation({
          status: "failed",
          message: "An unexpected error occurred during company research.",
          result: null,
          provider: "grounded-v1",
          model: null,
          researchedAt: null,
        });
      } finally {
        setIsResearching(false);
      }
    },
    [prospectId, isResearching]
  );

  const hasResult = record?.result ?? operation?.result ?? null;
  const hasError = operation?.status === "failed";

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={() => handleResearch(false)}
          loading={isResearching}
          disabled={isResearching || isLoadingCached || !hasDomain}
        >
          {isResearching ? "Researching..." : hasResult ? "Research again" : "Research Company"}
        </Button>
        {hasResult && !isResearching && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleResearch(true)}
            disabled={isResearching}
          >
            Refresh
          </Button>
        )}
        <CreditCostBadge operationKey="company_research" compact />
        {getBillingInfo(operation)?.code === "INSUFFICIENT_CREDITS" && (
          <InsufficientCreditsNotice
            required={getBillingInfo(operation)?.required}
            available={getBillingInfo(operation)?.balance}
            compact
          />
        )}
      </div>

      {!hasDomain && !isResearching && (
        <p className="text-xs text-slate-400">
          Add a company domain or website to this prospect to enable research.
        </p>
      )}

      {/* Loading cached research */}
      {isLoadingCached && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )}

      {/* Loading research operation */}
      {isResearching && (
        <p className="text-sm text-slate-500">
          Researching company information... this may take a moment.
        </p>
      )}

      {/* Error State */}
      {hasError && !isResearching && !hasResult && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {operation.message || "Company research failed."}
        </div>
      )}

      {/* Completed Research Result */}
      {hasResult && !isResearching && (
        <ResearchResultView
          result={hasResult}
          provider={record?.provider ?? operation?.provider ?? "grounded-v1"}
          model={record?.model ?? operation?.model ?? null}
          researchedAt={record?.researched_at ?? operation?.researchedAt ?? null}
        />
      )}

      {/* Nothing researched yet */}
      {!isLoadingCached && !isResearching && !hasResult && !hasError && (
        <p className="text-sm text-slate-400">
          Research this company to get a concise business-intelligence brief based on your stored data.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Research Result View
// ============================================================================

function ResearchResultView({
  result,
  provider,
  model,
  researchedAt,
}: {
  result: CompanyResearchResult;
  provider: string;
  model: string | null;
  researchedAt: string | null;
}) {
  const hasExternal = result.sources?.some((s) => s.type === "external_web") ?? false;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3">
      {result.overview && (
        <p className="text-sm font-semibold text-slate-900">{result.overview}</p>
      )}

      {result.whatTheyDo && <ResearchBlock label="What They Do" content={result.whatTheyDo} />}

      {result.productsServices && result.productsServices.length > 0 && (
        <ResearchBlock
          label="Products & Services"
          content={result.productsServices.join(", ")}
        />
      )}

      {result.targetCustomers && <ResearchBlock label="Target Customers" content={result.targetCustomers} />}

      {result.businessModel && <ResearchBlock label="Business Model" content={result.businessModel} />}

      {/* Metadata Grid */}
      {(result.industry || result.companySize || result.headquarters) && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {result.industry && (
            <div>
              <span className="text-slate-400">Industry: </span>
              <span className="text-slate-700">{result.industry}</span>
            </div>
          )}
          {result.companySize && (
            <div>
              <span className="text-slate-400">Company Size: </span>
              <span className="text-slate-700">{result.companySize}</span>
            </div>
          )}
          {result.headquarters && (
            <div>
              <span className="text-slate-400">HQ: </span>
              <span className="text-slate-700">{result.headquarters}</span>
            </div>
          )}
        </div>
      )}

      {result.businessContext && <ResearchBlock label="Business Context" content={result.businessContext} />}

      {result.notableInfo && result.notableInfo.length > 0 && (
        <ResearchBlock
          label="Notable Information"
          content={result.notableInfo.join(" Â· ")}
        />
      )}

      {result.salesRelevance && <ResearchBlock label="Sales Relevance" content={result.salesRelevance} />}

      {/* Confidence */}
      {result.confidence && (
        <p className="text-xs text-slate-400">
          Research confidence: {result.confidence.label} ({result.confidence.score}/100)
        </p>
      )}

      {/* Source Transparency */}
      <div className="border-t border-slate-200 pt-2 space-y-1.5">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Sources
        </p>
        <SourceList sources={result.sources ?? []} />
        <p className="text-xs text-slate-400">
          Provider: {provider}
          {model && ` Â· Model: ${model}`}
          {researchedAt && ` Â· Researched: ${formatDate(researchedAt)}`}
        </p>
        {hasExternal ? (
          <p className="text-xs text-slate-500">
            Includes external web research.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            This brief is an AI analysis of your stored Prosventa company data. No external web research was performed.
          </p>
        )}
      </div>
    </div>
  );
}

function ResearchBlock({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-slate-600 whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function SourceList({ sources }: { sources: ResearchSource[] }) {
  if (sources.length === 0) {
    return <p className="text-xs text-slate-400">No sources recorded.</p>;
  }
  return (
    <ul className="space-y-1">
      {sources.map((source, idx) => (
        <li key={idx} className="flex items-start justify-between gap-2 text-xs">
          <span className={cn("truncate", source.type === "ai_analysis" ? "text-slate-400" : "text-slate-600")}>
            {source.name}
          </span>
          <span className="text-slate-400 shrink-0">
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
                onClick={(e) => e.stopPropagation()}
              >
                Link
              </a>
            ) : (
              source.retrievedAt ? formatDate(source.retrievedAt) : null
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

