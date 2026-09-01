"use client";

// ============================================================================
// Prosventa Enrichment — Enriched Result View (Phase 2)
// ============================================================================
// Renders the enriched profile after a successful operation, organized by
// usefulness. Only sections with REAL provider-returned content are rendered;
// partial results are explained honestly and source/freshness come from the
// actual stored metadata.
// ============================================================================

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { listItemFast, staggerContainerFast } from "@/lib/motion";
import { detectEnrichmentCategories, formatFreshnessLabel } from "../display";
import { ResultSection } from "./EnrichProspectParts";
import type { SingleEnrichmentResult } from "../actions";

function FactRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right text-sm text-slate-700">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="truncate">{value}</span>
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export function ResultView({ result }: { result: SingleEnrichmentResult }) {
  const response = result.response;
  if (!response) return null;

  const cats = detectEnrichmentCategories(response);
  const freshness = formatFreshnessLabel(response.metadata.retrievedAt);
  const providerLabel =
    response.metadata.provider && response.metadata.provider !== "unknown"
      ? response.metadata.provider === "mock"
        ? "Development sample provider"
        : response.metadata.provider
      : null;

  const partial = result.status === "partial" || result.status === "used_cached";
  const missing = [
    !cats.contact && "Contact information",
    !cats.technology && "Technology information",
  ].filter(Boolean) as string[];

  return (
    <motion.div
      variants={staggerContainerFast}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Partial results are explained — never disguised as total failure */}
      {partial && (
        <motion.div
          variants={listItemFast}
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="status"
        >
          <p className="font-medium">Partially enriched</p>
          <p className="mt-0.5 text-xs">Enrichment completed with limited data.</p>
          <ul className="mt-2 space-y-0.5 text-xs">
            {cats.person && <li>✓ Person</li>}
            {cats.company && <li>✓ Company</li>}
            {cats.contact && <li>✓ Contact</li>}
            {cats.technology && <li>✓ Technology</li>}
            {missing.map((m) => (
              <li key={m} className="text-amber-700/80">
                Not available: {m}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* ---- Person ------------------------------------------------------ */}
      {cats.person && (
        <ResultSection title="Person">
          <dl>
            {response.person.fullName && (
              <FactRow label="Name" value={response.person.fullName} />
            )}
            {response.person.jobTitle && (
              <FactRow label="Role" value={response.person.jobTitle} />
            )}
            {response.person.seniority && (
              <FactRow label="Seniority" value={response.person.seniority} />
            )}
            {response.person.location && (
              <FactRow label="Location" value={response.person.location} />
            )}
            {response.person.profileUrl && (
              <FactRow
                label="Profile"
                value="Open professional profile"
                href={response.person.profileUrl}
              />
            )}
          </dl>
        </ResultSection>
      )}

      {/* ---- Company ----------------------------------------------------- */}
      {cats.company && (
        <ResultSection title="Company">
          {response.company.name && (
            <p className="text-sm font-semibold text-slate-900">
              {response.company.name}
            </p>
          )}
          <dl className={cn(response.company.name && "mt-1")}>
            {response.company.industry && (
              <FactRow label="Industry" value={response.company.industry} />
            )}
            {response.company.employeeCount != null && (
              <FactRow
                label="Employees"
                value={response.company.employeeCount.toLocaleString()}
              />
            )}
            {response.company.location && (
              <FactRow label="Location" value={response.company.location} />
            )}
            {response.company.website && (
              <FactRow
                label="Website"
                value={response.company.domain ?? response.company.website}
                href={response.company.website}
              />
            )}
            {response.company.description && (
              <div className="py-1">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Description
                </dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-slate-600">
                  {response.company.description}
                </dd>
              </div>
            )}
          </dl>
        </ResultSection>
      )}

      {/* ---- Contact — only legitimately returned information ------------ */}
      {cats.contact && (
        <ResultSection title="Contact">
          <dl>
            {response.contact.email && (
              <FactRow label="Email" value={response.contact.email} />
            )}
            {response.contact.phone && (
              <FactRow label="Phone" value={response.contact.phone} />
            )}
          </dl>
        </ResultSection>
      )}

      {/* ---- Technology — only real provider-reported technographics ----- */}
      {cats.technology && (
        <ResultSection title="Technology">
          <ul className="flex flex-wrap gap-1.5">
            {response.technology.technologies.map((tech) => (
              <li
                key={tech}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600"
              >
                {tech}
              </li>
            ))}
          </ul>
        </ResultSection>
      )}

      {/* ---- Source & freshness (real stored metadata) -------------------- */}
      <motion.p
        variants={listItemFast}
        className="border-t border-slate-100 pt-3 text-xs text-slate-400"
      >
        Updated {freshness ?? "recently"}
        {providerLabel
          ? ` · Source: ${providerLabel}`
          : " · Source information available"}
      </motion.p>
    </motion.div>
  );
}

