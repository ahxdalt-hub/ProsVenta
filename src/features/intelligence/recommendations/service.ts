// ============================================================================
// Prosventa Intelligence Recommendations — Service
// Stage 4 — Phase 8: Intelligence Recommendations
// ============================================================================
// Server-side boundary for recommendation operations. UI components never
// call the recommendation engine directly — they go through this service.
//
// Authorization is resolved server-side from the authenticated user's
// organization membership. The client-supplied prospectId is never trusted
// to determine workspace access.
//
// IMPORTANT:
//  - Does NOT regenerate recommendations on every page load.
//  - One explicit user action produces one recommendation operation.
//  - Recommendations are generated after meaningful intelligence updates.
//  - Deduplication prevents identical recommendations from accumulating.
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { IntelligenceError, toIntelligenceError } from "../errors";
import { normalizeDomain } from "../domain";
import { recordIntelligenceUsage } from "@/lib/db/intelligence";
import { getCompanyEnrichment, getProspectEnrichment } from "@/lib/db/intelligence";
import { getCompanyResearch } from "@/lib/db/company-research";
import { getProspectResearch } from "@/lib/db/prospect-research";
import { getProspectScore } from "@/lib/db/icp-scoring";
import { getSignalsForProspect } from "@/lib/db/signals";
import {
  getRecommendationsForProspect,
  getRecentRecommendationsForWorkspace,
  insertRecommendation,
  recommendationExists,
  updateRecommendationStatusWithMetadata,
} from "@/lib/db/recommendations";
import { generateRecommendations } from "./engine";
import { validateAndFilterRecommendations } from "./validate";
import {
  buildSupersedeUpdate,
  computeExpiresAt,
  computeFreshness,
} from "./lifecycle";
import { canTransitionStatus } from "./types";
import type {
  RecommendationContext,
  RecommendationDismissalReason,
  RecommendationOperationResult,
  RecommendationRecord,
  RecommendationRecordInsert,
  RecommendationRecordUpdate,
  RecommendationSignalContext,
} from "./types";
import { RECOMMENDATION_TYPE_CATEGORIES } from "./types";

// ============================================================================
// Authorization Helper
// ============================================================================

async function getOrgAndUser(): Promise<{ orgId: string; userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new IntelligenceError("AUTHENTICATION_FAILED");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) throw new IntelligenceError("AUTHENTICATION_FAILED");

  return { orgId: membership.organization_id, userId: user.id };
}

// ============================================================================
// Context Builder
// ============================================================================
// Gathers available prospect + company data from existing Prosventa data.
// Only relevant intelligence is included — never the entire database.
// ============================================================================

