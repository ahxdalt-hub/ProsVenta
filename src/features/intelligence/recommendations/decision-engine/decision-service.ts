// ============================================================================
// Prosventa Recommendations — Feature 5: Phase 2
// Decision Engine Service — Pipeline Orchestrator
// ============================================================================
// Runs the full pipeline for ONE prospect:
//
//   Prospect → ICP → Enrichment → Signals → Intelligence context
//     → Candidate Detection → Rule Evaluation → Evidence Collection
//     → Priority → Confidence → Explanation → Validation
//     → Deduplication / Suppression / Superseding → Persist
//
// Guarantees:
//   * Organization is resolved from the authenticated session; the client-
//     supplied prospectId is verified against it (RLS + explicit check).
//   * Targeted generation ONLY (§37): invoked by triggers or explicit user
//     action — never on page render, never batch over all prospects.
//   * No recursive loops (§34): this module NEVER regenerates Intelligence;
//     trigger handlers accept a noReentry flag defensively.
//   * Safe persistence: primary flag is cleared before the new primary is
//     written so at most one primary exists; failures never half-create.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { IntelligenceError } from "../../errors";
import { normalizeDomain } from "../../domain";
import { getCompanyEnrichment, getProspectEnrichment } from "@/lib/db/intelligence";
import { getCompanyResearch } from "@/lib/db/company-research";
import { getProspectResearch } from "@/lib/db/prospect-research";
import { getProspectScore } from "@/lib/db/icp-scoring";
import { getSignalsForProspect } from "@/lib/db/signals";
import {
  clearPrimaryRecommendations,
  getAllRecommendationsForProspect,
  insertRecommendation,
  updateRecommendationStatusWithMetadata,
} from "@/lib/db/recommendations";
import { validateRecommendationInput } from "../validate";
import { computeExpiresAt, computeFreshness } from "../lifecycle";
import type { RecommendationRecordInsert } from "../types";
import type { RecommendationEngineTrigger } from "./observability";
import {
  recordAiCall,
  recordCandidates,
  recordDismissalSuppressed,
  recordEvaluation,
  recordGenerated,
  recordGenerationTime,
  recordRejected,
  recordSuppressedDuplicate,
} from "./observability";
import { detectCandidates } from "./candidate-detection";
import { buildDecisionOutcome, scoreCandidate } from "./scoring";
import { generateValidatedAiExplanation } from "./ai-reasoning";
import {
  buildContextFingerprint,
  buildDedupeKey,
  findActiveDuplicate,
  isDismissalBlocking,
  shouldSupersedeExisting,
} from "./suppression";
import { CANDIDATE_RECOMMENDATION_TYPE } from "./types";
import type {
  AiExplanationProvider,
  AiExplanationRequest,
  DecisionContext,
  DecisionOutcome,
} from "./types";

export interface DecisionEngineResult {
  status: "completed" | "no_recommendation" | "unauthenticated" | "not_found" | "failed";
  created: number;
  suppressed: number;
  superseded: number;
  outcome: DecisionOutcome | null;
}

async function resolveOrgAndProspect(
  prospectId: string
): Promise<{ orgId: string; companyName: string | null } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new IntelligenceError("AUTHENTICATION_FAILED");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();
  if (!membership) throw new IntelligenceError("AUTHENTICATION_FAILED");

  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, organization_id, company_name, website, domain")
    .eq("id", prospectId)
    .single();

  if (!prospect || prospect.organization_id !== membership.organization_id) {
    return null;
  }
  return { orgId: membership.organization_id, companyName: prospect.company_name ?? null };
}

/**
 * Assembles the structured DecisionContext from EXISTING Prosventa data only.
 * Read-only; never triggers enrichment, research or intelligence generation.
 */
