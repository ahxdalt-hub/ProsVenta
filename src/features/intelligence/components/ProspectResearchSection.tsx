"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { researchProspect, getStoredProspectResearch } from "../prospect-research/actions";
import type {
  ProspectResearchOperationResult,
  ProspectResearchRecord,
  ProspectResearchResult,
  ProspectResearchSource,
} from "../prospect-research/types";

// ============================================================================
// Prospect Research Section
// Stage 4 — Phase 5: AI Prospect Research
// ============================================================================
// Displays the grounded prospect-intelligence brief and provides the explicit
// "Research Prospect" action. Never runs research on page load — only on an
// explicit user action. Cached results are displayed without AI calls.
// ============================================================================

interface ProspectResearchSectionProps {
  prospectId: string;
  /** True when the prospect has enough data to research (name/title/company) */
  hasData: boolean;
}

export function ProspectResearchSection({ prospectId, hasData }: ProspectResearchSectionProps) {
  const [record, setRecord] = useState<ProspectResearchRecord | null>(null);
  const [operation, setOperation] = useState<ProspectResearchOperationResult | null>(null);
  const [isLoadingCached, setIsLoadingCached] = useState(true);
  const [isResearching, setIsResearching] = useState(false);

  // Load cached research on mount — does NOT run AI.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingCached(true);
    setRecord(null);
    setOperation(null);

    getStoredProspectResearch(prospectId)
      .then((stored) => {
        if (!cancelled) setRecord(stored);
      })
      .catch(() => {
        // Ignore — cached research is best-effort.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCached(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prospectId]);

  // Explicit "Research Prospect" action.
  // One user action produces one research operation. Prevent duplicates.
  const handleResearch = useCallback(
    async (refresh = false) => {
      if (isResearching) return;
      setIsResearching(true);
      setOperation(null);
      try {
        const result = await researchProspect(prospectId, { refresh });
        setOperation(result);
        // Refresh the cached record so it reflects the new state.
        if (result.status === "completed") {
          const stored = await getStoredProspectResearch(prospectId).catch(() => null);
          if (stored) setRecord(stored);
        }
      } catch {
        setOperation({
          status: "failed",
          message: "An unexpected error occurred during prospect research.",
          result: null,
          provider: "grounded-prospect-v1",
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
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => handleResearch(false)}
          loading={isResearching}
          disabled={isResearching || isLoadingCached || !hasData}
        >
          {isResearching ? "Researching..." : hasResult ? "Research again" : "Research Prospect"}
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
      </div>

      {!hasData && !isResearching && (
        <p className="text-xs text-slate-400">
          Add a contact name, job title, or company to this prospect to enable research.
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
          Researching professional information... this may take a moment.
        </p>
      )}

      {/* Error State */}
      {hasError && !isResearching && !hasResult && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {operation.message || "Prospect research failed."}
        </div>
      )}

      {/* Completed Research Result */}
      {hasResult && !isResearching && (
        <ProspectResearchResultView
          result={hasResult}
          provider={record?.provider ?? operation?.provider ?? "grounded-prospect-v1"}
          model={record?.model ?? operation?.model ?? null}
          researchedAt={record?.researched_at ?? operation?.researchedAt ?? null}
        />
      )}

      {/* Nothing researched yet */}
      {!isLoadingCached && !isResearching && !hasResult && !hasError && (
        <p className="text-sm text-slate-400">
          Research this prospect to get a concise professional-intelligence brief based on your stored data.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Prospect Research Result View
// ============================================================================

function ProspectResearchResultView({
  result,
  provider,
  model,
  researchedAt,
}: {
  result: ProspectResearchResult;
  provider: string;
  model: string | null;
  researchedAt: string | null;
}) {
  const hasExternal = result.sources?.some((s) => s.type === "external_web") ?? false;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3">
      {result.professionalSummary && (
        <p className="text-sm font-semibold text-slate-900">{result.professionalSummary}</p>
      )}

      {result.currentRole && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Current Role</p>
          <div className="space-y-0.5 text-sm text-slate-600">
            {result.currentRole.title && <p>{result.currentRole.title}</p>}
            {result.currentRole.company && <p>{result.currentRole.company}</p>}
            {result.currentRole.department && <p>{result.currentRole.department}</p>}
          </div>
        </div>
      )}

      {result.seniority && <ResearchBlock label="Seniority" content={result.seniority} />}

      {result.likelyResponsibilities && result.likelyResponsibilities.length > 0 && (
        <ResearchBlock
          label="Likely Responsibilities"
          content={result.likelyResponsibilities.join(" · ")}
        />
      )}

      {result.roleContext && <ResearchBlock label="Role Context" content={result.roleContext} />}

      {result.companyContext && <ResearchBlock label="Company Context" content={result.companyContext} />}

      {result.professionalBackground && (
        <ResearchBlock label="Professional Background" content={result.professionalBackground} />
      )}

      {result.location && (
        <ResearchBlock
          label="Location"
          content={[result.location.city, result.location.country].filter(Boolean).join(", ")}
        />
      )}

      {result.publicProfessionalContext && result.publicProfessionalContext.length > 0 && (
        <ResearchBlock
          label="Public Professional Context"
          content={result.publicProfessionalContext.join(" · ")}
        />
      )}

      {result.potentialBusinessRelevance && (
        <ResearchBlock label="Potential Business Relevance" content={result.potentialBusinessRelevance} />
      )}

      {result.possiblePainPoints && result.possiblePainPoints.length > 0 && (
        <ResearchBlock
          label="Possible Pain Points"
          content={result.possiblePainPoints.join(" · ")}
        />
      )}

      {/* Verified Facts */}
      {result.verifiedFacts && result.verifiedFacts.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Verified</p>
          <ul className="space-y-1">
            {result.verifiedFacts.map((fact, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-sm text-slate-600">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{fact.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Inferred Facts */}
      {result.inferredFacts && result.inferredFacts.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Inferred</p>
          <ul className="space-y-1">
            {result.inferredFacts.map((fact, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-sm text-slate-600">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>
                  {fact.value}
                  {fact.uncertaintyNote && (
                    <span className="block text-xs text-slate-400 mt-0.5">{fact.uncertaintyNote}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unknown Areas */}
      {result.unknownAreas && result.unknownAreas.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Unknown</p>
          <ul className="space-y-1">
            {result.unknownAreas.map((area, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-sm text-slate-500">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          {model && ` · Model: ${model}`}
          {researchedAt && ` · Researched: ${formatDate(researchedAt)}`}
        </p>
        {hasExternal ? (
          <p className="text-xs text-slate-500">
            Includes external web research.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            This brief is an AI analysis of your stored Prosventa prospect data. No external web research was performed.
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

function SourceList({ sources }: { sources: ProspectResearchSource[] }) {
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
