// ============================================================================
// Prosventa Buying & Intent Signals — DB Layer
// Stage 4 — Phase 7: Buying & Intent Signals
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  SignalRecord,
  SignalRecordInsert,
  SignalRecordUpdate,
} from "@/features/intelligence/signals/types";

// ============================================================================
// Queries
// ============================================================================

/**
 * Retrieves recent signals for a prospect (workspace-scoped via RLS).
 * Returns only active signals, ordered by detected_at descending.
 */
export async function getSignalsForProspect(
  prospectId: string,
  limit = 20
): Promise<SignalRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("signals")
    .select("*")
    .eq("prospect_id", prospectId)
    .eq("status", "active")
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
    .eq("status", "active")
    .order("detected_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as SignalRecord[];
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