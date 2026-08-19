// ============================================================================
// Prosventa AI Prospect Research — DB Layer
// Stage 4 — Phase 5: AI Prospect Research
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ProspectResearchRecord,
  ProspectResearchRecordInsert,
  ProspectResearchRecordUpdate,
} from "@/features/intelligence/prospect-research/types";

// ============================================================================
// Prospect Research
// ============================================================================

export async function getProspectResearch(
  prospectId: string
): Promise<ProspectResearchRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_research")
    .select("*")
    .eq("prospect_id", prospectId)
    .maybeSingle();
  return (data as ProspectResearchRecord) ?? null;
}

export async function upsertProspectResearch(
  input: ProspectResearchRecordInsert
): Promise<ProspectResearchRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_research")
    .upsert(input, { onConflict: "prospect_id" })
    .select()
    .single();
  return (data as ProspectResearchRecord) ?? null;
}

export async function updateProspectResearch(
  id: string,
  updates: ProspectResearchRecordUpdate
): Promise<ProspectResearchRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_research")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return (data as ProspectResearchRecord) ?? null;
}