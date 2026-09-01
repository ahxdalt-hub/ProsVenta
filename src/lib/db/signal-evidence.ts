// ============================================================================
// Prosventa Signals — Evidence DB Layer
// Feature 3 — Phase 1: Signal Foundation & Data Architecture
// ============================================================================
// Server-side persistence for normalized signal evidence. RLS scopes every
// read/write to the caller's organization; the organization_id is resolved
// server-side, never trusted from the browser.
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  SignalEvidenceRecord,
  SignalEvidenceInsert,
} from "@/features/intelligence/signals/types";

/**
 * Persists one piece of normalized evidence for a signal.
 * Duplicate evidence (same signal + dedupe key) is ignored idempotently.
 */
export async function insertSignalEvidence(
  input: SignalEvidenceInsert
): Promise<SignalEvidenceRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("signal_evidence")
    .upsert(input, { onConflict: "signal_id,dedupe_key", ignoreDuplicates: true })
    .select()
    .single();

  if (error) return null;
  return (data as SignalEvidenceRecord) ?? null;
}

/** Loads all evidence rows for a signal (org-scoped via RLS). */
export async function getEvidenceForSignal(
  signalId: string
): Promise<SignalEvidenceRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("signal_evidence")
    .select("*")
    .eq("signal_id", signalId)
    .order("captured_at", { ascending: false });

  return (data ?? []) as SignalEvidenceRecord[];
}

/**
 * Loads evidence for MANY signals in ONE targeted query (avoids N+1).
 * Returns evidence grouped by signal_id.
 */
export async function getEvidenceForSignals(
  signalIds: string[]
): Promise<Map<string, SignalEvidenceRecord[]>> {
  const grouped = new Map<string, SignalEvidenceRecord[]>();
  if (signalIds.length === 0) return grouped;

  const supabase = await createClient();
  const { data } = await supabase
    .from("signal_evidence")
    .select("*")
    .in("signal_id", signalIds)
    .order("captured_at", { ascending: false });

  for (const row of (data ?? []) as SignalEvidenceRecord[]) {
    const list = grouped.get(row.signal_id) ?? [];
    list.push(row);
    grouped.set(row.signal_id, list);
  }

  return grouped;
}