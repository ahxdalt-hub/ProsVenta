// ============================================================================
// Prosventa Intelligence — Action Window Server Boundary (Phase 2)
// ============================================================================
// Thin, RLS-scoped reads that feed the reusable action window. It does NOT
// duplicate business logic: search reuses the canonical `queryProspects`
// loader, balance reads go through the canonical CreditService, and signal
// review reads the existing `signals` table. The actual research/enrichment/
// signal operations call the EXISTING intelligence server actions.
// ============================================================================

"use server";

import { createClient } from "@/lib/supabase/server";
import { queryProspects } from "@/lib/db/prospects";
import { CreditService } from "@/features/credits/service";
import { resolveBillingContext } from "@/features/credits/billing";
import {
  SIGNAL_CONFIDENCE_LABELS,
  SIGNAL_IMPORTANCE_LABELS,
  SIGNAL_TYPE_LABELS,
  type SignalRecord,
} from "@/features/intelligence/signals/types";
import type {
  IntelligenceActionKind,
  IntelligenceReviewSignal,
  IntelligenceTarget,
} from "./types";

// ============================================================================
// Unified target search (existing data source, one selector for all actions)
// ============================================================================

function mapProspect(row: Record<string, unknown>): IntelligenceTarget | null {
  const id = (row.id as string) ?? null;
  if (!id) return null;
  const company = (row.company_name as string)?.trim() || null;
  const name = (row.name as string)?.trim() || null;
  const contact = (row.contact_name as string)?.trim() || null;
  const industry = (row.industry as string)?.trim() || null;
  const city = (row.city as string)?.trim() || null;
  const country = (row.country as string)?.trim() || null;
  const website = (row.website as string)?.trim() || null;

  const primary = company ?? name ?? contact ?? "Unnamed prospect";
  const location =
    city && country ? `${city}, ${country}` : city ?? country ?? null;

  return {
    id,
    name: primary,
    sub: [contact, industry, location].filter(Boolean).join(" · ") ||
      "No additional details",
    domain: website ?? "",
    contact,
  };
}

export async function searchIntelligenceTargets(
  kind: IntelligenceActionKind,
  query: string
): Promise<IntelligenceTarget[]> {
  const trimmed = query.trim().slice(0, 120);
  const page = await queryProspects({
    search: trimmed || undefined,
    pageSize: 8,
    sort: "company_name",
    order: "asc",
  });
  const rows = page.prospects as unknown as Array<Record<string, unknown>>;
  const targets: IntelligenceTarget[] = [];
  for (const row of rows) {
    const mapped = mapProspect(row);
    if (mapped) targets.push(mapped);
  }
  return targets;
}

// ============================================================================
// Balance lookup (existing CreditService — authoritative, read-only)
// ============================================================================

export async function getIntelligenceActionBalance(): Promise<number | null> {
  const ctx = await resolveBillingContext();
  if (!ctx) return null;
  try {
    return await CreditService.getBalance(ctx.organizationId);
  } catch (error) {
    console.warn("[intelligence] balance lookup failed", error);
    return null;
  }
}

// ============================================================================
// Signal review detail (existing signals table, RLS-scoped)
// ============================================================================

export async function getReviewSignal(
  signalId: string
): Promise<IntelligenceReviewSignal | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("signals")
    .select("*")
    .eq("id", signalId)
    .single();
  if (!data) return null;
  const signal = data as SignalRecord;

  let subject: string | null = signal.company_key;
  if (signal.prospect_id) {
    const { data: prospect } = await supabase
      .from("prospects")
      .select("company_name, name, contact_name")
      .eq("id", signal.prospect_id)
      .maybeSingle();
    if (prospect) {
      subject =
        (prospect.company_name as string) ||
        (prospect.name as string) ||
        (prospect.contact_name as string) ||
        subject;
    }
  }

  return {
    id: signal.id,
    subject,
    typeLabel: SIGNAL_TYPE_LABELS[signal.signal_type] ?? "Signal",
    title: signal.title,
    description: signal.description,
    interpretation: signal.interpretation,
    importanceLabel: SIGNAL_IMPORTANCE_LABELS[signal.importance] ?? "Medium",
    confidenceLabel: SIGNAL_CONFIDENCE_LABELS[signal.confidence] ?? "Medium",
    detectedAt: signal.detected_at,
    originExternal: signal.signal_origin === "external",
  };
}