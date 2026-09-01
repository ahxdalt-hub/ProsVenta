// ============================================================================
// Prosventa Recommendations — Feature 5: Phase 2
// Candidate Detection
// ============================================================================
// FIRST decides whether a recommendation is even necessary. A prospect
// existing is never sufficient. Pure + deterministic + fully testable.
//
// Missing data is treated as a research opportunity — never as a negative
// signal about the prospect.
// ============================================================================

import type { RecommendationEvidence } from "../types";
import type {
  DecisionContext,
  DecisionSignal,
  DetectedCandidate,
  EvidenceConflict,
} from "./types";
import { daysSince } from "../lifecycle";

// ============================================================================
// Thresholds (deterministic, documented, testable)
// ============================================================================

/** Strong ICP fit required for prioritization. */
export const STRONG_ICP_SCORE = 85;
/** Promising fit that justifies filling information gaps. */
export const PROMISING_ICP_SCORE = 70;
/** Enrichment older than this (days) may warrant a refresh. */
export const ENRICHMENT_STALE_DAYS = 180;
/** Intelligence older than this (days) is stale. */
export const INTELLIGENCE_STALE_DAYS = 90;
/** Signals newer than this are considered recent timing evidence. */
export const RECENT_SIGNAL_DAYS = 30;

const NON_BUSINESS_CATEGORIES = new Set(["prosventa_activity"]);

function isBusinessSignal(signal: DecisionSignal): boolean {
  return !NON_BUSINESS_CATEGORIES.has(signal.category) && signal.importance !== "low";
}

function isRecent(dateString: string | null | undefined, days: number): boolean {
  const d = daysSince(dateString);
  return d !== null && d < days;
}

function isVerified(signal: DecisionSignal): boolean {
  return signal.confidence === "high" || signal.confidence === "verified";
}

function isMajor(signal: DecisionSignal): boolean {
  return signal.importance === "critical" || signal.importance === "high";
}

// ============================================================================
// Conflict detection (spec §16)
// ============================================================================

interface ConflictPattern {
  positive: RegExp;
  negative: RegExp;
  summary: string;
}

const CONFLICT_PATTERNS: ConflictPattern[] = [
  {
    positive: /\b(hiring|headcount grow|growing team|expanding|expansion|new openings?)\b/i,
    negative: /\b(layoffs?|reduced headcount|downsiz|shrinking|hiring freeze)\b/i,
    summary: "Recent signals point in different directions about company growth.",
  },
  {
    positive: /\b(new (vp|c[eto]o|chief|director|leader)|leadership change|promoted)\b/i,
    negative: /\b(departure|stepped down|resigned|left the company)\b/i,
    summary: "Leadership signals conflict about the stability of the team.",
  },
];

/**
 * Detects explicitly conflicting evidence pairs. Conflicts are NEVER silently
 * resolved — they surface as reduced confidence and an uncertainty note.
 */
export function detectEvidenceConflicts(
  signals: DecisionSignal[]
): EvidenceConflict[] {
  const conflicts: EvidenceConflict[] = [];
  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      const textA = `${signals[i].title} ${signals[i].description}`;
      const textB = `${signals[j].title} ${signals[j].description}`;
      for (const pattern of CONFLICT_PATTERNS) {
        const aPositive = pattern.positive.test(textA);
        const bPositive = pattern.positive.test(textB);
        if (
          (aPositive && pattern.negative.test(textB)) ||
          (bPositive && pattern.negative.test(textA))
        ) {
          conflicts.push({
            summary: pattern.summary,
            evidenceA: signalEvidence(signals[i]),
            evidenceB: signalEvidence(signals[j]),
          });
        }
      }
    }
  }
  return conflicts;
}

export function signalEvidence(signal: DecisionSignal): RecommendationEvidence {
  return {
    type: "signal",
    label: signal.title,
    detail: signal.description,
    sourceId: signal.id,
    retrievedAt: signal.detected_at,
  };
}

// ============================================================================
// Detection rules — one pure function per candidate type
// ============================================================================

