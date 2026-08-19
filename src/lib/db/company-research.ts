// ============================================================================
// Prosventa AI Company Research — DB Layer
// Stage 4 — Phase 4: AI Company Research
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  CompanyResearchRecord,
  CompanyResearchRecordInsert,
  CompanyResearchRecordUpdate,
} from "@/features/intelligence/research/types";

// ============================================================================
// Company Research
// ============================================================================

export async function getCompanyResearch(
  prospectId: string,
  domain: string
): Promise<CompanyResearchRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_research")
    .select("*")
    .eq("prospect_id", prospectId)
    .eq("domain", domain)
    .maybeSingle();
  return (data as CompanyResearchRecord) ?? null;
}

export async function upsertCompanyResearch(
  input: CompanyResearchRecordInsert
): Promise<CompanyResearchRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_research")
    .upsert(input, { onConflict: "prospect_id,domain" })
    .select()
    .single();
  return (data as CompanyResearchRecord) ?? null;
}

export async function updateCompanyResearch(
  id: string,
  updates: CompanyResearchRecordUpdate
): Promise<CompanyResearchRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_research")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return (data as CompanyResearchRecord) ?? null;
}