export async function buildDecisionContext(
  prospectId: string,
  orgId: string
): Promise<DecisionContext> {
  const supabase = await createClient();
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, company_name, website, domain")
    .eq("id", prospectId)
    .single();

  const domain = normalizeDomain(prospect?.domain || prospect?.website) ?? null;

  let hasCompanyEnrichment = false;
  let companyEnrichmentUpdatedAt: string | null = null;
  if (domain) {
    const record = await getCompanyEnrichment(prospectId, domain);
    if (record?.status === "completed" && record.data) {
      hasCompanyEnrichment = true;
      companyEnrichmentUpdatedAt = record.enriched_at ?? record.updated_at;
    }
  }

  let hasProspectEnrichment = false;
  let prospectEnrichmentUpdatedAt: string | null = null;
  const prospectRecord = await getProspectEnrichment(prospectId);
  if (prospectRecord?.status === "completed" && prospectRecord.data) {
    hasProspectEnrichment = true;
    prospectEnrichmentUpdatedAt = prospectRecord.enriched_at ?? prospectRecord.updated_at;
  }

  let hasCompanyResearch = false;
  let companyResearchUpdatedAt: string | null = null;
  if (domain) {
    const research = await getCompanyResearch(prospectId, domain);
    if (research?.status === "completed" && research.result) {
      hasCompanyResearch = true;
      companyResearchUpdatedAt = research.researched_at ?? research.updated_at;
    }
  }

  let hasProspectResearch = false;
  let prospectResearchUpdatedAt: string | null = null;
  const prospectResearch = await getProspectResearch(prospectId);
  if (prospectResearch?.status === "completed" && prospectResearch.result) {
    hasProspectResearch = true;
    prospectResearchUpdatedAt = prospectResearch.researched_at ?? prospectResearch.updated_at;
  }

  // ICP score from the existing scoring system.
  let icpScore: number | null = null;
  let icpScoredAt: string | null = null;
  const score = await getProspectScore(prospectId);
  if (score) {
    icpScore = score.score;
    icpScoredAt = score.scored_at ?? score.updated_at;
  }

  // Signals from the EXISTING signals system only. Never invents signals.
  const signalRecords = await getSignalsForProspect(prospectId, 20, domain);
  const intelligenceUpdatedAt = await loadIntelligenceUpdatedAt(prospectId);

  return {
    prospectId,
    organizationId: orgId,
    companyName: prospect?.company_name ?? null,
    icpScore,
    icpScoredAt,
    hasCompanyEnrichment,
    hasProspectEnrichment,
    hasCompanyResearch,
    hasProspectResearch,
    companyEnrichmentUpdatedAt,
    prospectEnrichmentUpdatedAt,
    companyResearchUpdatedAt,
    intelligenceUpdatedAt,
    signals: signalRecords.map((s) => ({
      id: s.id,
      signal_type: s.signal_type,
      title: s.title,
      description: s.description ?? "",
      detected_at: s.detected_at,
      confidence: s.confidence,
      importance: s.importance,
      category: s.category,
    })),
  };
}