/** PRIORITIZE_PROSPECT: multiple strong factors aligning (spec §4). */
export function detectPrioritizeCandidate(
  context: DecisionContext
): DetectedCandidate | null {
  if (context.icpScore === null || context.icpScore < STRONG_ICP_SCORE) return null;

  const meaningful = context.signals.filter(isBusinessSignal);
  const recentMeaningful = meaningful.filter((s) =>
    isRecent(s.detected_at, RECENT_SIGNAL_DAYS)
  );

  // Strong ICP must align with at least TWO of: strong relevance (research),
  // decision-maker enrichment, or relevant recent timing evidence.
  const strongRelevance = context.hasCompanyResearch || context.hasProspectResearch;
  const strongTiming = recentMeaningful.length > 0;
  const decisionMaker = context.hasProspectEnrichment;

  let alignedFactors = 0;
  if (strongRelevance) alignedFactors++;
  if (strongTiming) alignedFactors++;
  if (decisionMaker) alignedFactors++;
  if (alignedFactors < 2) return null;

  const reasons = [`ICP score ${context.icpScore} is strong`];
  const pool: RecommendationEvidence[] = [];
  const sourceIds: string[] = [];

  pool.push({
    type: "icp_score",
    label: `ICP fit: ${context.icpScore}`,
    detail: "Scored against the configured Ideal Customer Profile.",
    sourceId: null,
    retrievedAt: context.icpScoredAt,
  });

  if (strongRelevance) {
    reasons.push("company research supports business relevance");
    pool.push({
      type: "research",
      label: "Company research available",
      detail: "Existing research corroborates business relevance.",
      sourceId: null,
      retrievedAt: context.companyResearchUpdatedAt,
    });
  }
  if (decisionMaker) {
    reasons.push("prospect role enriched");
    pool.push({
      type: "enrichment",
      label: "Decision-maker profile available",
      detail: "Prospect role and seniority have been enriched.",
      sourceId: null,
      retrievedAt: context.prospectEnrichmentUpdatedAt,
    });
  }
  for (const signal of recentMeaningful.slice(0, 3)) {
    reasons.push(`recent signal: ${signal.title}`);
    pool.push(signalEvidence(signal));
    sourceIds.push(signal.id);
  }

  return {
    type: "PRIORITIZE_PROSPECT",
    reasons,
    evidencePool: pool,
    sourceSignalIds: sourceIds,
    benefitsFromAiExplanation: false,
  };
}

/** RESEARCH_PROSPECT: promising fit but important information missing (§5). */
export function detectResearchCandidate(
  context: DecisionContext
): DetectedCandidate | null {
  if (context.icpScore === null || context.icpScore < PROMISING_ICP_SCORE) return null;
  if (context.icpScore >= STRONG_ICP_SCORE && context.hasCompanyResearch) return null;

  const missing: string[] = [];
  const pool: RecommendationEvidence[] = [];

  pool.push({
    type: "icp_score",
    label: `ICP fit: ${context.icpScore}`,
    detail: "Promising ICP alignment, but key context is incomplete.",
    sourceId: null,
    retrievedAt: context.icpScoredAt,
  });

  if (!context.hasCompanyEnrichment) missing.push("company firmographics");
  if (!context.hasCompanyResearch) missing.push("company research");
  if (!context.hasProspectEnrichment) missing.push("prospect role details");

  if (missing.length === 0) return null;

  return {
    type: "RESEARCH_PROSPECT",
    reasons: [`Promising ICP fit (${context.icpScore}) but missing: ${missing.join(", ")}`],
    evidencePool: pool,
    sourceSignalIds: [],
    benefitsFromAiExplanation: false,
  };
}

// ============================================================================
// REVIEW_SIGNAL (§6) — only signals already available in the Signals system
// ============================================================================

export function detectReviewSignalCandidates(
  context: DecisionContext
): DetectedCandidate[] {
  const candidates: DetectedCandidate[] = [];
  const seen = new Set<string>();

  for (const signal of context.signals) {
    if (!isBusinessSignal(signal)) continue;
    if (!isMajor(signal) && !isVerified(signal)) continue;
    // Material change: recent enough to act on.
    if (!isRecent(signal.detected_at, RECENT_SIGNAL_DAYS * 3)) continue;
    if (seen.has(signal.id)) continue;
    seen.add(signal.id);

    const conflicts = detectEvidenceConflicts(
      context.signals.filter((s) => s.id !== signal.id)
    );

    candidates.push({
      type: "REVIEW_SIGNAL",
      reasons: [`${signal.importance}-importance ${signal.signal_type}: ${signal.title}`],
      evidencePool: [
        signalEvidence(signal),
        ...(conflicts.length > 0 ? conflicts.map((c) => c.evidenceB) : []),
      ],
      sourceSignalIds: [signal.id],
      benefitsFromAiExplanation: true,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    });
  }
  return candidates;
}

// ============================================================================
// REFRESH_ENRICHMENT (§7) — IMPORTANT enrichment stale, not optional fields
// ============================================================================

export function detectRefreshEnrichmentCandidate(
  context: DecisionContext
): DetectedCandidate | null {
  const pool: RecommendationEvidence[] = [];
  const outdated: string[] = [];
  const whyItMatters: string[] = [];

  const companyAge = daysSince(context.companyEnrichmentUpdatedAt);
  if (
    context.hasCompanyEnrichment &&
    companyAge !== null &&
    companyAge >= ENRICHMENT_STALE_DAYS
  ) {
    outdated.push("company enrichment");
    whyItMatters.push("firmographics drive ICP scoring accuracy");
    pool.push({
      type: "data_quality",
      label: `Company enrichment is ${companyAge} days old`,
      detail: "Firmographic data may no longer reflect the company.",
      sourceId: null,
      retrievedAt: context.companyEnrichmentUpdatedAt,
    });
  }

  const prospectAge = daysSince(context.prospectEnrichmentUpdatedAt);
  if (
    context.hasProspectEnrichment &&
    prospectAge !== null &&
    prospectAge >= ENRICHMENT_STALE_DAYS
  ) {
    outdated.push("prospect enrichment");
    whyItMatters.push("roles change frequently and affect outreach relevance");
    pool.push({
      type: "data_quality",
      label: `Prospect enrichment is ${prospectAge} days old`,
      detail: "The contact's role may have changed since enrichment.",
      sourceId: null,
      retrievedAt: context.prospectEnrichmentUpdatedAt,
    });
  }

  // Never recommend enrichment merely because optional fields are missing.
  if (outdated.length === 0) return null;

  return {
    type: "REFRESH_ENRICHMENT",
    reasons: [
      `Outdated: ${outdated.join(", ")}. Why it matters: ${whyItMatters.join("; ")}`,
    ],
    evidencePool: pool,
    sourceSignalIds: [],
    benefitsFromAiExplanation: false,
  };
}

