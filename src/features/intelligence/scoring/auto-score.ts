// ============================================================================
// Prosventa Automatic ICP Scoring — Stage 5
// ============================================================================
// Automatically scores newly created/imported prospects against the
// workspace ICP configuration using the EXISTING deterministic scoring
// engine. This is a fire-and-forget secondary operation:
//
//  - Never throws — prospect creation must never be blocked by scoring.
//  - Skips silently when no valid ICP configuration exists (no fabricated
//    scores; the prospect simply remains "not scored").
//  - Loads/validates the ICP configuration ONCE per batch (import-friendly,
//    no N+1 config lookups).
//  - Organization is always resolved from the authenticated session —
//    never trusted from client input.
//
// Plain server module (no "use server") so it can be called from both
// server actions and API routes without exposing new public actions.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { getIcpConfiguration, upsertProspectScore } from "@/lib/db/icp-scoring";
import { buildScoringContext } from "./context";
import { scoreProspectAgainstIcp } from "./engine";
import { assertValidIcpCriteria } from "./icp-validation";
import { SCORING_VERSION } from "./types";

export interface AutoScoreResult {
  attempted: number;
  scored: number;
  skipped: number;
  /** Prospects that were successfully scored (used for downstream recommendation evaluation). */
  scoredProspectIds?: string[];
  reason?: "unauthenticated" | "no_organization" | "no_icp_configuration" | "invalid_icp_configuration" | "error";
}

export async function autoScoreNewProspects(prospectIds: string[]): Promise<AutoScoreResult> {
  const base: AutoScoreResult = { attempted: prospectIds.length, scored: 0, skipped: prospectIds.length };

  if (prospectIds.length === 0) return base;

  try {
    const supabase = await createClient();

    // 1. Resolve organization strictly from the authenticated session.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ...base, reason: "unauthenticated" };

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();
    if (!membership) return { ...base, reason: "no_organization" };

    const orgId = membership.organization_id;

    // 2. Load + validate the ICP configuration once per batch.
    // No ICP configured → do NOT fabricate scores. Prospects stay unscored.
    const icpConfig = await getIcpConfiguration(orgId);
    if (!icpConfig) return { ...base, reason: "no_icp_configuration" };

    let criteria;
    try {
      criteria = assertValidIcpCriteria(icpConfig.criteria);
    } catch {
      return { ...base, reason: "invalid_icp_configuration" };
    }

    let scored = 0;
    const scoredProspectIds: string[] = [];
    for (const prospectId of prospectIds) {
      try {
        // buildScoringContext verifies the prospect belongs to this org.
        const context = await buildScoringContext(prospectId, orgId);
        const result = scoreProspectAgainstIcp(context, criteria);

        await upsertProspectScore({
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
        scored += 1;
        scoredProspectIds.push(prospectId);
      } catch (error) {
        // One failing prospect must not prevent scoring the rest of the batch.
        console.error(`[auto-score] Failed to score prospect ${prospectId}:`, error);
      }
    }

    // Stage 5 Task 2: automatic recommendation evaluation for high-fit
    // prospects. Secondary operation — never fails scoring.
    try {
      const { autoGenerateRecommendations } = await import(
        "@/features/intelligence/recommendations/auto-recommendations"
      );
      await autoGenerateRecommendations(scoredProspectIds);
    } catch (recError) {
      console.error("[auto-score] Automatic recommendation evaluation failed:", recError);
    }

    return {
      attempted: prospectIds.length,
      scored,
      skipped: prospectIds.length - scored,
      scoredProspectIds,
    };
  } catch (error) {
    console.error("[auto-score] Batch scoring failed:", error);
    return { ...base, reason: "error" };
  }
}