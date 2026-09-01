"use client";

// ============================================================================
// Prosventa Find Matching Leads — Lead Result Card (Phase 3)
// ============================================================================
// One normalized, ICP-scored lead with clear hierarchy:
//   Person · Title · Company → score + quality → top reasons → actions.
// Adds bulk-selection control and a non-navigating "View" detail action.
// Missing information is omitted gracefully — never raw null/undefined.
// ============================================================================

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ScoredLead } from "@/features/prospects/types/discovery";
import {
  MATCH_STATUS_META,
  getMatchQualityLabel,
  topMatchFactors,
} from "./match-explain";

export type SaveState = "idle" | "saving" | "saved" | "already-saved" | "failed";

const SCORE_STYLES: Record<string, string> = {
  excellent: "bg-green-50 text-green-700 border-green-200",
  strong: "bg-blue-50 text-blue-700 border-blue-200",
  moderate: "bg-amber-50 text-amber-700 border-amber-200",
  weak: "bg-slate-100 text-slate-600 border-slate-200",
  poor: "bg-slate-100 text-slate-500 border-slate-200",
};

interface LeadResultCardProps {
  scored: ScoredLead;
  saveState: SaveState;
  onSave: () => void;
  onView: () => void;
  selected: boolean;
  onToggleSelect: (selected: boolean) => void;
  index: number;
}

export function LeadResultCard({
  scored,
  saveState,
  onSave,
  onView,
  selected,
  onToggleSelect,
  index,
}: LeadResultCardProps) {
  const { lead, match } = scored;

  const personName = lead.personName?.trim() || null;
  const headline = personName ?? lead.companyName?.trim() ?? "Unknown company";
  const subline = [
    personName ? (lead.jobTitle?.trim() || null) : null,
    lead.companyName?.trim() || null,
    lead.location?.trim() || null,
  ]
    .filter(Boolean)
    .join(" · ");

  const reasons = topMatchFactors(match);
  const saving = saveState === "saving";
  const saved = saveState === "saved" || saveState === "already-saved";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className={`group rounded-xl border bg-white p-5 shadow-sm transition-all duration-150 hover:shadow-md ${
        selected ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200 hover:border-slate-300"
      }`}
      aria-selected={selected}
    >
      <div className="flex items-start gap-4">
        {/* Selection control */}
        <label className="mt-0.5 flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            checked={selected}
            onChange={(e) => onToggleSelect(e.target.checked)}
            aria-label={`Select ${headline}`}
          />
        </label>

        {/* Identity block */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="truncate text-sm font-semibold text-slate-900">{headline}</h3>
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums ${
                SCORE_STYLES[match.category] ?? SCORE_STYLES.weak
              }`}
              title={`${match.score}% match with your ICP`}
            >
              {match.score}% ICP Match
            </span>
            <span className="text-xs font-medium text-slate-400">
              {getMatchQualityLabel(match.category)}
            </span>
          </div>
          {subline && <p className="mt-0.5 truncate text-xs text-slate-500">{subline}</p>}

          {/* Top actual match reasons */}
          {reasons.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="Match reasons">
              {reasons.map((f) => (
                <li key={f.label} className="flex items-center gap-1 text-xs text-slate-500">
                  <span className={MATCH_STATUS_META.match.color} aria-hidden="true">✓</span>
                  {f.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="secondary" onClick={onView}>
            View
          </Button>
          <Button
            size="sm"
            variant={saved ? "success" : "primary"}
            onClick={onSave}
            loading={saving}
            aria-label={`Save ${headline} to Prospects`}
          >
            {!saving && saved ? (
              <>
                <Check size={13} aria-hidden="true" />
                {saveState === "already-saved" ? "Already saved" : "Saved"}
              </>
            ) : saveState === "failed" ? (
              "Retry save"
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
