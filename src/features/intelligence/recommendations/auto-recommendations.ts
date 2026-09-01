// ============================================================================
// Prosventa Automatic Recommendations — Stage 5
// ============================================================================
// Automatically evaluates recommendations for newly scored prospects using
// the EXISTING deterministic recommendation engine and service.
//
//  - Only genuinely relevant prospects are evaluated: strong/excellent ICP
//    fit (RECOMMENDATION_TRIGGER_SCORE). Moderate/weak prospects receive no
//    automatic recommendations — no fabricated filler.
//  - Never throws — prospect creation/scoring must never be blocked.
//  - Deduplication is handled by the existing service (stable dedupe_key +
//    recommendationExists), so retries/imports cannot create duplicates.
//  - Organization is always resolved from the authenticated session.
//
// Plain server module (no "use server") so it can be called from server
// actions and API routes without exposing new public actions.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { generateRecommendationsForProspect } from "./service";

/** Minimum ICP score for automatic recommendation evaluation (strong fit). */
export const RECOMMENDATION_TRIGGER_SCORE = 75;

const QUALIFYING_CATEGORIES = ["strong", "excellent"];

export interface AutoRecommendationResult {
  evaluated: number;
  created: number;
  duplicates: number;
  failed: number;
  reason?: "unauthenticated" | "no_organization" | "no_qualifying_prospects" | "error";
}

export async function autoGenerateRecommendations(
  prospectIds: string[]
): Promise<AutoRecommendationResult> {
  const base: AutoRecommendationResult = {
    evaluated: 0,
    created: 0,
    duplicates: 0,
    failed: 0,
  };

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

    // 2. One batch query for all stored scores — no N+1.
    const { data: scores } = await supabase
      .from("prospect_scores")
      .select("prospect_id, score, category")
      .eq("organization_id", orgId)
      .in("prospect_id", prospectIds);

    const qualifying = (scores ?? []).filter(
      (s: { score: number | null; category: string | null }) =>
        (s.score !== null && s.score >= RECOMMENDATION_TRIGGER_SCORE) ||
        (s.category !== null && QUALIFYING_CATEGORIES.includes(s.category))
    );

    if (qualifying.length === 0) {
      return { ...base, reason: "no_qualifying_prospects" };
    }

    // 3. Evaluate recommendations through the existing service.
    // The service handles context building, deterministic generation,
    // validation, deduplication, workflow triggers, and activity recording.
    let created = 0;
    let duplicates = 0;
    let failed = 0;

    for (const entry of qualifying) {
      try {
        const result = await generateRecommendationsForProspect(entry.prospect_id);
        if (result.status === "completed") {
          created += result.created;
          duplicates += result.duplicates;
        } else {
          failed += 1;
        }
      } catch (error) {
        // One failing prospect must not prevent evaluating the rest.
        console.error(
          `[auto-recommendations] Failed for prospect ${entry.prospect_id}:`,
          error
        );
        failed += 1;
      }
    }

    return { evaluated: qualifying.length, created, duplicates, failed };
  } catch (error) {
    console.error("[auto-recommendations] Batch evaluation failed:", error);
    return { ...base, reason: "error" };
  }
}