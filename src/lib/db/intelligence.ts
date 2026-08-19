// ============================================================================
// Prosventa Sales Intelligence DB Layer
// Stage 4 — Phase 1: Intelligence Foundation
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  IntelligenceRecord,
  IntelligenceRecordInsert,
  IntelligenceJob,
  IntelligenceJobInsert,
  IntelligenceJobUpdate,
  IntelligenceUsage,
  IntelligenceUsageInsert,
  CompanyEnrichmentRecord,
  CompanyEnrichmentRecordInsert,
  CompanyEnrichmentRecordUpdate,
  ProspectEnrichmentRecord,
  ProspectEnrichmentRecordInsert,
  ProspectEnrichmentRecordUpdate,
} from "@/features/intelligence/types";

// ============================================================================
// Company Enrichments
// ============================================================================

export async function getCompanyEnrichment(prospectId: string, domain: string): Promise<CompanyEnrichmentRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("company_enrichments").select("*").eq("prospect_id", prospectId).eq("domain", domain).maybeSingle();
  return (data as CompanyEnrichmentRecord) ?? null;
}

export async function upsertCompanyEnrichment(input: CompanyEnrichmentRecordInsert): Promise<CompanyEnrichmentRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("company_enrichments").upsert(input, { onConflict: "prospect_id,domain" }).select().single();
  return (data as CompanyEnrichmentRecord) ?? null;
}

export async function updateCompanyEnrichment(id: string, updates: CompanyEnrichmentRecordUpdate): Promise<CompanyEnrichmentRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("company_enrichments").update(updates).eq("id", id).select().single();
  return (data as CompanyEnrichmentRecord) ?? null;
}

// ============================================================================
// Prospect Enrichments
// ============================================================================

export async function getProspectEnrichment(prospectId: string): Promise<ProspectEnrichmentRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_enrichments")
    .select("*")
    .eq("prospect_id", prospectId)
    .maybeSingle();
  return (data as ProspectEnrichmentRecord) ?? null;
}

export async function upsertProspectEnrichment(input: ProspectEnrichmentRecordInsert): Promise<ProspectEnrichmentRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_enrichments")
    .upsert(input, { onConflict: "prospect_id" })
    .select()
    .single();
  return (data as ProspectEnrichmentRecord) ?? null;
}

export async function updateProspectEnrichment(id: string, updates: ProspectEnrichmentRecordUpdate): Promise<ProspectEnrichmentRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_enrichments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return (data as ProspectEnrichmentRecord) ?? null;
}

// ============================================================================
// Intelligence Records
// ============================================================================

export async function getIntelligenceRecords(
  prospectId: string
): Promise<IntelligenceRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("intelligence_records")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("retrieved_at", { ascending: false });

  return (data ?? []) as IntelligenceRecord[];
}

export async function createIntelligenceRecord(
  input: IntelligenceRecordInsert
): Promise<IntelligenceRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("intelligence_records")
    .insert(input)
    .select()
    .single();

  return (data as IntelligenceRecord) ?? null;
}

// ============================================================================
// Intelligence Jobs
// ============================================================================

export async function createIntelligenceJob(
  input: IntelligenceJobInsert
): Promise<IntelligenceJob | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("intelligence_jobs")
    .insert(input)
    .select()
    .single();

  return (data as IntelligenceJob) ?? null;
}

export async function updateIntelligenceJob(
  id: string,
  updates: IntelligenceJobUpdate
): Promise<IntelligenceJob | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("intelligence_jobs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return (data as IntelligenceJob) ?? null;
}

export async function getIntelligenceJobs(
  prospectId?: string
): Promise<IntelligenceJob[]> {
  const supabase = await createClient();
  let query = supabase
    .from("intelligence_jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (prospectId) {
    query = query.eq("prospect_id", prospectId);
  }

  const { data } = await query;
  return (data ?? []) as IntelligenceJob[];
}

// ============================================================================
// Intelligence Usage
// ============================================================================

export async function recordIntelligenceUsage(
  input: IntelligenceUsageInsert
): Promise<IntelligenceUsage | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("intelligence_usage")
    .insert(input)
    .select()
    .single();

  return (data as IntelligenceUsage) ?? null;
}