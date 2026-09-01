// ============================================================================
// Prosventa Intelligence Insights — DB Layer
// Feature 4 — Phase 1: Intelligence Foundation & Reasoning Architecture
// ============================================================================
// Targeted queries only — never full-organization scans. All reads/writes are
// organization-scoped via RLS (organization_members policies). Callers must
// pass an orgId resolved server-side from authenticated membership.
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import type { IntelligenceScope } from "@/features/intelligence/reasoning/types";
import type { EvidenceRefInput } from "@/features/intelligence/reasoning/types";

// Minimal row shape returned from the DB (JSONB columns are opaque here).
export interface IntelligenceInsightRow {
  id: string;
  organization_id: string;
  scope: IntelligenceScope;
  prospect_id: string | null;
  company_key: string | null;
  status: "pending" | "processing" | "ready" | "stale" | "failed";
  version: number;
  previous_version_id: string | null;
  icp_configuration_id: string | null;
  icp_snapshot: Record<string, unknown>;
  scores: Record<string, unknown>;
  confidence: Record<string, unknown>;
  freshness: Record<string, unknown>;
  explanation: string | null;
  key_factors: unknown[];
  concerns: unknown[];
  engine: Record<string, unknown>;
  input_digest: string | null;
  error_code: string | null;
  error_message: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntelligenceEvidenceRefRow {
  id: string;
  organization_id: string;
  insight_id: string;
  ref_type: string;
  table_name: string;
  record_id: string;
  source: string | null;
  occurred_at: string | null;
  captured_at: string | null;
  freshness: string | null;
  note: string | null;
  created_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ============================================================================
// Queries
// ============================================================================

/** Latest insight for a prospect, regardless of status. */
export async function getLatestInsightForProspect(
  orgId: string,
  prospectId: string
): Promise<IntelligenceInsightRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("intelligence_insights")
    .select("*")
    .eq("organization_id", orgId)
    .eq("prospect_id", prospectId)
    // created_at is the authoritative recency signal: version alone is NOT
    // unique across generations, so version-desc-only ordering could return
    // an arbitrary (possibly failed/stale) row.
    .order("created_at", { ascending: false })
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as IntelligenceInsightRow) ?? null;
}

/** Latest insight for a company (company_key = normalized domain). */
export async function getLatestInsightForCompany(
  orgId: string,
  companyKey: string
): Promise<IntelligenceInsightRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("intelligence_insights")
    .select("*")
    .eq("organization_id", orgId)
    .eq("company_key", companyKey)
    .order("created_at", { ascending: false })
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as IntelligenceInsightRow) ?? null;
}

/** Version history for a subject (bounded, newest first). */
export async function getInsightHistory(
  orgId: string,
  scope: IntelligenceScope,
  subjectId: string,
  limit = 10
): Promise<IntelligenceInsightRow[]> {
  const supabase = await createClient();
  const column = scope === "prospect" ? "prospect_id" : "company_key";
  const { data } = await supabase
    .from("intelligence_insights")
    .select("*")
    .eq("organization_id", orgId)
    .eq(column, subjectId)
    .order("version", { ascending: false })
    .limit(limit);
  return (data ?? []) as IntelligenceInsightRow[];
}

/** Evidence graph edges for one insight. */
export async function getEvidenceRefs(
  orgId: string,
  insightId: string
): Promise<IntelligenceEvidenceRefRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("intelligence_evidence_refs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("insight_id", insightId)
    .order("created_at", { ascending: true });
  return (data ?? []) as IntelligenceEvidenceRefRow[];
}

// ============================================================================
// Writes
// ============================================================================

export interface CreateInsightInput {
  organization_id: string;
  scope: IntelligenceScope;
  prospect_id?: string | null;
  company_key?: string | null;
  icp_configuration_id?: string | null;
  previous_version_id?: string | null;
  input_digest?: string | null;
  /**
   * Explicit monotonically increasing version. Callers MUST pass
   * (latest existing version + 1); defaulting every row to 1 would make
   * version-based ordering meaningless.
   */
  version?: number;
}

/**
 * Creates an in-flight (pending) insight row. The partial unique indexes
 * uniq_intel_insights_active_prospect / _active_company guarantee at most ONE
 * pending/processing generation per subject — concurrent duplicate generation
 * fails here with a unique violation instead of creating uncontrolled rows.
 * Returns the error so callers can distinguish "already generating".
 */
export async function createPendingInsight(
  input: CreateInsightInput
): Promise<{ row: IntelligenceInsightRow | null; duplicate: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("intelligence_insights")
    .insert({
      organization_id: input.organization_id,
      scope: input.scope,
      prospect_id: input.prospect_id ?? null,
      company_key: input.company_key ?? null,
      status: "pending",
      version: input.version ?? 1,
      icp_configuration_id: input.icp_configuration_id ?? null,
      previous_version_id: input.previous_version_id ?? null,
      input_digest: input.input_digest ?? null,
    })
    .select()
    .single();

  if (error) {
    const duplicate = error.code === "23505";
    if (!duplicate) throw new Error(`Failed to create intelligence insight: ${error.message}`);
    return { row: null, duplicate };
  }
  return { row: data as IntelligenceInsightRow, duplicate: false };
}

export interface UpdateInsightUpdate {
  status?: "pending" | "processing" | "ready" | "stale" | "failed";
  scores?: Record<string, unknown>;
  confidence?: Record<string, unknown>;
  freshness?: Record<string, unknown>;
  explanation?: string | null;
  key_factors?: unknown[];
  concerns?: unknown[];
  engine?: Record<string, unknown>;
  input_digest?: string | null;
  icp_snapshot?: Record<string, unknown>;
  error_code?: string | null;
  error_message?: string | null;
  generated_at?: string | null;
}

export async function updateInsight(
  orgId: string,
  id: string,
  updates: UpdateInsightUpdate
): Promise<IntelligenceInsightRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("intelligence_insights")
    .update({ ...updates, updated_at: nowIso() })
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();
  return (data as IntelligenceInsightRow) ?? null;
}

/** Persists evidence graph edges for an insight. */
export async function insertEvidenceRefs(
  orgId: string,
  insightId: string,
  refs: EvidenceRefInput[]
): Promise<void> {
  if (refs.length === 0) return;
  const supabase = await createClient();
  const rows = refs.map((ref) => ({
    organization_id: orgId,
    insight_id: insightId,
    ref_type: ref.refType,
    table_name: ref.tableName,
    record_id: ref.recordId,
    source: ref.source ?? null,
    occurred_at: ref.occurredAt ?? null,
    captured_at: ref.capturedAt ?? null,
    freshness: ref.freshness ?? null,
    note: ref.note ?? null,
  }));
  const { error } = await supabase.from("intelligence_evidence_refs").insert(rows);
  if (error) throw new Error(`Failed to store evidence references: ${error.message}`);
}