async function buildRecommendationContext(
  prospectId: string,
  orgId: string
): Promise<RecommendationContext> {
  const supabase = await createClient();

  // Resolve the prospect server-side to verify workspace authorization.
  const { data: prospect } = await supabase
    .from("prospects")
    .select(
      "id, organization_id, company_name, name, website, domain, contact_name, contact_email"
    )
    .eq("id", prospectId)
    .single();

  if (!prospect) {
    throw new IntelligenceError("NOT_FOUND");
  }

  // Verify the prospect belongs to the authenticated user's org.
  if (prospect.organization_id !== orgId) {
    throw new IntelligenceError("AUTHENTICATION_FAILED");
  }

  const domain = normalizeDomain(prospect.domain || prospect.website) ?? null;

  // Load company enrichment data when available.
  let hasCompanyEnrichment = false;
  let companyEnrichmentUpdatedAt: string | null = null;
  if (domain) {
    const enrichmentRecord = await getCompanyEnrichment(prospectId, domain);
    if (enrichmentRecord?.status === "completed" && enrichmentRecord.data) {
      hasCompanyEnrichment = true;
      companyEnrichmentUpdatedAt = enrichmentRecord.enriched_at ?? enrichmentRecord.updated_at;
    }
  }

  // Load prospect enrichment data when available.
  let hasProspectEnrichment = false;
  let prospectEnrichmentUpdatedAt: string | null = null;
  const prospectEnrichmentRecord = await getProspectEnrichment(prospectId);
  if (prospectEnrichmentRecord?.status === "completed" && prospectEnrichmentRecord.data) {
    hasProspectEnrichment = true;
    prospectEnrichmentUpdatedAt = prospectEnrichmentRecord.enriched_at ?? prospectEnrichmentRecord.updated_at;
  }

  // Load company research when available.
  let hasCompanyResearch = false;
  let companyResearchUpdatedAt: string | null = null;
  if (domain) {
    const researchRecord = await getCompanyResearch(prospectId, domain);
    if (researchRecord?.status === "completed" && researchRecord.result) {
      hasCompanyResearch = true;
      companyResearchUpdatedAt = researchRecord.researched_at ?? researchRecord.updated_at;
    }
  }

  // Load prospect research when available.
  let hasProspectResearch = false;
  let prospectResearchUpdatedAt: string | null = null;
  const prospectResearchRecord = await getProspectResearch(prospectId);
  if (prospectResearchRecord?.status === "completed" && prospectResearchRecord.result) {
    hasProspectResearch = true;
    prospectResearchUpdatedAt = prospectResearchRecord.researched_at ?? prospectResearchRecord.updated_at;
  }

  // Load ICP score when available.
  let icpScore: number | null = null;
  const scoreRecord = await getProspectScore(prospectId);
  if (scoreRecord) {
    icpScore = scoreRecord.score;
  }

  // Load recent signals (active only).
  const signalRecords = await getSignalsForProspect(prospectId, 20);
  const signals: RecommendationSignalContext[] = signalRecords.map((s) => ({
    id: s.id,
    signal_type: s.signal_type,
    title: s.title,
    description: s.description,
    detected_at: s.detected_at,
    confidence: s.confidence,
    importance: s.importance,
    category: s.category,
  }));

  // Derive job title from prospect enrichment when available.
  let jobTitle: string | null = null;
  if (hasProspectEnrichment && prospectEnrichmentRecord?.data) {
    jobTitle = (prospectEnrichmentRecord.data as unknown as { jobTitle?: string | null }).jobTitle ?? null;
  }

  return {
    prospectId,
    organizationId: orgId,
    companyName: prospect.company_name || prospect.name || null,
    domain,
    contactName: prospect.contact_name || null,
    contactEmail: prospect.contact_email || null,
    jobTitle,
    icpScore,
    hasCompanyEnrichment,
    hasProspectEnrichment,
    hasCompanyResearch,
    hasProspectResearch,
    signals,
    companyEnrichmentUpdatedAt,
    prospectEnrichmentUpdatedAt,
    companyResearchUpdatedAt,
    prospectResearchUpdatedAt,
  };
}

// ============================================================================
// Usage Tracking
// ============================================================================

async function trackUsage(
  orgId: string,
  userId: string,
  status: "pending" | "completed" | "failed"
) {
  await recordIntelligenceUsage({
    organization_id: orgId,
    user_id: userId,
    operation: "signals",
    provider: "recommendations",
    status,
  });
}

// ============================================================================
// Recommendation Generation Operation
// ============================================================================

/**
 * Generates and stores recommendations for a prospect.
 *
 * Authorization:
 *  - authenticated user
 *  - workspace membership (resolved server-side)
 *  - prospect belongs to user's org
 *
 * Generation:
 *  - Uses deterministic rules based on existing intelligence.
 *  - Does NOT call AI in this phase.
 *  - Does NOT regenerate on every page load — one explicit action.
 *
 * Deduplication:
 *  - The same recommendation must not appear repeatedly.
 *  - A stable dedupe key is built from type + source intelligence.
 */
