// ============================================================================
// Prosventa Intelligence Recommendations — Deterministic Engine
// Stage 4 — Phase 8: Intelligence Recommendations
// ============================================================================
// Produces evidence-based, explainable recommendations from existing
// intelligence data. Uses deterministic rules where possible.
//
// IMPORTANT:
//  - This is NOT autonomous sales automation.
//  - Recommendations only suggest what the salesperson may consider doing.
//  - Every recommendation has a reason and traceable evidence.
//  - OBSERVED vs INFERENCE vs RECOMMENDATION are kept distinct.
//  - Does NOT create recommendations simply to increase feature count.
// ============================================================================

import type {
  RecommendationContext,
  RecommendationEvidence,
  RecommendationInput,
  RecommendationPriority,
  RecommendationSignalContext,
} from "./types";
import { buildRecommendationDedupeKey } from "./validate";

// ============================================================================
// Thresholds
// ============================================================================
const HIGH_FIT_SCORE = 85;
const STRONG_FIT_SCORE = 75;
const STALE_DAYS = 180;
const RECENT_SIGNAL_DAYS = 30;

// ============================================================================
// Helper: Freshness
// ============================================================================

function daysSince(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  const date = new Date(dateString).getTime();
  if (Number.isNaN(date)) return null;
  return Math.floor((Date.now() - date) / (24 * 60 * 60 * 1000));
}

function isStale(dateString: string | null | undefined): boolean {
  const days = daysSince(dateString);
  return days !== null && days >= STALE_DAYS;
}

