// ============================================================================
// Prosventa Person Enrichment — Decision-Maker Relevance
// Stage 6 - Phase 3: People & Decision-Maker Intelligence
// ============================================================================
// Deterministic, evidence-based assessment of how relevant a person is as a
// decision maker. This is NOT a second scoring engine — it is a small,
// transparent classification that feeds the EXISTING ICP scoring engine and
// recommendation evaluation (which consume the same stored enrichment data).
//
// Categories: high | medium | low | unknown.
// "unknown" is used whenever the available evidence does not support a
// judgement — Prosventa never pretends someone is a decision-maker.
// ============================================================================

import type {
  PersonDecisionMakerRelevance,
  PersonRelevanceAssessment,
  ProspectEnrichmentResult,
} from "../types";

/** Seniority markers that strongly indicate economic/technical authority. */
const EXECUTIVE_MARKERS = [
  "ceo", "cto", "cfo", "coo", "cmo", "cro", "cio", "chief",
  "president", "owner", "founder", "co-founder", "managing director",
];

const LEADERSHIP_MARKERS = ["vp", "vice president", "head of", "director", "general manager"];

const INFLUENCER_MARKERS = [
  "manager", "lead", "principal", "senior manager", "team lead",
];

/** Departments typically involved in purchase decisions. */
const DECISION_DEPARTMENTS = [
  "executive", "leadership", "technology", "engineering", "it",
  "sales", "revenue", "marketing", "finance", "operations", "procurement",
];

function matchesAny(haystack: string, needles: string[]): string | null {
  for (const needle of needles) {
    if (haystack.includes(needle)) return needle;
  }
  return null;
}

/**
 * Assesses decision-maker relevance from the enriched person data using the
 * strongest available evidence (title first, then seniority + department).
 */
export function assessDecisionMakerRelevance(
  person: ProspectEnrichmentResult
): PersonRelevanceAssessment {
  const title = person.jobTitle?.toLowerCase().trim() ?? null;
  const seniority = person.seniority?.toLowerCase().trim() ?? null;
  const department = person.department?.toLowerCase().trim() ?? null;

  const reasons: string[] = [];
  let level: PersonDecisionMakerRelevance = "unknown";

  // No role evidence at all → honest "unknown".
  if (!title && !seniority && !department) {
    return { level: "unknown", reasons: ["No role information was available to assess relevance."] };
  }

  const execMarker = title ? matchesAny(title, EXECUTIVE_MARKERS) : null;
  const leadershipMarker = title ? matchesAny(title, LEADERSHIP_MARKERS) : null;
  const influencerMarker = title ? matchesAny(title, INFLUENCER_MARKERS) : null;
  const seniorityIsExecutive =
    seniority !== null &&
    (seniority.includes("c-level") ||
      seniority.includes("executive") ||
      seniority.includes("owner") ||
      seniority.includes("founder"));
  const seniorityIsLeadership =
    seniority !== null &&
    (seniority.includes("vp") || seniority.includes("vice president") || seniority.includes("director") || seniority.includes("head"));

  if (execMarker || seniorityIsExecutive) {
    level = "high";
    if (title) reasons.push(`Title "${person.jobTitle}" indicates executive authority.`);
    else if (seniorityIsExecutive) reasons.push(`Seniority "${person.seniority}" indicates executive authority.`);
  } else if (leadershipMarker || seniorityIsLeadership) {
    level = "medium";
    if (title) reasons.push(`Title "${person.jobTitle}" indicates leadership responsibility.`);
    else reasons.push(`Seniority "${person.seniority}" indicates leadership responsibility.`);
  } else if (influencerMarker) {
    level = "medium";
    reasons.push(`Title "${person.jobTitle}" suggests day-to-day influence.`);
  } else if (title || seniority) {
    level = "low";
    reasons.push(
      `Title/seniority (${[person.jobTitle, person.seniority].filter(Boolean).join(", ")}) does not indicate decision authority.`
    );
  }

  if (
    department &&
    DECISION_DEPARTMENTS.some((d) => department.includes(d)) &&
    level !== "unknown"
  ) {
    reasons.push(`Department "${person.department}" is commonly involved in purchase decisions.`);
    if (level === "medium") {
      // Leadership in a decision-making department strengthens the case.
      if (leadershipMarker || seniorityIsLeadership) level = "high";
    }
  }

  if (reasons.length === 0) {
    reasons.push("Available information was insufficient to assess decision-maker relevance.");
  }

  return { level, reasons };
}