export async function generateRecommendationsForProspect(
  prospectId: string
): Promise<RecommendationOperationResult> {
  try {
    const { orgId, userId } = await getOrgAndUser();

    // Resolve the prospect server-side to verify workspace authorization.
    const supabase = await createClient();
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, organization_id")
      .eq("id", prospectId)
      .single();

    if (!prospect) {
      return { status: "failed", message: "Prospect not found.", created: 0, duplicates: 0 };
    }

    if (prospect.organization_id !== orgId) {
      return { status: "failed", message: "You do not have access to this prospect.", created: 0, duplicates: 0 };
    }

    // Build the recommendation context from available intelligence.
    const context = await buildRecommendationContext(prospectId, orgId);

    // Run the deterministic recommendation engine.
    const rawRecommendations = generateRecommendations(context);

    // Validate & filter.
    const validRecommendations = validateAndFilterRecommendations(rawRecommendations);
    if (validRecommendations.length === 0) {
      return {
        status: "completed",
        message: "No new recommendations to make based on current intelligence.",
        created: 0,
        duplicates: 0,
      };
    }

    // Track usage — one explicit user action produces one generation operation.
    await trackUsage(orgId, userId, "pending");

    // Deduplicate & insert.
    let created = 0;
    let duplicates = 0;

    for (const rec of validRecommendations) {
      const exists = await recommendationExists(orgId, rec.dedupe_key);
      if (exists) {
        duplicates++;
        continue;
      }

      const record: RecommendationRecordInsert = {
        organization_id: orgId,
        prospect_id: prospectId,
        recommendation_type: rec.recommendation_type,
        title: rec.title,
        summary: rec.summary,
        reasoning: rec.reasoning,
        evidence: rec.evidence,
        priority: rec.priority,
        confidence: rec.confidence,
        status: "new",
        source_signal_ids: rec.source_signal_ids ?? [],
        source_research_ids: rec.source_research_ids ?? [],
        source_score_id: rec.source_score_id ?? null,
        dedupe_key: rec.dedupe_key,
        intelligence_updated_at: rec.intelligence_updated_at ?? null,
        // --- Feature 5 Phase 1 foundation fields ---
        recommendation_category: RECOMMENDATION_TYPE_CATEGORIES[rec.recommendation_type],
        source_type: rec.source_type ?? "intelligence",
        intelligence_insight_id: rec.intelligence_insight_id ?? null,
        freshness: computeFreshness(rec.intelligence_updated_at),
        expires_at: computeExpiresAt(rec.recommendation_type),
      };

      const inserted = await insertRecommendation(record);
      if (inserted) {
        created++;
        // Stage 7 Phase 2: recommendation.generated → trigger engine. This
        // replaces the previous direct triggerIntelligenceWorkflows call so
        // recommendation workflows run through the audited event pipeline
        // (legacy `recommendation_created` workflows still match via the
        // registry mapping). Loop protection lives in the trigger engine.
        try {
          const { safeEmitWorkflowEvent } = await import(
            "@/features/intelligence/workflows/triggers/emit"
          );
          safeEmitWorkflowEvent({
            eventType: "recommendation.generated",
            organizationId: orgId,
            targetType: "recommendation",
            targetId: inserted.id,
            payload: {
              prospect_id: prospectId,
              recommendation_id: inserted.id,
              recommendation_type: rec.recommendation_type ?? null,
              priority: rec.priority ?? null,
              company_name: context.companyName ?? null,
            },
            dedupeKey: `recommendation.generated:${inserted.id}`,
          });
        } catch (err) {
          console.error("[recommendations] Event emission failed:", err);
        }
      }
    }

    await trackUsage(orgId, userId, "completed");

    return {
      status: "completed",
      message:
        created > 0
          ? `Generated ${created} recommendation${created === 1 ? "" : "s"}.`
          : "No new recommendations were generated.",
      created,
      duplicates,
    };
  } catch (error) {
    const intelError = toIntelligenceError(error, "recommendations");
    return {
      status: "failed",
      message: intelError.message,
      created: 0,
      duplicates: 0,
    };
  }
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Returns stored recommendations for a prospect without regenerating.
 * Used for cached display on page load. Returns [] when none exist.
 */
export async function getRecommendationsForProspectDisplay(
  prospectId: string
): Promise<RecommendationRecord[]> {
  try {
    const { orgId } = await getOrgAndUser();

    const supabase = await createClient();
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, organization_id")
      .eq("id", prospectId)
      .single();

    if (!prospect || prospect.organization_id !== orgId) {
      return [];
    }

    return await getRecommendationsForProspect(prospectId);
  } catch {
    return [];
  }
}

/**
 * Returns recent recommendations for the user's workspace.
 * Used for a compact "Recommended Actions" display.
 */
export async function getRecentRecommendationsForWorkspaceDisplay(
  limit = 10
): Promise<RecommendationRecord[]> {
  try {
    await getOrgAndUser();
    // RLS already scopes to the user's org.
    return await getRecentRecommendationsForWorkspace(limit);
  } catch {
    return [];
  }
}

// ============================================================================
// Status Operations — Feature 5 Phase 1 lifecycle
// ============================================================================
// All status changes go through the deterministic transition guard. No
// external action is ever executed: "accept" only records that the user agrees
// the recommendation is useful.
// ============================================================================

/** Loads a recommendation with org-ownership verification. */
async function loadOwnedRecommendation(
  recommendationId: string,
  orgId: string
): Promise<RecommendationRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendations")
    .select("*")
    .eq("id", recommendationId)
    .single();

  if (!data || (data as RecommendationRecord).organization_id !== orgId) {
    return null;
  }
  return data as RecommendationRecord;
}

/**
 * Generic, transition-guarded status update for workspace members.
 * Returns false when the recommendation does not exist in the caller's org or
 * when the transition is not allowed by the lifecycle rules.
 */
