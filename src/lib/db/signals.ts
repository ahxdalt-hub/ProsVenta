// ============================================================================
// Prosventa Buying & Intent Signals — DB Layer
// Stage 4 — Phase 7: Buying & Intent Signals
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import {
  LIVE_SIGNAL_STATUSES,
} from "@/features/intelligence/signals/lifecycle";
import type {
  SignalRecord,
  SignalRecordInsert,
  SignalRecordUpdate,
  SignalStatus,
  SignalType,
} from "@/features/intelligence/signals/types";

// ============================================================================
// Queries
// ============================================================================

/**
 * Retrieves recent signals for a prospect (workspace-scoped via RLS).
 * Returns only active signals, ordered by detected_at descending.
 *
 * Company-level association: external signals are stored ONCE per company
 * (company_key = normalized domain) and may have prospect_id = null. Signals
 * for the prospect's own company are therefore also returned here, without
 * duplicating the underlying signal across prospects.
 */
export async function getSignalsForProspect(
  prospectId: string,
  limit = 20,
  companyKey?: string | null
): Promise<SignalRecord[]> {
  const supabase = await createClient();

  if (companyKey) {
    // LIVE_SIGNAL_STATUSES (not just 'active') so external signals stored as
    // 'detected'/'verified' appear consistently across every read surface.
    const { data } = await supabase
      .from("signals")
      .select("*")
      .in("status", [...LIVE_SIGNAL_STATUSES])
      .or(`prospect_id.eq.${prospectId},company_key.eq.${companyKey}`)
      .order("detected_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as SignalRecord[];
  }

  const { data } = await supabase
    .from("signals")
    .select("*")
    .eq("prospect_id", prospectId)
    .in("status", [...LIVE_SIGNAL_STATUSES])
    .order("detected_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as SignalRecord[];
}

/**
 * Retrieves recent signals for the user's workspace.
 * RLS ensures only the user's org signals are returned.
 */
export async function getRecentSignalsForWorkspace(
  limit = 20
): Promise<SignalRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("signals")
    .select("*")
    .in("status", [...LIVE_SIGNAL_STATUSES])
    .order("detected_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as SignalRecord[];
}

/**
 * Error-aware variant for Intelligence: distinguishes a genuinely empty feed
 * from a failed load, so the UI never shows a failure as an empty feed.
 * RLS ensures only the user's org signals are returned.
 */
export async function getRecentSignalsForWorkspaceDetailed(
  limit = 20
): Promise<{ rows: SignalRecord[]; failed: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .in("status", [...LIVE_SIGNAL_STATUSES])
    .order("detected_at", { ascending: false })
    .limit(limit);

  return {
    rows: (data ?? []) as SignalRecord[],
    failed: Boolean(error),
  };
}


/**
 * Checks whether a signal with the given dedupe key already exists
 * in the workspace. Used for safe deduplication.
 */
export async function signalExists(
  organizationId: string,
  dedupeKey: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("signals")
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
 * Inserts a new signal. Returns the created record or null on failure.
 */
export async function insertSignal(
  input: SignalRecordInsert
): Promise<SignalRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("signals")
    .insert(input)
    .select()
    .single();

  return (data as SignalRecord) ?? null;
}

/**
 * Updates a signal (e.g. dismiss/archive). RLS ensures workspace scoping.
 */
export async function updateSignal(
  id: string,
  updates: SignalRecordUpdate
): Promise<SignalRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("signals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return (data as SignalRecord) ?? null;
}

/**
 * Dismisses a signal (soft-hide from the active feed).
 */
export async function dismissSignal(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("signals")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .eq("id", id);

  return !error;
}

// ============================================================================
// External Signal Support (Stage 6 — Phase 5)
// ============================================================================

/**
 * Loads stored external signals for cross-provider duplicate detection.
 * Scoped to the organization and the company's normalized domain, limited
 * to a recent window so matching stays cheap.
 */
export async function getExternalSignalCandidates(
  organizationId: string,
  companyKey: string | null,
  limit = 100
): Promise<
  Array<{
    id: string;
    signal_type: string;
    title: string;
    source_url: string | null;
    provider: string | null;
    provider_signal_id: string | null;
    detected_at: string;
    occurred_at?: string | null;
  }>
> {
  const supabase = await createClient();

  let query = supabase
    .from("signals")
    .select(
      "id, signal_type, title, source_url, provider, provider_signal_id, detected_at, occurred_at"
    )
    .eq("organization_id", organizationId)
    .eq("signal_origin", "external")
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (companyKey) {
    query = query.eq("company_key", companyKey);
  }

  const { data } = await query;
  return data ?? [];
}

// ============================================================================
// Signal Query Service — targeted, paginated retrieval (Feature 3 Phase 1)
// ============================================================================
// Reusable way to retrieve signals by organization / prospect / company /
// signal type / status / date range. Uses targeted queries with pagination —
// never fetches every signal for every page.
// ============================================================================

import type { NormalizedSignalQueryPlan } from "@/features/intelligence/signals/query-filters";

export interface SignalQueryResult {
  rows: SignalRecord[];
  /** Total matching rows (for pagination UI) */
  total: number;
}

/**
 * Runs a normalized (pre-validated) signal query plan.
 * RLS additionally scopes every row to the caller's organization.
 */
export async function querySignals(
  plan: NormalizedSignalQueryPlan
): Promise<SignalQueryResult> {
  const supabase = await createClient();

  let query = supabase
    .from("signals")
    .select("*", { count: "exact" })
    .eq("organization_id", plan.organization_id);

  if (plan.prospect_id) query = query.eq("prospect_id", plan.prospect_id);
  if (plan.company_key) query = query.eq("company_key", plan.company_key);
  if (plan.signal_type.length > 0) query = query.in("signal_type", plan.signal_type);
  if (plan.status.length > 0) query = query.in("status", plan.status);
  if (plan.occurred_from) query = query.gte("occurred_at", plan.occurred_from);
  if (plan.occurred_to) query = query.lte("occurred_at", plan.occurred_to);

  const ascending = plan.order_dir === "asc";

  // occurred_at may be null for legacy rows — fall back ordering keeps pages stable.
  const { data, error, count } = await query
    .order(plan.order_by, { ascending, nullsFirst: false })
    .range(plan.offset, plan.offset + plan.limit - 1);

  if (error) return { rows: [], total: 0 };

  return {
    rows: (data ?? []) as SignalRecord[],
    total: count ?? 0,
  };
}

// ============================================================================
// Prospect Entity Signal Query (Feature 3 — Phase 3: Signals UX)
// ============================================================================
// Paginated retrieval of every signal connected to a prospect OR its company
// (company_key = normalized domain). Supports status/type/date filtering,
// ordering, and an exact total so the UI can paginate without fetching
// everything. RLS scopes results to the caller's organization.
// ============================================================================

export interface ProspectSignalQuery {
  prospectId: string;
  companyKey: string | null;
  /** Empty = no status filter. */
  statuses: SignalStatus[];
  /** Empty = no type filter. */
  signalTypes: SignalType[];
  occurredFrom: string | null;
  occurredTo: string | null;
  orderBy: "occurred_at" | "detected_at";
  ascending: boolean;
  limit: number;
  offset: number;
}

export async function queryProspectSignals(
  q: ProspectSignalQuery
): Promise<SignalQueryResult> {
  const supabase = await createClient();

  let query = supabase
    .from("signals")
    .select("*", { count: "exact" });

  query =
    q.companyKey
      ? query.or(`prospect_id.eq.${q.prospectId},company_key.eq.${q.companyKey}`)
      : query.eq("prospect_id", q.prospectId);

  if (q.statuses.length > 0) query = query.in("status", q.statuses);
  if (q.signalTypes.length > 0) query = query.in("signal_type", q.signalTypes);
  if (q.occurredFrom) query = query.gte("occurred_at", q.occurredFrom);
  if (q.occurredTo) query = query.lte("occurred_at", q.occurredTo);

  const { data, error, count } = await query
    .order(q.orderBy, { ascending: q.ascending, nullsFirst: false })
    .range(q.offset, q.offset + q.limit - 1);

  if (error) return { rows: [], total: 0 };

  return {
    rows: (data ?? []) as SignalRecord[],
    total: count ?? 0,
  };
}
