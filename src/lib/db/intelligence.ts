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

/**
 * Upserts a company enrichment by (prospect_id, domain).
 *
 * Provenance rules (Stage 6 - Phase 2):
 *   - `first_retrieved_at` is a provenance anchor: it is preserved from the
 *     existing row on refresh and never moves forward/backward.
 *   - `last_retrieved_at` always reflects the latest successful retrieval.
 *
 * Repeated enrichment therefore updates/refreshes the existing record and can
 * never create duplicate company records for the same prospect + domain.
 */
export async function upsertCompanyEnrichment(input: CompanyEnrichmentRecordInsert): Promise<CompanyEnrichmentRecord | null> {
  const supabase = await createClient();

  // Read the existing row so the original retrieval timestamp is preserved.
  const { data: existing } = await supabase
    .from("company_enrichments")
    .select("first_retrieved_at, created_at")
    .eq("prospect_id", input.prospect_id)
    .eq("domain", input.domain)
    .maybeSingle();

  const now = new Date().toISOString();
  const payload = {
    ...input,
    first_retrieved_at:
      (existing as { first_retrieved_at: string | null } | null)?.first_retrieved_at ??
      input.first_retrieved_at ??
      input.enriched_at ??
      now,
    last_retrieved_at: input.last_retrieved_at ?? input.enriched_at ?? now,
  };

  const { data } = await supabase.from("company_enrichments").upsert(payload, { onConflict: "prospect_id,domain" }).select().single();
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

  // Read the existing row so the original retrieval timestamp is preserved
  // (Stage 6 - Phase 3 provenance rules, mirroring company enrichment).
  const { data: existing } = await supabase
    .from("prospect_enrichments")
    .select("first_retrieved_at, created_at")
    .eq("prospect_id", input.prospect_id)
    .maybeSingle();

  const now = new Date().toISOString();
  const payload = {
    ...input,
    first_retrieved_at:
      (existing as { first_retrieved_at: string | null } | null)?.first_retrieved_at ??
      input.first_retrieved_at ??
      input.enriched_at ??
      now,
    last_retrieved_at: input.last_retrieved_at ?? input.enriched_at ?? now,
  };

  const { data } = await supabase
    .from("prospect_enrichments")
    .upsert(payload, { onConflict: "prospect_id" })
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

// ============================================================================
// Organization Provider Configuration (Stage 6 - Phase 1)
// ============================================================================
// Non-secret, per-organization provider selection. Always scoped to the
// caller's own organization_id — callers pass the org id resolved from their
// authenticated membership, and RLS enforces isolation at the database level.
// Provider API keys NEVER live here; they remain server-side env vars only.
// ============================================================================

export interface OrganizationProviderConfigRow {
  id: string;
  organization_id: string;
  kind: string;
  provider_id: string;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Reads the organization's provider configuration for one kind.
 * Returns null when the organization has not configured this kind.
 * The orgId MUST come from the authenticated user's membership.
 */
export async function getOrganizationProviderConfig(
  orgId: string,
  kind: string
): Promise<OrganizationProviderConfigRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_provider_configs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("kind", kind)
    .maybeSingle();

  return (data as OrganizationProviderConfigRow) ?? null;
}

/**
 * Upserts the organization's provider configuration for one kind.
 * Rejects values that look like secrets as a defence-in-depth measure.
 */
export async function setOrganizationProviderConfig(input: {
  orgId: string;
  kind: string;
  providerId: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}): Promise<OrganizationProviderConfigRow | null> {
  if (/apikey|api_key|secret|token|password|credential/i.test(JSON.stringify(input.config ?? {}))) {
    throw new Error("Secrets must not be stored in organization provider configuration.");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_provider_configs")
    .upsert(
      {
        organization_id: input.orgId,
        kind: input.kind,
        provider_id: input.providerId,
        enabled: input.enabled ?? true,
        config: input.config ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,kind" }
    )
    .select()
    .single();

  return (data as OrganizationProviderConfigRow) ?? null;
}