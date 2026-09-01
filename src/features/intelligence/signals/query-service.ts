// ============================================================================
// Prosventa Signals — Query Service (server-side boundary)
// Feature 3 — Phase 1: Signal Foundation & Data Architecture
// ============================================================================
// The single reusable server-side way to RETRIEVE signals. UI components never
// query signal tables directly and never craft filters themselves — they call
// this service with typed filters.
//
// Organization isolation: the organization id is ALWAYS resolved from the
// authenticated user's membership, never from the browser. RLS additionally
// enforces isolation at the database level.
// ============================================================================

"use server";

import { createClient } from "@/lib/supabase/server";
import { querySignals } from "@/lib/db/signals";
import { normalizeSignalQuery } from "./query-filters";
import type {
  SignalQueryFilters,
  SignalRecord,
} from "./types";
import { IntelligenceError } from "../errors";

export interface PaginatedSignals {
  rows: SignalRecord[];
  total: number;
  limit: number;
  offset: number;
}

/** Resolves the caller's organization from the authenticated session. */
export async function getCallerOrganizationId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return membership?.organization_id ?? null;
}

/**
 * Targeted, paginated signal retrieval for the caller's organization.
 * Throws a controlled VALIDATION_ERROR for unusable filters instead of
 * running an unscoped or unbounded query.
 */
export async function listSignals(
  filters: SignalQueryFilters = {}
): Promise<PaginatedSignals> {
  const orgId = await getCallerOrganizationId();
  if (!orgId) throw new IntelligenceError("AUTHENTICATION_FAILED");

  const { plan, issues } = normalizeSignalQuery(orgId, filters);
  if (!plan) {
    throw new IntelligenceError("VALIDATION_ERROR", { cause: issues.join(" ") });
  }

  const result = await querySignals(plan);

  return {
    rows: result.rows,
    total: result.total,
    limit: plan.limit,
    offset: plan.offset,
  };
}

/** Loads all evidence rows for one signal owned by the caller's organization. */
export async function getSignalWithEvidence(signalId: string): Promise<{
  signal: SignalRecord | null;
  evidence: Awaited<ReturnType<typeof import("@/lib/db/signal-evidence").getEvidenceForSignal>>;
}> {
  const orgId = await getCallerOrganizationId();
  if (!orgId) throw new IntelligenceError("AUTHENTICATION_FAILED");

  const supabase = await createClient();
  const { data: signal } = await supabase
    .from("signals")
    .select("*")
    .eq("id", signalId)
    .eq("organization_id", orgId)
    .maybeSingle();

  const { getEvidenceForSignal } = await import("@/lib/db/signal-evidence");
  const evidence = signal ? await getEvidenceForSignal(signalId) : [];

  return { signal: (signal as SignalRecord) ?? null, evidence };
}
