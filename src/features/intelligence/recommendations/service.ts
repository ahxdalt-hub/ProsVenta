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
  updateRecommendationStatus,
} from "@/lib/db/recommendations";
import { generateRecommendations } from "./engine";
import { validateAndFilterRecommendations } from "./validate";
import { triggerIntelligenceWorkflows } from "../workflows/service";
import type {
  RecommendationContext,
  RecommendationOperationResult,
  RecommendationRecord,
  RecommendationRecordInsert,
  RecommendationSignalContext,
} from "./types";

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
      };

      const inserted = await insertRecommendation(record);
      if (inserted) {
        created++;
        // Fire intelligence workflow triggers for new recommendations
        await triggerIntelligenceWorkflows({
          eventId: inserted.id,
          triggerType: "recommendation_created",
          organizationId: orgId,
          prospectId,
          prospectName: context.companyName,
          recommendationId: inserted.id,
          signalId: null,
          scoreId: record.source_score_id ?? null,
          context: {
            icp_score: context.icpScore,
            recommendation_priority: rec.priority,
            recommendation_type: rec.recommendation_type,
            company_name: context.companyName,
            domain: context.domain,
          },
          occurredAt: new Date().toISOString(),
        });
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
// Status Operations
// ============================================================================

/**
 * Updates a recommendation's status (new/reviewed/dismissed/completed).
 * RLS ensures workspace scoping.
 */
export async function updateRecommendationStatusForWorkspace(
  recommendationId: string,
  status: RecommendationRecord["status"]
): Promise<boolean> {
  try {
    const { orgId } = await getOrgAndUser();

    const supabase = await createClient();
    const { data: recommendation } = await supabase
      .from("recommendations")
      .select("id, organization_id")
      .eq("id", recommendationId)
      .single();

    if (!recommendation || recommendation.organization_id !== orgId) {
      return false;
    }

    return await updateRecommendationStatus(recommendationId, status);
  } catch {
    return false;
  }
}