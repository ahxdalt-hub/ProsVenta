// ============================================================================
// Prosventa Smart Lead & ICP Scoring â€” Service
// Stage 4 â€” Phase 6: Smart Lead & ICP Scoring
// ============================================================================
// Server-side boundary for ICP scoring operations. UI components never call
// the scoring engine directly â€” they go through this service.
//
// Authorization is resolved server-side from the authenticated user's
// organization membership. The client-supplied prospectId is never trusted
// to determine workspace access.
//
// One explicit user action produces one scoring operation. Scores are
// cached in the prospect_scores table and only re-run on explicit refresh.
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { IntelligenceError, toIntelligenceError } from "../errors";
import { getIcpConfiguration, getProspectScore, upsertProspectScore } from "@/lib/db/icp-scoring";
import { recordIntelligenceUsage } from "@/lib/db/intelligence";
import { buildScoringContext } from "./context";
import { scoreProspectAgainstIcp } from "./engine";
import { assertValidIcpCriteria } from "./icp-validation";
import { SCORING_VERSION, type ProspectScore, type ScoreOperationResult } from "./types";

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
    operation: "prospect_research",
    provider: "icp-scoring",
    status,
  });
}

// ============================================================================
// Scoring Operation
// ============================================================================

/**
 * Scores a single prospect against the workspace ICP configuration.
 *
 * Authorization:
 *  - authenticated user
 *  - workspace membership (resolved server-side)
 *  - prospect belongs to user's org
 *
 * Caching:
 *  - Does NOT re-score on every page load.
 *  - Returns the stored score when available (unless refresh is requested).
 *  - One explicit user action produces one scoring operation.
 */
export async function scoreProspectForWorkspace(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<ScoreOperationResult> {
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
      return { status: "failed", message: "Prospect not found.", score: null };
    }

    if (prospect.organization_id !== orgId) {
      return { status: "failed", message: "You do not have access to this prospect.", score: null };
    }

    // Cache check â€” do not re-score on every page load.
    if (!options?.refresh) {
      const existing = await getProspectScore(prospectId);
      if (existing) {
        return { status: "completed", message: "Score already available.", score: existing };
      }
    }

    // Load the workspace ICP configuration.
    const icpConfig = await getIcpConfiguration(orgId);
    if (!icpConfig) {
      return {
        status: "failed",
        message: "No ICP configuration found. Configure your Ideal Customer Profile in Settings first.",
        score: null,
      };
    }

    // Validate the ICP criteria strongly.
    let criteria;
    try {
      criteria = assertValidIcpCriteria(icpConfig.criteria);
    } catch {
      return {
        status: "failed",
        message: "The ICP configuration is invalid. Please review it in Settings.",
        score: null,
      };
    }

    // Track usage â€” one explicit user action produces one scoring operation.
    await trackUsage(orgId, userId, "pending");

    // Build the scoring context from available data.
    const context = await buildScoringContext(prospectId, orgId);

    // Run the deterministic scoring engine.
    const result = scoreProspectAgainstIcp(context, criteria);

    // Capture the previous score BEFORE the upsert overwrites it, so we can
    // detect real score changes for prospect.score.updated.
    const previousScoreRecord = options?.refresh ? await getProspectScore(prospectId) : null;

    // Persist the validated score.
    const record = await upsertProspectScore({
      prospect_id: prospectId,
      organization_id: orgId,
      icp_configuration_id: icpConfig.id,
      score: result.score,
      confidence: result.confidence,
      category: result.category,
      company_score: result.companyScore,
      prospect_score: result.prospectScore,
      factors: result.factors,
      scoring_version: SCORING_VERSION,
      scored_at: new Date().toISOString(),
    });

    await trackUsage(orgId, userId, "completed");

    // Stage 7 Phase 2: prospect.score.updated — ONLY when the score actually
    // changed. Never emits meaningless 84 → 84 events.
    if (record) {
      try {
        const changed =
          previousScoreRecord === null || previousScoreRecord.score !== record.score;
        if (changed) {
          const { safeEmitWorkflowEvent } = await import(
            "@/features/intelligence/workflows/triggers/emit"
          );
          safeEmitWorkflowEvent({
            eventType: "prospect.score.updated",
            organizationId: orgId,
            targetType: "prospect",
            targetId: prospectId,
            payload: {
              prospect_id: prospectId,
              previous_score: previousScoreRecord?.score ?? null,
              new_score: record.score,
              score_category: record.category,
            },
            dedupeKey: `prospect.score.updated:${prospectId}:${record.score}:${record.scored_at ?? ""}`,
          });
        }
      } catch (err) {
        console.error("[scoring] Score-change event emission failed:", err);
      }
    }

    // Stage 5 Task 2: automatic recommendation evaluation for strong/excellent
    // fits. Secondary operation — never fails or blocks the scoring result.
    if (record) {
      try {
        const { autoGenerateRecommendations, RECOMMENDATION_TRIGGER_SCORE } = await import(
          "@/features/intelligence/recommendations/auto-recommendations"
        );
        const qualifies =
          record.score >= RECOMMENDATION_TRIGGER_SCORE ||
          record.category === "strong" ||
          record.category === "excellent";
        if (qualifies) {
          await autoGenerateRecommendations([prospectId]);
        }
      } catch (recError) {
        console.error("[scoring] Automatic recommendation evaluation failed:", recError);
      }
    }

    return {
      status: "completed",
      message: "Score calculated.",
      score: record,
    };
  } catch (error) {
    const intelError = toIntelligenceError(error, "icp-scoring");
    return {
      status: "failed",
      message: intelError.message,
      score: null,
    };
  }
}

/**
 * Returns the stored score for a prospect without re-scoring.
 * Used for cached display on page load. Returns null when no score exists.
 */
export async function getStoredProspectScore(
  prospectId: string
): Promise<ProspectScore | null> {
  try {
    const { orgId } = await getOrgAndUser();

    const supabase = await createClient();
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, organization_id")
      .eq("id", prospectId)
      .single();

    if (!prospect || prospect.organization_id !== orgId) {
      return null;
    }

    return await getProspectScore(prospectId);
  } catch {
    return null;
  }
}