export async function updateRecommendationStatusForWorkspace(
  recommendationId: string,
  status: RecommendationRecord["status"]
): Promise<boolean> {
  try {
    const { orgId } = await getOrgAndUser();
    const recommendation = await loadOwnedRecommendation(recommendationId, orgId);
    if (!recommendation) return false;

    if (!canTransitionStatus(recommendation.status, status)) return false;

    const updates: RecommendationRecordUpdate = { status };
    if (status === "viewed" && !recommendation.viewed_at) {
      updates.viewed_at = new Date().toISOString();
    }
    if (status === "accepted") {
      updates.accepted_at = new Date().toISOString();
      if (!recommendation.viewed_at) updates.viewed_at = new Date().toISOString();
    }
    if (status === "dismissed") {
      updates.dismissed_at = new Date().toISOString();
    }

    return await updateRecommendationStatusWithMetadata(recommendationId, updates);
  } catch {
    return false;
  }
}

/**
 * Marks a recommendation as viewed (implicit on open). Idempotent — keeps the
 * first viewed_at timestamp.
 */
export async function viewRecommendationForWorkspace(recommendationId: string): Promise<boolean> {
  return updateRecommendationStatusForWorkspace(recommendationId, "viewed");
}

/**
 * Accepts a recommendation: the user agrees it is useful. This does NOT execute
 * any external workflow — execution belongs to the future Automation feature.
 */
export async function acceptRecommendationForWorkspace(recommendationId: string): Promise<boolean> {
  return updateRecommendationStatusForWorkspace(recommendationId, "accepted");
}

/**
 * Dismisses a recommendation with optional lightweight feedback metadata.
 * The reason is never required — dismissal must stay one click.
 */
export async function dismissRecommendationForWorkspace(
  recommendationId: string,
  reason?: RecommendationDismissalReason,
  feedback?: string
): Promise<boolean> {
  try {
    const { orgId } = await getOrgAndUser();
    const recommendation = await loadOwnedRecommendation(recommendationId, orgId);
    if (!recommendation) return false;

    if (!canTransitionStatus(recommendation.status, "dismissed")) return false;

    return await updateRecommendationStatusWithMetadata(recommendationId, {
      status: "dismissed",
      dismissed_at: new Date().toISOString(),
      ...(reason ? { dismissal_reason: reason } : {}),
      ...(feedback && feedback.trim().length > 0 ? { feedback: feedback.trim() } : {}),
    });
  } catch {
    return false;
  }
}

/**
 * Deterministic expiry sweep: transitions active recommendations whose
 * expires_at has passed into 'expired'. NO AI calls — pure timestamp logic.
 * Returns the number of expired recommendations.
 */
export async function expireStaleRecommendationsForWorkspace(): Promise<number> {
  try {
    const { orgId } = await getOrgAndUser();
    const supabase = await createClient();

    const { data: active } = await supabase
      .from("recommendations")
      .select("id, status, expires_at")
      .eq("organization_id", orgId)
      .in("status", ["new", "viewed"])
      .not("expires_at", "is", null);

    if (!active) return 0;

    const now = Date.now();
    let expiredCount = 0;
    for (const row of active as Array<Pick<RecommendationRecord, "id" | "status" | "expires_at">>) {
      if (!row.expires_at) continue;
      const expiry = new Date(row.expires_at).getTime();
      if (Number.isNaN(expiry) || now < expiry) continue;
      if (!canTransitionStatus(row.status, "expired")) continue;

      const ok = await updateRecommendationStatusWithMetadata(row.id, {
        status: "expired",
        freshness: "expired",
      });
      if (ok) expiredCount++;
    }
    return expiredCount;
  } catch {
    return 0;
  }
}

/**
 * Supersedes an old recommendation when newer evidence invalidates it.
 * History is preserved: the old row remains with status 'superseded' and a
 * pointer to the replacement — it is never deleted.
 */
export async function supersedeRecommendationForWorkspace(
  oldRecommendationId: string,
  newRecommendationId: string
): Promise<boolean> {
  try {
    const { orgId } = await getOrgAndUser();
    const [oldRec, newRec] = await Promise.all([
      loadOwnedRecommendation(oldRecommendationId, orgId),
      loadOwnedRecommendation(newRecommendationId, orgId),
    ]);
    if (!oldRec || !newRec) return false;

    const update = buildSupersedeUpdate(newRecommendationId);
    if (!canTransitionStatus(oldRec.status, update.status)) return false;

    return await updateRecommendationStatusWithMetadata(oldRecommendationId, update);
  } catch {
    return false;
  }
}