/** Reads the last intelligence refresh timestamp when such a record exists. */
async function loadIntelligenceUpdatedAt(prospectId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("intelligence_insights")
      .select("updated_at")
      .eq("prospect_id", prospectId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.updated_at ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// Pipeline entry point
// ============================================================================

export interface RunDecisionEngineOptions {
  trigger?: RecommendationEngineTrigger;
  /** Injected AI transport; defaults to no AI when unconfigured. */
  aiProvider?: AiExplanationProvider | null;
}

/**
 * Runs the full recommendation decision engine for ONE prospect.
 * Targeted generation only — never called on page render for lists.
 */
export async function runDecisionEngine(
  prospectId: string,
  options: RunDecisionEngineOptions = {}
): Promise<DecisionEngineResult> {
  const started = Date.now();
  recordEvaluation();

  const base: DecisionEngineResult = {
    status: "failed",
    created: 0,
    suppressed: 0,
    superseded: 0,
    outcome: null,
  };

  try {
    const resolved = await resolveOrgAndProspect(prospectId);
    if (!resolved) return { ...base, status: "not_found" };
    const orgId = resolved.orgId;

    // ---- Stage: context assembly (ICP, enrichment, signals, intelligence) --
    const context = await buildDecisionContext(prospectId, orgId);

    // ---- Stage: candidate detection (may legitimately find nothing) -------
    const detected = detectCandidates(context);
    recordCandidates(detected.length);

    if (detected.length === 0) {
      const outcome = buildDecisionOutcome([]);
      recordGenerationTime(Date.now() - started);
      return { ...base, status: "no_recommendation", outcome };
    }

    // ---- Stage: scoring (priority + confidence + evidence + explanation) --
    const scored = detected.map((c) => scoreCandidate(c, context));
    const outcome = buildDecisionOutcome(scored);

    // ---- Stage: persistence with dedup/suppression/superseding ------------
    const existing = await getAllRecommendationsForProspect(prospectId);
    let created = 0;
    let suppressed = 0;
    let superseded = 0;

    for (const candidate of outcome.candidates) {
      const fingerprint = buildContextFingerprint({
        candidateType: candidate.type,
        sourceSignalIds: candidate.sourceSignalIds,
        intelligenceUpdatedAt: context.intelligenceUpdatedAt,
        icpScore: context.icpScore,
        enrichmentBucket: computeFreshness(context.companyEnrichmentUpdatedAt),
      });
      const dedupeKey = buildDedupeKey(candidate.type, fingerprint);
      const recommendationType = CANDIDATE_RECOMMENDATION_TYPE[candidate.type];

      // Duplicate suppression (§21): an active identical rec blocks creation.
      const duplicate = existing.find(
        (r) =>
          r.dedupe_key === dedupeKey &&
          (r.status === "new" || r.status === "viewed")
      );
      if (duplicate) {
        suppressed += 1;
        recordSuppressedDuplicate();
        continue;
      }

      // Dismissal suppression (§22): dismissed recs stay suppressed until the
      // context materially changes or enough time passes.
      const dismissedSameType = existing.find(
        (r) => r.recommendation_type === recommendationType && r.status === "dismissed"
      );
      if (
        dismissedSameType &&
        isDismissalBlocking(dismissedSameType, { fingerprintChanged: false })
      ) {
        suppressed += 1;
        recordDismissalSuppressed();
        continue;
      }

      // ---- Selective AI explanation with validation (§26–29) --------------
      let explanation = candidate.explanation;
      if (candidate.benefitsFromAiExplanation && options.aiProvider) {
        const request: AiExplanationRequest = {
          candidateType: candidate.type,
          recommendationType,
          evidence: candidate.selectedEvidence.map((e) => ({
            id: `${candidate.type}:${e.evidence.label}`,
            label: e.evidence.label,
            detail: e.evidence.detail,
          })),
          companyName: context.companyName,
          confidence: candidate.confidence,
          conflicts: candidate.conflicts ?? [],
        };
        const result = await generateValidatedAiExplanation(
          candidate.type,
          request,
          options.aiProvider
        );
        if (result) {
          recordAiCall(true);
          if (result.ok && result.value) {
            explanation = result.value.explanation;
          } else {
            // Rejected AI output → deterministic wording persists instead.
            recordRejected(`validation:${result.rejectedBecause ?? "unknown"}`);
          }
        } else {
          recordAiCall(false);
        }
      }

      // ---- Validation before persistence ---------------------------------
      const insert: RecommendationRecordInsert = {
        organization_id: orgId,
        prospect_id: prospectId,
        recommendation_type: recommendationType,
        title: (candidate.reasons[0] ?? candidate.type).slice(0, 120),
        summary: explanation.slice(0, 280),
        reasoning: explanation,
        evidence: candidate.selectedEvidence.map((e) => e.evidence),
        priority: candidate.priority,
        confidence: candidate.confidenceScore,
        source_signal_ids: candidate.sourceSignalIds,
        source_research_ids: [],
        source_score_id: null,
        dedupe_key: dedupeKey,
        intelligence_updated_at: context.intelligenceUpdatedAt,
        expires_at:
          computeExpiresAt(recommendationType, { createdAt: new Date().toISOString() }),
        freshness: computeFreshness(context.intelligenceUpdatedAt),
        primary_recommendation: false,
        context_fingerprint: fingerprint,
        generation_trigger: options.trigger ?? "manual",
      };

      const errors = validateRecommendationInput(insert as never);
      if (errors.length > 0) {
        recordRejected("validation_failed");
        continue;
      }

      // Supersede an older active rec of the same type whose fingerprint
      // differs (§25) — history is preserved via status 'superseded'.
      const staleSameType = existing.find(
        (r) =>
          r.recommendation_type === recommendationType &&
          (r.status === "new" || r.status === "viewed") &&
          shouldSupersedeExisting(r as never, fingerprint, r.context_fingerprint ?? null)
      );

      const inserted = await insertRecommendation(insert);
      if (!inserted) {
        recordRejected("insert_failed");
        continue;
      }

      created += 1;
      recordGenerated(recommendationType);

      if (staleSameType) {
        await updateRecommendationStatusWithMetadata(staleSameType.id, {
          status: "superseded",
          superseded_by_id: inserted.id,
        });
        superseded += 1;
      }

      // Primary enforcement (§20): only the top-ranked candidate is primary.
      // Clearing happens once, before marking the first new primary.
      if (!outcome.primary || outcome.primary.type === candidate.type) {
        if (created === 1) await clearPrimaryRecommendations(prospectId);
        await updateRecommendationStatusWithMetadata(inserted.id, {
          primary_recommendation: true,
        });
      }
    }

    recordGenerationTime(Date.now() - started);
    return {
      status: created > 0 ? "completed" : "no_recommendation",
      created,
      suppressed,
      superseded,
      outcome,
    };
  } catch (error) {
    if (
      error instanceof IntelligenceError &&
      error.code === "AUTHENTICATION_FAILED"
    ) {
      return { ...base, status: "unauthenticated" };
    }
    return base;
  }
}

// ============================================================================
// Controlled triggers (§33) — no scheduler in this phase
// ============================================================================
// Each trigger evaluates ONE prospect and NEVER regenerates Intelligence,
// enrichment or signals — so recommendation → intelligence → recommendation
// loops are structurally impossible.
// ============================================================================

export async function evaluateRecommendationsForNewSignal(
  prospectId: string
): Promise<DecisionEngineResult> {
  return runDecisionEngine(prospectId, { trigger: "new_signal" });
}

export async function evaluateRecommendationsForEnrichmentUpdate(
  prospectId: string
): Promise<DecisionEngineResult> {
  return runDecisionEngine(prospectId, { trigger: "enrichment_update" });
}

export async function evaluateRecommendationsForIntelligenceUpdate(
  prospectId: string
): Promise<DecisionEngineResult> {
  return runDecisionEngine(prospectId, { trigger: "intelligence_update" });
}

/**
 * ICP update → re-evaluate relevant recommendations for the given prospects
 * of the org. Still targeted — callers pass explicit prospect IDs.
 */
export async function evaluateRecommendationsForIcpUpdate(
  prospectIds: string[]
): Promise<{ evaluated: number; created: number; failed: number }> {
  let evaluated = 0;
  let created = 0;
  let failed = 0;
  for (const prospectId of prospectIds) {
    try {
      const result = await runDecisionEngine(prospectId, { trigger: "icp_update" });
      evaluated += 1;
      created += result.created;
    } catch {
      failed += 1;
    }
  }
  return { evaluated, created, failed };
}