// ============================================================================
// REFRESH_INTELLIGENCE (§8) — stale AND meaningful evidence changed after it.
// Valid intelligence → NO recommendation. Never regenerate on page load.
// ============================================================================

export function detectRefreshIntelligenceCandidate(
  context: DecisionContext
): DetectedCandidate | null {
  const intelAge = daysSince(context.intelligenceUpdatedAt);
  if (intelAge === null || intelAge < INTELLIGENCE_STALE_DAYS) return null;

  const changedAfterIntel = context.signals.some((s) => {
    const detected = new Date(s.detected_at).getTime();
    const intelAt = context.intelligenceUpdatedAt
      ? new Date(context.intelligenceUpdatedAt).getTime()
      : 0;
    return !Number.isNaN(detected) && detected > intelAt && isBusinessSignal(s);
  });

  if (!changedAfterIntel) return null;

  const drivers = context.signals.filter((s) => isBusinessSignal(s)).slice(0, 2);

  return {
    type: "REFRESH_INTELLIGENCE",
    reasons: [
      `Intelligence is ${intelAge} days old`,
      "new underlying signals arrived after it was generated",
    ],
    evidencePool: [
      {
        type: "data_quality",
        label: `Intelligence is ${intelAge} days old`,
        detail: "Newer signals exist that intelligence has not considered.",
        sourceId: null,
        retrievedAt: context.intelligenceUpdatedAt,
      },
      ...drivers.map(signalEvidence),
    ],
    sourceSignalIds: drivers.map((s) => s.id),
    benefitsFromAiExplanation: false,
  };
}

// ============================================================================
// REASSESS_PROSPECT (§9) — major change may invalidate the prior assessment
// ============================================================================

export function detectReassessCandidate(
  context: DecisionContext
): DetectedCandidate | null {
  if (context.icpScore === null) return null;

  const intelAt = context.intelligenceUpdatedAt
    ? new Date(context.intelligenceUpdatedAt).getTime()
    : 0;

  const majorEstablishedSignals = context.signals.filter((s) => {
    if (!isBusinessSignal(s) || !isMajor(s)) return false;
    const detected = new Date(s.detected_at).getTime();
    if (Number.isNaN(detected) || detected <= intelAt) return false;
    // Not merely recent noise — established enough to question the assessment.
    return !isRecent(s.detected_at, RECENT_SIGNAL_DAYS);
  });

  const conflicts = detectEvidenceConflicts(context.signals);

  // Major change alone isn't enough — there must be tension with the prior
  // assessment: either conflicting evidence or several major changes.
  const materialChange =
    majorEstablishedSignals.length >= 2 ||
    (majorEstablishedSignals.length >= 1 && conflicts.length > 0);

  if (!materialChange) return null;

  return {
    type: "REASSESS_PROSPECT",
    reasons: [
      `${majorEstablishedSignals.length} major change(s) occurred after the last assessment`,
      ...(conflicts.length > 0 ? ["evidence points in conflicting directions"] : []),
    ],
    evidencePool: [
      ...majorEstablishedSignals.slice(0, 3).map(signalEvidence),
      ...(conflicts.length > 0 ? conflicts.map((c) => c.evidenceB) : []),
    ],
    sourceSignalIds: majorEstablishedSignals.map((s) => s.id),
    benefitsFromAiExplanation: true,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  };
}

// ============================================================================
// Stage entry point
// ============================================================================

/**
 * Detects all recommendation candidates for a context. Returns an empty array
 * when nothing deserves attention — a valid, expected outcome (§18).
 */
export function detectCandidates(context: DecisionContext): DetectedCandidate[] {
  const candidates: DetectedCandidate[] = [];

  const prioritize = detectPrioritizeCandidate(context);
  if (prioritize) candidates.push(prioritize);

  const reassess = detectReassessCandidate(context);
  if (reassess) candidates.push(reassess);

  candidates.push(...detectReviewSignalCandidates(context));

  const refreshEnrichment = detectRefreshEnrichmentCandidate(context);
  if (refreshEnrichment) candidates.push(refreshEnrichment);

  const refreshIntelligence = detectRefreshIntelligenceCandidate(context);
  if (refreshIntelligence) candidates.push(refreshIntelligence);

  const research = detectResearchCandidate(context);
  if (research) candidates.push(research);

  return candidates;
}

