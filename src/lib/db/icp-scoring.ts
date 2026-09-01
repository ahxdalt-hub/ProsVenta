// ============================================================================
// Prosventa ICP & Scoring DB Layer
// Stage 4 — Phase 6: Smart Lead & ICP Scoring
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  IcpConfiguration,
  IcpConfigurationInsert,
  IcpConfigurationUpdate,
  ProspectScore,
  ProspectScoreInsert,
  ProspectScoreUpdate,
} from "@/features/intelligence/scoring/types";

// ============================================================================
// ICP Configurations
// ============================================================================

export async function getIcpConfiguration(organizationId: string): Promise<IcpConfiguration | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("icp_configurations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .maybeSingle();
  return (data as IcpConfiguration) ?? null;
}

export async function getIcpConfigurationById(id: string): Promise<IcpConfiguration | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("icp_configurations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as IcpConfiguration) ?? null;
}

export async function createIcpConfiguration(input: IcpConfigurationInsert): Promise<IcpConfiguration | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("icp_configurations")
    .insert(input)
    .select()
    .single();
  return (data as IcpConfiguration) ?? null;
}

export async function updateIcpConfiguration(
  id: string,
  updates: IcpConfigurationUpdate
): Promise<IcpConfiguration | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("icp_configurations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  return (data as IcpConfiguration) ?? null;
}

export async function deleteIcpConfiguration(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("icp_configurations")
    .delete()
    .eq("id", id);
  return !error;
}

// ============================================================================
// Prospect Scores
// ============================================================================

export async function getProspectScore(prospectId: string): Promise<ProspectScore | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_scores")
    .select("*")
    .eq("prospect_id", prospectId)
    .maybeSingle();
  return (data as ProspectScore) ?? null;
}

export async function upsertProspectScore(input: ProspectScoreInsert): Promise<ProspectScore | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_scores")
    .upsert(input, { onConflict: "prospect_id" })
    .select()
    .single();
  return (data as ProspectScore) ?? null;
}

export async function updateProspectScore(
  id: string,
  updates: ProspectScoreUpdate
): Promise<ProspectScore | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_scores")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  return (data as ProspectScore) ?? null;
}

export async function deleteProspectScore(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prospect_scores")
    .delete()
    .eq("id", id);
  return !error;
}

// ============================================================================
// Automatic Scoring Job States — Stage 5 Task 4
// ============================================================================

/**
 * Returns the current automatic scoring job state for the given prospects.
 * Reads the existing intelligence_jobs table (provider 'icp-scoring') —
 * no new schema. Used to distinguish "Calculating…" from "Not scored" and
 * from "Processing failed" in the UI.
 *
 * One batched query for a full page of prospects (no N+1). RLS scopes to
 * the caller's organization.
 */
export async function getScoringJobStates(
  prospectIds: string[]
): Promise<Record<string, "pending" | "processing" | "failed">> {
  const states: Record<string, "pending" | "processing" | "failed"> = {};
  if (prospectIds.length === 0) return states;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("intelligence_jobs")
      .select("prospect_id, status")
      .eq("provider", "icp-scoring")
      .in("status", ["pending", "processing", "failed"])
      .in("prospect_id", prospectIds);

    for (const job of data ?? []) {
      const id = job.prospect_id as string;
      const status = job.status as string;
      // Never overwrite an active state with a stale failure.
      if (
        !states[id] ||
        status === "processing" ||
        (status === "pending" && states[id] === "failed") ||
        (status === "failed" && !states[id])
      ) {
        if (status === "pending" || status === "processing" || status === "failed") {
          states[id] = status;
        }
      }
    }
  } catch {
    // On error, treat all prospects as having no state ("Not scored").
  }

  return states;
}