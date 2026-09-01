"use client";

// ============================================================================
// Prosventa Enrichment — Window Sub-Sections (Phase 2)
// ============================================================================
// Presentational building blocks for the enrichment window. Everything shown
// comes from real stored/returned data; empty sections are never rendered and
// no values are invented. Animations use the shared Prosventa motion tokens
// (transform + opacity only, reduced-motion aware via framer-motion).
// ============================================================================

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { listItemFast } from "@/lib/motion";
import {
  DEFAULT_INTELLIGENCE_MAX_AGE_MS,
  checkFreshness,
} from "@/features/intelligence/normalized";
import {
  formatFreshnessLabel,
} from "../display";
import type {
  EnrichOverviewTarget,
  StoredEnrichmentInfo,
} from "../actions";

// ----------------------------------------------------------------------------
// "Current information" checklist — only facts that actually exist
// ----------------------------------------------------------------------------

export function CurrentInformationSection({
  prospect,
}: {
  prospect: EnrichOverviewTarget;
}) {
  const facts: string[] = [];
  if (prospect.name) facts.push("Name");
  if (prospect.companyName) facts.push("Company");
  if (prospect.industry) facts.push("Industry");
  if (prospect.location) facts.push("Location");

  return (
    <motion.section variants={listItemFast} aria-labelledby="enrich-current-info">
      <h4
        id="enrich-current-info"
        className="text-xs font-semibold uppercase tracking-wide text-slate-400"
      >
        Current information
      </h4>
      <ul className="mt-2 space-y-1.5">
        {facts.length > 0 ? (
          facts.map((fact) => (
            <li key={fact} className="flex items-center gap-2 text-sm text-slate-600">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              {fact}
            </li>
          ))
        ) : (
          <li className="text-sm text-slate-500">
            Only basic identifiers are available for this prospect.
          </li>
        )}
      </ul>
      <p className="mt-3 max-w-md text-sm text-slate-500">
        Enrichment can find additional available information about this prospect
        and company.
      </p>
    </motion.section>
  );
}

export function StoredEnrichmentPreview({
  person,
  company,
}: {
  person: StoredEnrichmentInfo | null;
  company: StoredEnrichmentInfo | null;
}) {
  const entries = [
    { label: "Person", info: person },
    { label: "Company", info: company },
  ].filter(
    (e) => e.info && (e.info.status === "completed" || e.info.status === "partial")
  );
  if (entries.length === 0) return null;

  return (
    <motion.section variants={listItemFast} aria-label="Existing enrichment">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Existing enrichment
      </h4>
      <ul className="mt-2 space-y-1.5">
        {entries.map(({ label, info }) => (
          <li key={label} className="flex items-center gap-2 text-sm text-slate-600">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            {label} data ·{" "}
            <span className="text-slate-500">
              enriched {formatFreshnessLabel(info!.enrichedAt) ?? "previously"}
            </span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function freshestTimestamp(infos: (StoredEnrichmentInfo | null)[]): string | null {
  let best: string | null = null;
  for (const info of infos) {
    const at = info?.enrichedAt ?? null;
    if (!at) continue;
    if (!best || new Date(at).getTime() > new Date(best).getTime()) best = at;
  }
  return best;
}

export function PrimaryEnrichAction({
  person,
  company,
  loading,
  onRun,
  retryLabel = false,
}: {
  person: StoredEnrichmentInfo | null;
  company: StoredEnrichmentInfo | null;
  loading: boolean;
  onRun: () => void;
  retryLabel?: boolean;
}) {
  if (loading) return null;

  const completed = [person, company].filter(
    (i) => i?.status === "completed" || i?.status === "partial"
  );
  const freshest = freshestTimestamp(completed);
  const hasStored = completed.length > 0;
  // Phase-1 freshness rules decide whether a provider call is warranted.
  const freshness = checkFreshness({
    retrievedAt: freshest,
    maxAgeMs: DEFAULT_INTELLIGENCE_MAX_AGE_MS,
  });

  if (!retryLabel && hasStored && freshness.isFresh) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
        <Button onClick={onRun}>Refresh enrichment</Button>
        <p className="text-xs text-slate-400">
          Enriched {formatFreshnessLabel(freshest) ?? "recently"} — data is still
          fresh. Refreshing contacts the provider again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
      <Button onClick={onRun}>
        {retryLabel ? "Try Again" : hasStored ? "Refresh enrichment" : "Enrich Prospect"}
      </Button>
      {!retryLabel && hasStored && (
        <p className="text-xs text-slate-400">
          Last enriched {formatFreshnessLabel(freshest) ?? "previously"}.
        </p>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Result view — enriched profile organized by usefulness (Person → Company →
// Contact → Technology → Source & freshness). Empty sections never render.
// ----------------------------------------------------------------------------

export function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section variants={listItemFast} aria-label={title}>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h4>
      <div className="mt-1.5">{children}</div>
    </motion.section>
  );
}

