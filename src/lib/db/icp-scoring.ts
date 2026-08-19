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