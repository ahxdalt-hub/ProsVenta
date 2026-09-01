"use client";

// ============================================================================
// Prosventa Find Matching Leads — Prospect Detail Window (Phase 3)
// ============================================================================
// A large minimized-window detail view built on the ONE shared ActionWindow
// architecture (open/close animations, focus trap, Escape, focus restoration).
//
// - minimizable={false}: no "-" control — this is a temporary look-inside, the
//   discovery workspace stays alive underneath and state is never lost.
// - The user NEVER navigates away from Find Matching Leads.
// - Only implemented actions are rendered. Enrichment/Research require a
//   persisted prospect, so they are NOT faked here — Phase 4 connects them
//   through the `detailActions` slot below without any UI change elsewhere.
// ============================================================================

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { ActionWindow } from "@/components/action-window/ActionWindow";
import { Button } from "@/components/ui/Button";
import type { ScoredLead } from "@/features/prospects/types/discovery";
import {
  MATCH_STATUS_META,
  buildMatchReasons,
} from "./match-explain";
import type { SaveState } from "./LeadResultCard";

export interface LeadDetailWindowProps {
  scored: ScoredLead | null;
  onClose: () => void;
  saveState: SaveState;
  onSave: () => void;
  /**
   * Integration point for future phases: render additional REAL actions
   * (e.g. Enrich / Research once a discovered prospect is persisted).
   * Nothing fake is ever rendered when this is not provided.
   */
  detailActions?: React.ReactNode;
}

function or(value: string | null | undefined): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  return v.length > 0 ? v : null;
}

export function LeadDetailWindow({
  scored,
  onClose,
  saveState,
  onSave,
  detailActions,
}: LeadDetailWindowProps) {
  // The window stays MOUNTED so ActionWindow's own smooth close animation
  // plays; content keeps rendering the last prospect until the exit completes.
  const [shown, setShown] = useState<ScoredLead | null>(null);
  useEffect(() => {
    if (scored) setShown(scored);
  }, [scored]);
  const open = scored !== null;

  return (
    <ActionWindow
      open={open}
      onClose={onClose}
      onExitComplete={() => setShown(null)}
      title="Prospect details"
      description="A closer look without leaving your search."
      minimizable={false}
      size="lg"
      closeLabel="Close prospect details"
    >
      {shown && (
        <LeadDetailContent
          scored={shown}
          saveState={saveState}
          onSave={onSave}
          detailActions={detailActions}
        />
      )}
    </ActionWindow>
  );
}

function LeadDetailContent({
  scored,
  saveState,
  onSave,
  detailActions,
}: Omit<LeadDetailWindowProps, "scored" | "onClose"> & { scored: ScoredLead }) {
  const { lead, match } = scored;
  const name = or(lead.personName) ?? or(lead.companyName) ?? "Unknown prospect";
  const reasons = buildMatchReasons(match);
  const profileUrl = lead.linkedinUrl ?? lead.profileUrl;
  const saving = saveState === "saving";
  const saved = saveState === "saved" || saveState === "already-saved";

  return (
    <div className="space-y-6">
      {/* ---- Identity ------------------------------------------------------- */}
      <div>
        <h3 className="text-lg font-bold tracking-tight text-slate-900">{name}</h3>
        <p className="mt-0.5 text-sm text-slate-500">
          {[or(lead.jobTitle), or(lead.companyName)].filter(Boolean).join(" · ") ||
            "Company contact"}
        </p>
        <span className="mt-2 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-blue-700">
          ICP Match: {match.score}%
        </span>
      </div>

      {/* ---- Why this matches ----------------------------------------------- */}
      <section aria-labelledby="detail-why">
        <h4 id="detail-why" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Why this matches
        </h4>
        {reasons.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-0.5 shrink-0 text-green-600" aria-hidden="true">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            No ICP criteria matched for this prospect yet.
          </p>
        )}
      </section>

      {/* ---- Match breakdown -------------------------------------------------- */}
      <section aria-labelledby="detail-breakdown" className="border-t border-slate-100 pt-5">
        <h4 id="detail-breakdown" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          ICP match breakdown
        </h4>
        <dl className="mt-2 space-y-1.5">
          {match.factors.map((f) => {
            const meta = MATCH_STATUS_META[f.status];
            return (
              <div key={f.label} className="flex items-center justify-between gap-4 text-sm">
                <dt className="text-slate-600">{f.label}</dt>
                <dd className={`flex items-center gap-1.5 font-medium ${meta.color}`}>
                  <span aria-hidden="true">{meta.icon}</span>
                  {meta.label}
                  {f.detail && <span className="sr-only"> — {f.detail}</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {/* ---- Person / Company facts ------------------------------------------ */}
      <section className="grid grid-cols-1 gap-x-8 border-t border-slate-100 pt-5 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Person</h4>
          <FactRow label="Role" value={or(lead.jobTitle)} />
          <FactRow label="Location" value={or(lead.location)} />
          <FactRow label="Profile / source" value={lead.source ? `Via ${lead.source}` : null} />
        </div>
        <div className="mt-4 sm:mt-0">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Company</h4>
          <FactRow label="Industry" value={or(lead.industry)} />
          <FactRow
            label="Employees"
            value={
              lead.employeeCount != null
                ? `${lead.employeeCount.toLocaleString()} employees`
                : or(lead.companySize)
            }
          />
          <FactRow label="Website" value={or(lead.companyDomain)} />
        </div>
      </section>

      {/* ---- Actions — only implemented actions ------------------------------- */}
      <section
        className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5"
        aria-label="Prospect actions"
      >
        <Button onClick={onSave} loading={saving}>
          {saved
            ? saveState === "already-saved"
              ? "Already saved"
              : "Saved to Prospects"
            : "Save Prospect"}
        </Button>

        {profileUrl && (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <ExternalLink size={14} aria-hidden="true" />
            Open profile
          </a>
        )}

        {detailActions}
      </section>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null; // unavailable information is omitted entirely
  return (
    <div className="py-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate text-sm text-slate-700">{value}</p>
    </div>
  );
}

