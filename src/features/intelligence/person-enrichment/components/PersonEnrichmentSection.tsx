// ============================================================================
// Prosventa Person Enrichment â€” Section
// Stage 6 - Phase 3: People & Decision-Maker Intelligence
// ============================================================================
// Person intelligence panel for the prospect detail experience. Displays the
// enriched person profile, decision-maker relevance, and data provenance.
// Never calls the provider on mount â€” only on an explicit user action.
// ============================================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { enrichPerson, getStoredPersonEnrichment } from "../actions";
import { CreditCostBadge, InsufficientCreditsNotice, getBillingInfo } from "@/components/dashboard/credits/CreditCostBadge";
import type { ProspectEnrichmentOperationResult } from "../../types";
import type { ProspectEnrichmentRecord } from "../../types";

const RELEVANCE_LABELS: Record<string, string> = {
  high: "High decision-maker relevance",
  medium: "Medium decision-maker relevance",
  low: "Low decision-maker relevance",
  unknown: "Relevance unknown",
};

const RELEVANCE_STYLES: Record<string, string> = {
  high: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  low: "border-slate-200 bg-slate-50 text-slate-500",
  unknown: "border-slate-200 bg-slate-50 text-slate-500",
};

interface PersonEnrichmentSectionProps {
  prospectId: string;
  /** True when the prospect has at least one safe identifier (email/domain) */
  hasIdentity: boolean;
}

export function PersonEnrichmentSection({
  prospectId,
  hasIdentity,
}: PersonEnrichmentSectionProps) {
  const [record, setRecord] = useState<ProspectEnrichmentRecord | null>(null);
  const [operation, setOperation] = useState<ProspectEnrichmentOperationResult | null>(null);
  const [isLoadingCached, setIsLoadingCached] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);

  // Load cached enrichment on mount â€” does NOT call the provider.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingCached(true);
    setRecord(null);
    setOperation(null);

    getStoredPersonEnrichment(prospectId)
      .then((stored) => {
        if (!cancelled) setRecord(stored);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingCached(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prospectId]);

  // One user action produces one enrichment operation. Duplicates are blocked
  // server-side; the UI also prevents double-clicks while processing.
  const handleEnrich = useCallback(
    async (refresh = false) => {
      if (isEnriching) return;
      setIsEnriching(true);
      setOperation(null);
      try {
        const result = await enrichPerson(prospectId, { refresh });
        setOperation(result);
        if (result.status === "completed") {
          const stored = await getStoredPersonEnrichment(prospectId).catch(() => null);
          if (stored) setRecord(stored);
        }
      } catch {
        setOperation({
          status: "failed",
          message: "Person data couldn't be retrieved right now. Please try again.",
          data: null,
          provider: "person-enrichment",
          enrichedAt: null,
          identityUsed: null,
          relevance: null,
          warnings: [],
          alreadyInProgress: false,
          usedCached: false,
        });
      } finally {
        setIsEnriching(false);
      }
    },
    [isEnriching, prospectId]
  );

  if (isLoadingCached) {
    return <p className="text-sm text-slate-400">Loading person intelligenceâ€¦</p>;
  }

  const data = record?.data ?? operation?.data ?? null;
  const relevance = operation?.relevance ?? null;
  const warnings = operation?.warnings ?? [];
  const provider = record?.provider ?? operation?.provider ?? null;
  const enrichedAt = record?.enriched_at ?? operation?.enrichedAt ?? null;
  const isProcessing =
    isEnriching ||
    record?.status === "processing" ||
    operation?.status === "processing";
  const errorMessage =
    operation?.status === "failed"
      ? operation.message
      : record?.status === "failed"
        ? (record.error_message ?? "Person enrichment failed.")
        : null;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={() => handleEnrich(Boolean(record))} loading={isEnriching}>
          {record ? "Refresh person data" : "Enrich person"}
        </Button>
        <CreditCostBadge operationKey="prospect_enrichment" compact />
        {getBillingInfo(operation)?.code === "INSUFFICIENT_CREDITS" && (
          <InsufficientCreditsNotice
            required={getBillingInfo(operation)?.required}
            available={getBillingInfo(operation)?.balance}
            compact
          />
        )}
        {isProcessing && (
          <span className="text-sm text-slate-500">Fetching professional informationâ€¦</span>
        )}
      </div>

      {!hasIdentity && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Add an email or company domain to this prospect so the person can be
          identified safely. A name alone is not enough.
        </p>
      )}

      {/* Controlled error state */}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2" role="alert">
          <p className="text-xs font-medium text-red-700">{errorMessage}</p>
        </div>
      )}

      {operation?.alreadyInProgress && (
        <p className="text-xs text-slate-500">
          Enrichment is already running â€” showing the current request instead of starting another.
        </p>
      )}
      {operation?.usedCached && (
        <p className="text-xs text-slate-400">
          Showing recently enriched data â€” no provider call was made.
        </p>
      )}

      {/* Empty state */}
      {!data && !errorMessage && !isProcessing && (
        <p className="text-sm text-slate-400">
          No external person intelligence yet. Run enrichment to add verified
          professional information.
        </p>
      )}

      {/* Person profile */}
      {data && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">
              {data.contactName ?? "Unknown person"}
            </p>
            {(data.jobTitle || data.companyName) && (
              <p className="text-xs text-slate-500">
                {[data.jobTitle, data.companyName].filter(Boolean).join(" Â· ")}
              </p>
            )}
            {(data.department || data.seniority) && (
              <p className="mt-0.5 text-xs text-slate-400">
                {[data.seniority, data.department].filter(Boolean).join(" Â· ")}
              </p>
            )}
          </div>

          {/* Decision-maker relevance */}
          {relevance && (
            <div className={cn("rounded-lg border px-3 py-2", RELEVANCE_STYLES[relevance.level])}>
              <p className="text-xs font-medium">{RELEVANCE_LABELS[relevance.level]}</p>
              {relevance.reasons.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {relevance.reasons.slice(0, 3).map((reason, i) => (
                    <li key={i} className="text-xs opacity-80">
                      Â· {reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Partial warning */}
          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-medium text-amber-800">Partial data</p>
              <ul className="mt-1 space-y-0.5">
                {warnings.map((warning, i) => (
                  <li key={i} className="text-xs text-amber-700">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Professional details â€” only legitimately returned data is shown */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <DetailRow label="Email" value={data.contactEmail} />
            <DetailRow label="Phone" value={data.contactPhone} />
            <DetailRow
              label="Location"
              value={[data.city, data.country].filter(Boolean).join(", ") || data.location || null}
            />
            <DetailRow label="Company domain" value={data.companyDomain} />
          </div>

          {/* Provenance: source + freshness (Phase 1/2 architecture) */}
          <div className="border-t border-slate-200 pt-2">
            <p className="text-xs text-slate-400">
              Source: {provider === "mock" ? "Development sample provider" : provider}
              {enrichedAt && ` Â· Last retrieved ${formatDate(enrichedAt)}`}
              {record?.confidence != null && ` Â· Confidence ${record.confidence}%`}
              {record?.source === "provider" && " Â· Provider-enriched"}
            </p>
          </div>
        </div>
      )}
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