function formatDaysAgo(dateString: string | null | undefined): string | null {
  const days = daysSince(dateString);
  if (days === null) return null;
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

// ============================================================================
// Signal Helpers
// ============================================================================

function isMeaningfulSignal(signal: RecommendationSignalContext): boolean {
  // Only signals with real business relevance generate recommendations.
  // Prosventa activity signals (imported, enriched) do NOT generate
  // recommendations — they are product events, not business events.
  if (signal.category === "prosventa_activity") return false;

  // Low importance signals are not meaningful enough for recommendations.
  if (signal.importance === "low") return false;

  return true;
}

function isRecentSignal(signal: RecommendationSignalContext): boolean {
  const detected = new Date(signal.detected_at).getTime();
  if (Number.isNaN(detected)) return false;
  return (Date.now() - detected) < RECENT_SIGNAL_DAYS * 24 * 60 * 60 * 1000;
}

// ============================================================================
// Evidence Builders
// ============================================================================

function icpScoreEvidence(context: RecommendationContext): RecommendationEvidence[] {
  if (context.icpScore === null) return [];
  return [{
    type: "icp_score",
    label: `ICP score: ${context.icpScore}`,
    detail: `The prospect matches ${context.icpScore}% of the configured ICP criteria.`,
    sourceId: null,
    retrievedAt: null,
  }];
}

function signalEvidence(signal: RecommendationSignalContext): RecommendationEvidence {
  return {
    type: "signal",
    label: signal.title,
    detail: `${signal.description} (detected ${formatDaysAgo(signal.detected_at) ?? "recently"}).`,
    sourceId: signal.id,
    retrievedAt: signal.detected_at,
  };
}

function researchEvidence(context: RecommendationContext, type: "company" | "prospect"): RecommendationEvidence[] {
  if (type === "company" && context.hasCompanyResearch && context.companyResearchUpdatedAt) {
    return [{
      type: "company_research",
      label: "Company research available",
      detail: `Company research was performed ${formatDaysAgo(context.companyResearchUpdatedAt) ?? "recently"}.`,
      sourceId: null,
      retrievedAt: context.companyResearchUpdatedAt,
    }];
  }
  if (type === "prospect" && context.hasProspectResearch && context.prospectResearchUpdatedAt) {
    return [{
      type: "prospect_research",
      label: "Prospect research available",
      detail: `Prospect research was performed ${formatDaysAgo(context.prospectResearchUpdatedAt) ?? "recently"}.`,
      sourceId: null,
      retrievedAt: context.prospectResearchUpdatedAt,
    }];
  }
  return [];
}

function enrichmentEvidence(context: RecommendationContext, type: "company" | "prospect"): RecommendationEvidence[] {
  if (type === "company" && context.hasCompanyEnrichment && context.companyEnrichmentUpdatedAt) {
    return [{
      type: "company_enrichment",
      label: "Company enrichment available",
      detail: `Company data was enriched ${formatDaysAgo(context.companyEnrichmentUpdatedAt) ?? "recently"}.`,
      sourceId: null,
      retrievedAt: context.companyEnrichmentUpdatedAt,
    }];
  }
  if (type === "prospect" && context.hasProspectEnrichment && context.prospectEnrichmentUpdatedAt) {
    return [{
      type: "prospect_enrichment",
      label: "Prospect enrichment available",
      detail: `Prospect data was enriched ${formatDaysAgo(context.prospectEnrichmentUpdatedAt) ?? "recently"}.`,
      sourceId: null,
      retrievedAt: context.prospectEnrichmentUpdatedAt,
    }];
  }
  return [];
}

// ============================================================================
// Confidence & Priority Helpers
// ============================================================================

function deriveConfidence(evidenceCount: number, hasStrongSignal: boolean, hasHighScore: boolean): number {
  let base = 40;
  if (evidenceCount >= 3) base += 20;
  else if (evidenceCount >= 2) base += 10;
  if (hasStrongSignal) base += 15;
  if (hasHighScore) base += 15;
  return Math.min(95, Math.max(30, base));
}

function derivePriority(
  icpScore: number | null,
  hasRecentMeaningfulSignal: boolean,
  signalImportance: string | null
): RecommendationPriority {
  // High priority: strong ICP fit + recent meaningful signal.
  if (icpScore !== null && icpScore >= HIGH_FIT_SCORE && hasRecentMeaningfulSignal) {
    return "high";
  }
  // Medium: either strong fit OR recent meaningful signal with critical/high importance.
  if (icpScore !== null && icpScore >= STRONG_FIT_SCORE) {
    return "medium";
  }
  if (hasRecentMeaningfulSignal && (signalImportance === "critical" || signalImportance === "high")) {
    return "medium";
  }
  return "low";
}

// ============================================================================
// Recommendation Rules
// ============================================================================

/**
 * Deterministic recommendation engine.
 * Takes structured intelligence context and produces evidence-based
 * recommendations. Returns an empty array when no meaningful recommendations
 * can be made.
 */
export function generateRecommendations(context: RecommendationContext): RecommendationInput[] {
  const recommendations: RecommendationInput[] = [];

  const meaningfulSignals = context.signals.filter(isMeaningfulSignal);
  const recentSignals = meaningfulSignals.filter(isRecentSignal);
  const hasRecentMeaningfulSignal = recentSignals.length > 0;

  const companyName = context.companyName || context.domain || "This company";
  const contactName = context.contactName || "This prospect";
  const icpScore = context.icpScore;

  // ========================================================================
  // RULE 1: High ICP fit + recent signal → review prospect/company
  // ========================================================================
  if (icpScore !== null && icpScore >= HIGH_FIT_SCORE && recentSignals.length > 0) {
    const primarySignal = recentSignals[0];
    const signalIsLeadership = primarySignal.signal_type === "leadership_change";
    const evidence = [
      ...icpScoreEvidence(context),
      signalEvidence(primarySignal),
    ];

    const recType = signalIsLeadership ? "review_leadership_change" : "review_company_signal";
    const title = signalIsLeadership
      ? `Review ${companyName}'s recent leadership change`
      : `Review ${companyName}'s recent signal`;

    const summary = signalIsLeadership
      ? `A recent leadership change may affect how ${companyName} makes decisions. Review the change and current company research before deciding whether outreach is appropriate.`
      : `A recent ${primarySignal.title.toLowerCase()} signal may be relevant. Review the signal and current company context.`;

    const reasoning = signalIsLeadership
      ? `${companyName} matches ${icpScore}% of the configured ICP and a leadership change was recently detected (${primarySignal.title}). This may indicate a change in strategy or decision-making.`
      : `${companyName} matches ${icpScore}% of the configured ICP and a recent ${primarySignal.title.toLowerCase()} was detected. This may indicate increased relevance.`;

    recommendations.push({
      recommendation_type: recType,
      title,
      summary,
      reasoning,
      evidence,
      priority: derivePriority(icpScore, true, primarySignal.importance),
      confidence: deriveConfidence(evidence.length, true, true),
      source_signal_ids: [primarySignal.id],
      dedupe_key: buildRecommendationDedupeKey(
        recType,
        [primarySignal.id],
        [],
        null
      ),
      intelligence_updated_at: primarySignal.detected_at,
    });
  }

  // ========================================================================
  // RULE 2: High ICP fit + no meaningful signal → review high-fit prospect
  // ========================================================================
  if (icpScore !== null && icpScore >= STRONG_FIT_SCORE && !hasRecentMeaningfulSignal) {
    const evidence = icpScoreEvidence(context);

    recommendations.push({
      recommendation_type: "review_high_fit",
      title: `Review ${companyName} — strong ICP fit`,
      summary: `${companyName} matches your ICP well. Review the prospect profile and available intelligence before deciding on next steps.`,
      reasoning: `${companyName} matches ${icpScore}% of the configured ICP. No recent business signals were detected, but the fit is strong enough to warrant review.`,
      evidence,
      priority: icpScore >= HIGH_FIT_SCORE ? "high" : "medium",
      confidence: deriveConfidence(evidence.length, false, true),
      dedupe_key: buildRecommendationDedupeKey("review_high_fit", [], [], null),
      intelligence_updated_at: null,
    });
  }

  // ========================================================================
  // RULE 3: Low ICP fit + strong signal → review signal with caution
  // ========================================================================
  if (icpScore !== null && icpScore < 50 && recentSignals.length > 0) {
    const primarySignal = recentSignals[0];
    const evidence = [
      ...icpScoreEvidence(context),
      signalEvidence(primarySignal),
    ];

    recommendations.push({
      recommendation_type: "review_company_signal",
      title: `Review ${companyName}'s recent signal`,
      summary: `${companyName} recently showed ${primarySignal.title.toLowerCase()}, but the ICP fit is below your typical threshold. Review the signal before deciding whether further effort is worthwhile.`,
      reasoning: `A recent ${primarySignal.title.toLowerCase()} was detected, but ${companyName} only matches ${icpScore}% of the configured ICP. The signal may be worth a brief review, but effort should be proportional to fit.`,
      evidence,
      priority: "low",
      confidence: deriveConfidence(evidence.length, true, false),
      source_signal_ids: [primarySignal.id],
      dedupe_key: buildRecommendationDedupeKey(
        "review_company_signal",
        [primarySignal.id],
        [],
        null
      ),
      intelligence_updated_at: primarySignal.detected_at,
    });
  }

  // ========================================================================
  // RULE 4: Meaningful recent signal without strong score → review signal
  // ========================================================================
  if (icpScore === null && recentSignals.length > 0) {
    const primarySignal = recentSignals[0];
    const evidence = [signalEvidence(primarySignal)];

    recommendations.push({
      recommendation_type: "review_recent_signal",
      title: `Review recent signal for ${companyName}`,
      summary: `A recent ${primarySignal.title.toLowerCase()} was detected for ${companyName}. No ICP score is available yet — review the signal and consider scoring this prospect.`,
      reasoning: `A ${primarySignal.title.toLowerCase()} was recently detected. There is no ICP score yet, so this signal is the primary reason to review.`,
      evidence,
      priority: "low",
      confidence: deriveConfidence(evidence.length, true, false),
      source_signal_ids: [primarySignal.id],
      dedupe_key: buildRecommendationDedupeKey(
        "review_recent_signal",
        [primarySignal.id],
        [],
        null
      ),
      intelligence_updated_at: primarySignal.detected_at,
    });
  }

  // ========================================================================
  // RULE 5: Company research missing → research company
  // ========================================================================
  if (!context.hasCompanyResearch && !!context.domain) {
    const evidence: RecommendationEvidence[] = [
      {
        type: "prospect_data",
        label: "No company research found",
        detail: `${companyName} has not been researched yet.`,
        sourceId: null,
        retrievedAt: null,
      },
    ];
    if (context.hasCompanyEnrichment) {
      evidence.push(...enrichmentEvidence(context, "company"));
    }

    recommendations.push({
      recommendation_type: "research_company",
      title: `Research ${companyName}`,
      summary: `No company research is available for ${companyName}. Running research would provide useful context before any outreach.`,
      reasoning: `${companyName} has a domain (${context.domain}) but no company research has been performed. Research would build a grounded context for sales preparation.`,
      evidence,
      priority: icpScore !== null && icpScore >= STRONG_FIT_SCORE ? "medium" : "low",
      confidence: deriveConfidence(evidence.length, false, false),
      dedupe_key: buildRecommendationDedupeKey("research_company", [], [], null),
      intelligence_updated_at: null,
    });
  }

  // ========================================================================
  // RULE 6: Prospect research missing → research prospect
  // ========================================================================
  if (!context.hasProspectResearch && !!context.contactName) {
    const evidence: RecommendationEvidence[] = [
      {
        type: "prospect_data",
        label: "No prospect research found",
        detail: `${contactName} has not been researched yet.`,
        sourceId: null,
        retrievedAt: null,
      },
    ];

    recommendations.push({
      recommendation_type: "research_prospect",
      title: `Research ${contactName}`,
      summary: `No prospect research is available for ${contactName}. Research would provide useful role context for sales preparation.`,
      reasoning: `${contactName} is a known contact, but no prospect research has been performed. Research would help understand their role and responsibilities.`,
      evidence,
      priority: icpScore !== null && icpScore >= STRONG_FIT_SCORE ? "medium" : "low",
      confidence: deriveConfidence(evidence.length, false, false),
      dedupe_key: buildRecommendationDedupeKey("research_prospect", [], [], null),
      intelligence_updated_at: null,
    });
  }

  // ========================================================================
  // RULE 7: Stale company enrichment → verify missing company info
  // ========================================================================
  if (context.hasCompanyEnrichment && isStale(context.companyEnrichmentUpdatedAt)) {
    const evidence: RecommendationEvidence[] = [
      {
        type: "data_quality",
        label: `Company data ${formatDaysAgo(context.companyEnrichmentUpdatedAt) ?? "stale"}`,
        detail: `Company intelligence was last updated ${formatDaysAgo(context.companyEnrichmentUpdatedAt) ?? "a long time ago"}.`,
        sourceId: null,
        retrievedAt: context.companyEnrichmentUpdatedAt,
      },
    ];

    recommendations.push({
      recommendation_type: "refresh_intelligence",
      title: `Refresh company intelligence for ${companyName}`,
      summary: `Company data for ${companyName} is ${formatDaysAgo(context.companyEnrichmentUpdatedAt) ?? "stale"}. Refreshing would verify the information is still current.`,
      reasoning: `Company intelligence was last refreshed ${formatDaysAgo(context.companyEnrichmentUpdatedAt) ?? "long ago"}. Outdated company data can lead to incorrect outreach decisions.`,
      evidence,
      priority: "low",
      confidence: deriveConfidence(evidence.length, false, false),
      dedupe_key: buildRecommendationDedupeKey("refresh_intelligence", [], [], null),
      intelligence_updated_at: context.companyEnrichmentUpdatedAt,
    });
  }

  // ========================================================================
  // RULE 8: Stale prospect enrichment → verify prospect role
  // ========================================================================
  if (context.hasProspectEnrichment && isStale(context.prospectEnrichmentUpdatedAt)) {
    const evidence: RecommendationEvidence[] = [
      {
        type: "data_quality",
        label: `Prospect data ${formatDaysAgo(context.prospectEnrichmentUpdatedAt) ?? "stale"}`,
        detail: `Prospect intelligence was last updated ${formatDaysAgo(context.prospectEnrichmentUpdatedAt) ?? "a long time ago"}.`,
        sourceId: null,
        retrievedAt: context.prospectEnrichmentUpdatedAt,
      },
    ];

    recommendations.push({
      recommendation_type: "verify_prospect_info",
      title: `Verify ${contactName}'s current role`,
      summary: `The prospect profile for ${contactName} has not been refreshed for over ${STALE_DAYS} days. Verify their current role before outreach.`,
      reasoning: `The prospect profile has not been refreshed for over ${STALE_DAYS} days. Roles change frequently — verifying current information prevents wasted outreach.`,
      evidence,
      priority: "low",
      confidence: deriveConfidence(evidence.length, false, false),
      dedupe_key: buildRecommendationDedupeKey("verify_prospect_info", [], [], null),
      intelligence_updated_at: context.prospectEnrichmentUpdatedAt,
    });
  }

  // ========================================================================
  // RULE 9: No ICP score → complete ICP data
  // ========================================================================
  if (icpScore === null) {
    const evidence: RecommendationEvidence[] = [
      {
        type: "data_quality",
        label: "No ICP score available",
        detail: "This prospect has not been scored against the configured ICP.",
        sourceId: null,
        retrievedAt: null,
      },
    ];

    recommendations.push({
      recommendation_type: "complete_icp_data",
      title: `Score ${companyName} against your ICP`,
      summary: `This prospect has not been scored yet. Scoring would help prioritize whether this prospect deserves attention.`,
      reasoning: `No ICP score exists for ${companyName}. Scoring provides an explainable, evidence-based prioritization for sales effort.`,
      evidence,
      priority: "low",
      confidence: deriveConfidence(evidence.length, false, false),
      dedupe_key: buildRecommendationDedupeKey("complete_icp_data", [], [], null),
      intelligence_updated_at: null,
    });
  }

  // ========================================================================
  // RULE 10: Follow-up opportunity on recent company event
  // Only when there is genuinely meaningful evidence.
  // ========================================================================
  if (icpScore !== null && icpScore >= HIGH_FIT_SCORE && recentSignals.length > 0) {
    const meaningfulEventSignal = recentSignals.find(
      (s) => s.category === "company_change" || s.category === "external_event"
    );

    if (meaningfulEventSignal) {
      const evidence = [
        ...icpScoreEvidence(context),
        signalEvidence(meaningfulEventSignal),
        ...researchEvidence(context, "company"),
      ];

      recommendations.push({
        recommendation_type: "follow_up_company_event",
        title: `Consider reviewing recent ${companyName} event`,
        summary: `${companyName} matches your ICP strongly and a recent ${meaningfulEventSignal.title.toLowerCase()} was detected. Consider whether this event creates a relevant context for outreach.`,
        reasoning: `${companyName} matches ${icpScore}% of the configured ICP and recently experienced ${meaningfulEventSignal.title.toLowerCase()}. This may create a relevant context for a sales conversation — review before deciding.`,
        evidence,
        priority: derivePriority(icpScore, true, meaningfulEventSignal.importance),
        confidence: deriveConfidence(evidence.length, true, true),
        source_signal_ids: [meaningfulEventSignal.id],
        dedupe_key: buildRecommendationDedupeKey(
          "follow_up_company_event",
          [meaningfulEventSignal.id],
          [],
          null
        ),
        intelligence_updated_at: meaningfulEventSignal.detected_at,
      });
    }
  }

  return recommendations;
}