// ============================================================================
// Prosventa Intelligence Recommendations — DB Layer
// Stage 4 — Phase 8: Intelligence Recommendations
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  RecommendationRecord,
  RecommendationRecordInsert,
  RecommendationRecordUpdate,
} from "@/features/intelligence/recommendations/types";
import { rankRecommendations } from "@/features/intelligence/recommendations/lifecycle";

// ============================================================================
// Queries
// ============================================================================

/**
 * Retrieves recommendations for a prospect (workspace-scoped via RLS).
 * Returns non-dismissed recommendations, ordered by priority then created_at.
 */
export async function getRecommendationsForProspect(
  prospectId: string,
  limit = 20
): Promise<RecommendationRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendations")
    .select("*")
    .eq("prospect_id", prospectId)
    .neq("status", "dismissed")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as RecommendationRecord[];
}

/**
 * Retrieves recent recommendations for the user's workspace.
 * RLS ensures only the user's org recommendations are returned.
 */
export async function getRecentRecommendationsForWorkspace(
  limit = 20
): Promise<RecommendationRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendations")
    .select("*")
    .neq("status", "dismissed")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as RecommendationRecord[];
}

/**
 * Checks whether a recommendation with the given dedupe key already exists
 * in the workspace. Used for safe deduplication.
 */
export async function recommendationExists(
  organizationId: string,
  dedupeKey: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  return Boolean(data);
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Inserts a new recommendation. Returns the created record or null on failure.
 */
export async function insertRecommendation(
  input: RecommendationRecordInsert
): Promise<RecommendationRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendations")
    .insert(input)
    .select()
    .single();

  return (data as RecommendationRecord) ?? null;
}

/**
 * Updates a recommendation (e.g. status change). RLS ensures workspace scoping.
 */
export async function updateRecommendation(
  id: string,
  updates: RecommendationRecordUpdate
): Promise<RecommendationRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  return (data as RecommendationRecord) ?? null;
}

/**
 * Updates a recommendation's status (new/reviewed/dismissed/completed).
 */
export async function updateRecommendationStatus(
  id: string,
  status: RecommendationRecordUpdate["status"]
): Promise<boolean> {
  if (!status) return false;
  return updateRecommendationStatusWithMetadata(id, { status });
}

/**
 * Updates a recommendation with full lifecycle metadata (status transitions,
 * viewed/accepted/dismissed timestamps, dismissal reason, feedback, freshness
 * and supersede pointers). RLS ensures workspace scoping.
 */
export async function updateRecommendationStatusWithMetadata(
  id: string,
  updates: RecommendationRecordUpdate
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recommendations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  return !error;
}

/**
 * Returns active (new/viewed) recommendations for a prospect, deterministically
 * ranked by priority + confidence + evidence strength + freshness. RLS scopes
 * to the caller's organization.
 */
export async function getActiveRankedRecommendations(
  prospectId: string,
  limit = 20
): Promise<RecommendationRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendations")
    .select("*")
    .eq("prospect_id", prospectId)
    .in("status", ["new", "viewed"])
    .limit(100);

  return rankRecommendations((data ?? []) as RecommendationRecord[]).slice(0, limit);
}

// ============================================================================
// Decision Engine support — Feature 5 Phase 2
// ============================================================================

/**
 * Returns ALL recommendations for a prospect regardless of status (recent
 * first). Used by the decision engine for duplicate/dismissal/supersede
 * evaluation — RLS scopes results to the caller's organization.
 */
export async function getAllRecommendationsForProspect(
  prospectId: string,
  limit = 100
): Promise<RecommendationRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendations")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as RecommendationRecord[];
}

/**
 * Clears the primary flag on every active recommendation of a prospect.
 * Called inside the generation flow BEFORE marking a new primary so exactly
 * one primary recommendation exists per prospect at any time.
 */
export async function clearPrimaryRecommendations(
  prospectId: string
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("recommendations")
    .update({ primary_recommendation: false, updated_at: new Date().toISOString() })
    .eq("prospect_id", prospectId)
    .eq("primary_recommendation", true)
    .in("status", ["new", "viewed"]);
}
