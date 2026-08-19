// ============================================================================
// Prosventa Company Enrichment — Section
// Stage 5 — Phase 2: Company Enrichment
// ============================================================================
// Premium company intelligence workspace. Displays a rich, trustworthy company
// profile from enrichment data. Never calls the provider on page load — only
// on an explicit user action. Cached results are displayed without provider
// calls.
//
// States:
//   idle / loading / processing / success / partial / failed / empty /
//   duplicate-in-progress
// ============================================================================

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { checkFreshness } from "../../normalized";
import { confidenceLabel } from "../confidence";
import { enrichCompany, getStoredCompanyEnrichment } from "../actions";
import type { CompanyEnrichmentOperationResult } from "../types";
import type { CompanyEnrichmentRecordLike } from "../service";
import type { CompanyEnrichmentResult } from "../../types";

interface CompanyEnrichmentSectionProps {
  prospectId: string;
  /** True when the prospect has a domain/website (enables enrichment) */
  hasDomain: boolean;
}

export function CompanyEnrichmentSection({
  prospectId,
  hasDomain,
}: CompanyEnrichmentSectionProps) {
  const [record, setRecord] = useState<CompanyEnrichmentRecordLike | null>(null);
  const [operation, setOperation] = useState<CompanyEnrichmentOperationResult | null>(null);
  const [isLoadingCached, setIsLoadingCached] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);

  // Load cached enrichment on mount — does NOT call the provider.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingCached(true);
    setRecord(null);
    setOperation(null);

    getStoredCompanyEnrichment(prospectId)
      .then((stored) => {
        if (!cancelled) setRecord(stored);
      })
      .catch(() => {
        // Ignore — cached enrichment is best-effort.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCached(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prospectId]);

  // Explicit "Enrich company" / "Refresh" action.
  // One user action produces one enrichment operation. Duplicates are blocked
  // server-side; the UI also prevents double-clicks while processing.
  const handleEnrich = useCallback(
    async (refresh = false) => {
      if (isEnriching) return;
      setIsEnriching(true);
      setOperation(null);
      try {
        const result = await enrichCompany(prospectId, "", { refresh });
        setOperation(result);
        // Refresh the cached record so it reflects the new state.
        if (result.status === "completed") {
          const stored = await getStoredCompanyEnrichment(prospectId).catch(() => null);
          if (stored) setRecord(stored);
        }
      } catch {
        setOperation({
          status: "failed",
          message: "Company data couldn't be retrieved right now. Please try again.",
          data: null,
          provider: "company-enrichment",
          enrichedAt: null,
          confidence: null,
          partial: false,
          warnings: [],
          alreadyInProgress: false,
          usedCached: false,
        });
      } finally {
        setIsEnriching(false);
      }
    },
    [prospectId, isEnriching]
  );

  const data = record?.data ?? operation?.data ?? null;
  const provider = record?.provider ?? operation?.provider ?? null;
  const enrichedAt = record?.enriched_at ?? operation?.enrichedAt ?? null;
  const confidence = record?.confidence ?? operation?.confidence ?? null;
  const hasError = operation?.status === "failed";
  const usedCached = operation?.usedCached === true;

  const freshness = useMemo(
    () =>
      checkFreshness({
        retrievedAt: enrichedAt,
      }),
    [enrichedAt]
  );

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => handleEnrich(false)}
          loading={isEnriching}
          disabled={isEnriching || isLoadingCached || !hasDomain}
        >
          {isEnriching ? "Enriching..." : "Enrich company"}
        </Button>
        {data && !isEnriching && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEnrich(true)}
            disabled={isEnriching}
          >
            Refresh
          </Button>
        )}
      </div>

      {!hasDomain && !isEnriching && (
        <p className="text-xs text-slate-400">
          Add a company domain or website to this prospect to enable enrichment.
        </p>
      )}

      {/* Loading cached enrichment */}
      {isLoadingCached && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )}

      {/* Duplicate request in progress */}
      {operation?.alreadyInProgress && !isEnriching && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <p className="text-sm text-slate-600">Company enrichment is already in progress.</p>
        </div>
      )}

      {/* Enrichment in progress — keep existing data visible */}
      {isEnriching && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-slate-200 bg-white px-4 py-3"
        >
          <p className="text-sm text-slate-700">Updating company data</p>
          <p className="text-xs text-slate-400 mt-0.5">Enrichment in progress...</p>
        </div>
      )}

      {/* Error State */}
      {hasError && !isEnriching && !data && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
          role="alert"
        >
          {operation?.message || "Company data couldn't be retrieved right now. Please try again."}
        </div>
      )}

      {/* Completed / Cached Enrichment */}
      {data && !isEnriching && (
        <EnrichmentProfile
          data={data}
          provider={provider}
          enrichedAt={enrichedAt}
          confidence={confidence}
          freshnessLabel={freshness.label}
          usedCached={usedCached}
          partial={operation?.partial ?? false}
          warnings={operation?.warnings ?? []}
        />
      )}

      {/* Nothing enriched yet */}
      {!isLoadingCached && !isEnriching && !data && !hasError && !operation?.alreadyInProgress && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-5 text-center">
          <p className="text-sm font-medium text-slate-600">
            {"Company intelligence hasn't been collected yet."}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Enrich this company to discover industry, company size, technology and other business information.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Enrichment Profile
// ============================================================================

function EnrichmentProfile({
  data,
  provider,
  enrichedAt,
  confidence,
  freshnessLabel,
  usedCached,
  partial,
  warnings,
}: {
  data: CompanyEnrichmentResult;
  provider: string | null;
  enrichedAt: string | null;
  confidence: number | null;
  freshnessLabel: string;
  usedCached: boolean;
  partial: boolean;
  warnings: string[];
}) {
  const location = [data.city, data.country].filter(Boolean).join(", ") || data.headquarters || null;
  const employeeLabel =
    data.employeeCount !== null
      ? String(data.employeeCount)
      : data.employeeRange ?? null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-4">
      {/* Company Header */}
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {data.companyName ?? "Company"}
        </p>
        {data.domain && <p className="text-xs text-slate-400 mt-0.5">{data.domain}</p>}
        {(data.industry || location || employeeLabel) && (
          <p className="text-xs text-slate-500 mt-1">
            {[data.industry, location, employeeLabel].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* Partial warning */}
      {partial && warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-medium text-amber-800">Partial data</p>
          <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
            {warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Overview */}
      {data.description && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Overview</p>
          <p className="text-sm text-slate-600">{data.description}</p>
        </div>
      )}

      {/* Technology */}
      {data.technologies.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Technology</p>
          <div className="flex flex-wrap gap-1.5">
            {data.technologies.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Company Details */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Company Details</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <DetailRow label="Website" value={data.website} />
          <DetailRow label="Industry" value={data.industry} />
          <DetailRow label="Employees" value={employeeLabel} />
          <DetailRow label="Location" value={location} />
          <DetailRow label="Founded" value={data.foundedYear !== null ? String(data.foundedYear) : null} />
          <DetailRow label="Company type" value={data.companyType} />
        </div>
      </div>

      {/* Data Quality */}
      <div className="border-t border-slate-200 pt-2 space-y-1">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Data Quality</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <DetailRow label="Confidence" value={confidence !== null ? `${confidenceLabel(confidence)} (${confidence}%)` : null} />
          <DetailRow label="Source" value={provider} />
          <DetailRow label="Last enriched" value={enrichedAt ? formatDate(enrichedAt) : null} />
          <DetailRow label="Freshness" value={freshnessLabel} />
        </div>
        {usedCached && (
          <p className="text-xs text-slate-400 pt-1">
            Showing recently enriched data — no provider call was made.
          </p>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="text-slate-400">{label}: </span>
      <span className={cn("text-slate-700", !value && "text-slate-400 italic")}>
        {value ?? "Not available"}
      </span>
    </div>
  );
}