// ============================================================================
// Prosventa Intelligence Workspace — Today's Priorities Logic
// ============================================================================
// Phase 2: turns EXISTING product data into a ranked, explainable priority
// list. This is NOT a new scoring engine — it consumes the existing
// recommendation engine output (recommendations table), which is itself
// derived from the existing ICP scoring engine, signal pipeline, enrichment
// and research. Intelligence only presents and explains.
//
// Determinism: ordering uses the existing rankRecommendations() (priority +
// confidence + evidence strength + freshness, ties broken on created_at).
// No randomness, no invented scores, no fabricated explanations.
// ============================================================================

import type { RecommendationRecord } from "@/features/intelligence/recommendations/types";
import { rankRecommendations } from "@/features/intelligence/recommendations/lifecycle";
import type { ProspectIdentity } from "@/lib/db/prospects";

/** How many priority records Intelligence surfaces at once (bounded). */
export const PRIORITIES_LIMIT = 20;

// ============================================================================
// Display priority — the five-level recommendation scale collapses onto the
// three-level priority language the user understands (High / Medium / Low).
// The full original label is kept for explainability.
// ============================================================================

export type DisplayPriority = "high" | "medium" | "low";

function toDisplayPriority(priority: string): DisplayPriority {
  switch (priority) {
    case "very_high":
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}

function toPriorityLabel(priority: string): string {
  return String(priority).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============================================================================
// Evidence extraction — facts only, straight from stored recommendation
// evidence. Nothing is re-derived or invented here.
// ============================================================================

function extractIcpScore(evidence: RecommendationRecord["evidence"]): number | null {
  for (const item of evidence) {
    if (item.type !== "icp_score") continue;
    const match = /\b(\d{1,3})\b/.exec(`${item.label} ${item.detail}`);
    if (match) {
      const score = parseInt(match[1], 10);
      if (score >= 0 && score <= 100) return score;
    }
  }
  return null;
}

function extractEvidenceLabels(evidence: RecommendationRecord["evidence"]): string[] {
  return evidence
    .map((item) => item.label.trim())
    .filter((label) => label.length > 0)
    .slice(0, 4);
}

/**
 * The most recent meaningful change attached to this recommendation — only
 * when actual signal evidence exists. Research/enrichment/ICP evidence is
 * context, not a "change", so it never masquerades as one.
 */
function extractLatestChange(evidence: RecommendationRecord["evidence"]): string | null {
  const signalEvidence = evidence.find((item) => item.type === "signal");
  return signalEvidence ? signalEvidence.label.trim() || null : null;
}
// ============================================================================
// Priority record — a serializable contract between the server page and the
// interactive client workspace.
// ============================================================================

export interface PriorityRecord {
  id: string;
  prospectId: string | null;
  /** Company / prospect name — real data only, never a placeholder. */
  displayName: string;
  /** Real descriptive line (industry · location) when the data exists. */
  contextLine: string | null;
  /** The recommendation title (what kind of priority this is). */
  title: string;
  /** Interpretation — the existing recommendation summary. */
  reason: string;
  /** Facts — labels from stored recommendation evidence. */
  evidence: string[];
  /** Recent meaningful change (real signal evidence) when one exists. */
  latestChange: string | null;
  priority: DisplayPriority;
  priorityLabel: string;
  /** ICP fit score parsed from stored evidence (null when not scored). */
  icpScore: number | null;
  createdAt: string;
  updatedAt: string | null;
  isPrimary: boolean;
  /** Real lifecycle status of the underlying recommendation (new/viewed). */
  status: "new" | "viewed";
  /** Stored detection-time reasoning — presented verbatim, never generated. */
  reasoning: string;
}

export interface PriorityCollection {
  records: PriorityRecord[];
  /** Count per display priority — for the lightweight filter controls. */
  counts: Record<DisplayPriority, number>;
}

function resolveDisplayName(
  rec: RecommendationRecord,
  identity: ProspectIdentity | undefined
): string {
  if (identity?.company_name?.trim()) return identity.company_name.trim();
  if (identity?.name?.trim()) return identity.name.trim();
  return rec.title;
}

/**
 * Builds Today's Priorities from active workspace recommendations:
 *   1. keep only still-active recommendations (new/viewed)
 *   2. rank them with the EXISTING deterministic recommendation ranking
 *   3. collapse to one priority record per prospect (highest-ranked wins)
 *   4. attach real prospect identity (company name, industry, location)
 */
export function buildPriorityCollection(
  recommendations: RecommendationRecord[],
  identities: Record<string, ProspectIdentity> = {}
): PriorityCollection {
  const active = recommendations.filter(
    (rec) => rec.status === "new" || rec.status === "viewed"
  );

  // Existing deterministic ranking — never reordered randomly.
  const ranked = rankRecommendations(active).slice(0, PRIORITIES_LIMIT);

  // One record per prospect: the highest-ranked recommendation represents it.
  const seenProspects = new Set<string>();
  const records: PriorityRecord[] = [];
  for (const rec of ranked) {
    if (rec.prospect_id) {
      if (seenProspects.has(rec.prospect_id)) continue;
      seenProspects.add(rec.prospect_id);
    }

    const identity = rec.prospect_id ? identities[rec.prospect_id] : undefined;
    const contextParts = [
      identity?.industry?.trim(),
      [identity?.city?.trim(), identity?.country?.trim()].filter(Boolean).join(", "),
    ].filter((part): part is string => Boolean(part && part.length > 0));

    records.push({
      id: rec.id,
      prospectId: rec.prospect_id,
      displayName: resolveDisplayName(rec, identity),
      contextLine: contextParts.length > 0 ? contextParts.join(" · ") : null,
      title: rec.title,
      reason: rec.summary,
      evidence: extractEvidenceLabels(rec.evidence ?? []),
      latestChange: extractLatestChange(rec.evidence ?? []),
      priority: toDisplayPriority(String(rec.priority)),
      priorityLabel: toPriorityLabel(String(rec.priority)),
      icpScore: extractIcpScore(rec.evidence ?? []),
      createdAt: rec.created_at,
      updatedAt: rec.intelligence_updated_at ?? rec.created_at,
      isPrimary: Boolean(rec.primary_recommendation),
      status: rec.status === "viewed" ? "viewed" : "new",
      reasoning: rec.reasoning?.trim() ?? "",
    });
  }

  const counts: Record<DisplayPriority, number> = { high: 0, medium: 0, low: 0 };
  for (const record of records) counts[record.priority] += 1;

  return { records, counts };
}

// ============================================================================
// Ordering — deterministic sorts over the already-ranked set.
// ============================================================================

export type PrioritiesSortMode = "priority" | "recent" | "fit";

export function sortPriorityRecords(
  records: PriorityRecord[],
  mode: PrioritiesSortMode
): PriorityRecord[] {
  const sorted = [...records];
  switch (mode) {
    case "recent":
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "fit":
      // Highest ICP fit first; unscored records move to the end. Ties keep
      // the original ranked order (stable sort) — deterministic.
      return sorted.sort((a, b) => (b.icpScore ?? -1) - (a.icpScore ?? -1));
    default:
      // "priority" keeps the deterministic ranked order already computed.
      return sorted;
  }
}

