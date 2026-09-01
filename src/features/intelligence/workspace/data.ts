// ============================================================================
// Prosventa Intelligence Workspace — Page Data Loaders
// ============================================================================
// Server-only read layer for the Intelligence page. Consumes EXISTING
// Prosventa systems (signals DB layer, intelligence_jobs, credits service,
// RLS-scoped Supabase client) — it never duplicates business logic and never
// writes. Every loader is independently fail-soft: callers catch errors so a
// single failed data source cannot take down the whole page.
// ============================================================================
import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getRecentSignalsForWorkspace } from "@/lib/db/signals";
import { CreditService } from "@/features/credits/service";
import { resolveBillingContext } from "@/features/credits/billing";
import {
  SIGNAL_IMPORTANCE_LABELS,
  SIGNAL_TYPE_LABELS,
  type SignalImportance,
} from "../signals/types";
import {
  type IntelligenceJob,
  type IntelligenceOperation,
} from "../types";

// ============================================================================
// View models
// ============================================================================

export interface PriorityItem {
  id: string;
  /** Short kicker, e.g. "Signal detected · Hiring activity" */
  label: string;
  /** Company / prospect this concerns */
  subject: string | null;
  /** What happened (grounded signal title) */
  title: string;
  /** Why it matters (grounded signal description) */
  description: string;
  when: string;
  importanceLabel: string;
}

export interface SignalListItem {
  id: string;
  typeLabel: string;
  subject: string | null;
  title: string;
  description: string;
  when: string;
  confidenceLabel: string;
  originExternal: boolean;
}

export interface ActivityItem {
  id: string;
  /** Scannable operation label, e.g. "Prospect researched" */
  label: string;
  /** Prospect / company the operation concerned */
  subject: string | null;
  when: string;
}

export interface IntelligenceSummaryData {
  operations: number;
  signalsDetected: number;
  researchRuns: number;
  enrichmentRuns: number;
}

export interface IntelligenceHealth {
  state: "healthy" | "attention";
  message: string;
}

export interface CreditSnapshot {
  balance: number;
  usedRecently: number;
}

// ============================================================================
// Helpers
// ============================================================================

const IMPORTANCE_RANK: Record<SignalImportance, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const CONFIDENCE_LABELS = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
} as const;

/** Human-readable operation labels for the activity feed. */
const ACTIVITY_JOB_LABELS: Record<IntelligenceOperation, string> = {
  prospect_research: "Prospect researched",
  company_research: "Company researched",
  prospect_enrichment: "Prospect enriched",
  company_enrichment: "Company enriched",
  signals: "Signal detection ran",
  intelligence_generation: "Intelligence generated",
};

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Batched prospect-name lookup for signal/job subjects. One bounded query,
 * RLS-scoped — never fetches payloads the page does not show.
 */
async function getProspectSubjects(
  prospectIds: string[]
): Promise<Map<string, string>> {
  if (prospectIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospects")
    .select("id, company_name, name")
    .in("id", prospectIds.slice(0, 50));
  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{
    id: string;
    company_name: string | null;
    name: string | null;
  }>) {
    map.set(row.id, row.company_name || row.name || "Unknown");
  }
  return map;
}

// ============================================================================
// Priority Intelligence
// ============================================================================

/**
 * Surfaces what the user should care about: active workspace signals ranked
 * by REAL stored importance first, then recency. Never "newest rows" — low-
 * importance signals only appear when nothing more important exists.
 */
export async function getPriorityIntelligence(): Promise<PriorityItem[]> {
  const signals = await getRecentSignalsForWorkspace(25);
  if (signals.length === 0) return [];

  const ranked = [...signals].sort((a, b) => {
    const byImportance =
      IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance];
    if (byImportance !== 0) return byImportance;
    return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
  });

  // Only surface signals whose stored importance warrants attention.
  const notable = ranked.filter((s) => s.importance !== "low").slice(0, 4);
  const chosen = notable.length > 0 ? notable : ranked.slice(0, 2);

  const subjects = await getProspectSubjects(
    chosen.map((s) => s.prospect_id).filter((id): id is string => Boolean(id))
  );

  return chosen.map((s) => ({
    id: s.id,
    label: `Signal detected · ${SIGNAL_TYPE_LABELS[s.signal_type]}`,
    subject: (s.prospect_id ? subjects.get(s.prospect_id) : null) ?? null,
    title: s.title,
    description: s.description || s.interpretation || "",
    when: s.detected_at,
    importanceLabel: SIGNAL_IMPORTANCE_LABELS[s.importance],
  }));
}

// ============================================================================
// Signals Section
// ============================================================================

export async function getWorkspaceSignals(): Promise<SignalListItem[]> {
  const signals = await getRecentSignalsForWorkspace(8);
  if (signals.length === 0) return [];

  const subjects = await getProspectSubjects(
    signals.map((s) => s.prospect_id).filter((id): id is string => Boolean(id))
  );

  return signals.map((s) => ({
    id: s.id,
    typeLabel: SIGNAL_TYPE_LABELS[s.signal_type],
    subject: (s.prospect_id ? subjects.get(s.prospect_id) : null) ?? null,
    title: s.title,
    description: s.description,
    when: s.detected_at,
    confidenceLabel: CONFIDENCE_LABELS[s.confidence],
    originExternal: s.signal_origin === "external",
  }));
}

// ============================================================================
// Recent Intelligence Activity
// ============================================================================

async function getRecentJobs(limit: number): Promise<IntelligenceJob[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("intelligence_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as IntelligenceJob[]).filter(
    (job) => job.created_at >= daysAgoIso(14)
  );
}

/**
 * Compact merged feed of supported intelligence operations: jobs
 * (research / enrichment / detection) plus signal activity. Real records
 * only, newest first, capped for scannability.
 */
export async function getRecentActivity(): Promise<ActivityItem[]> {
  const [jobs, signals] = await Promise.all([
    getRecentJobs(20),
    getRecentSignalsForWorkspace(20),
  ]);

  const jobSubjectIds = jobs
    .map((j) => j.prospect_id)
    .filter((id): id is string => Boolean(id));
  const signalSubjectIds = signals
    .map((s) => s.prospect_id)
    .filter((id): id is string => Boolean(id));
  const subjects = await getProspectSubjects([
    ...new Set([...jobSubjectIds, ...signalSubjectIds]),
  ]);

  const merged: Array<ActivityItem & { at: string }> = [
    ...jobs.map((job) => ({
      id: `job:${job.id}`,
      label: ACTIVITY_JOB_LABELS[job.job_type] ?? "Intelligence operation",
      subject: (job.prospect_id ? subjects.get(job.prospect_id) : null) ?? null,
      at: job.created_at,
      when: job.created_at,
    })),
    ...signals.map((signal) => ({
      id: `signal:${signal.id}`,
      label: `Signal detected · ${SIGNAL_TYPE_LABELS[signal.signal_type]}`,
      subject:
        (signal.prospect_id ? subjects.get(signal.prospect_id) : null) ?? null,
      at: signal.detected_at,
      when: signal.detected_at,
    })),
  ];

  merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return merged.slice(0, 8).map(({ at: _at, ...item }) => item);
}

// ============================================================================
// Summary (bounded COUNT queries — never full scans)
// ============================================================================

export async function getIntelligenceSummary(): Promise<IntelligenceSummaryData> {
  const supabase = await createClient();
  const weekAgo = daysAgoIso(7);

  const [operations, signals, research, prospectEnrichment, companyEnrichment] =
    await Promise.all([
      supabase
        .from("intelligence_jobs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo),
      supabase
        .from("signals")
        .select("id", { count: "exact", head: true })
        .gte("detected_at", weekAgo),
      supabase
        .from("intelligence_jobs")
        .select("id", { count: "exact", head: true })
        .in("job_type", ["company_research", "prospect_research"])
        .gte("created_at", weekAgo),
      supabase
        .from("intelligence_jobs")
        .select("id", { count: "exact", head: true })
        .eq("job_type", "prospect_enrichment")
        .gte("created_at", weekAgo),
      supabase
        .from("intelligence_jobs")
        .select("id", { count: "exact", head: true })
        .eq("job_type", "company_enrichment")
        .gte("created_at", weekAgo),
    ]);

  return {
    operations: operations.count ?? 0,
    signalsDetected: signals.count ?? 0,
    researchRuns: research.count ?? 0,
    enrichmentRuns:
      (prospectEnrichment.count ?? 0) + (companyEnrichment.count ?? 0),
  };
}

// ============================================================================
// Intelligence Health (REAL application state — never fabricated)
// ============================================================================

/**
 * Derives the status area from actual job outcomes: recent FAILED
 * intelligence operations mean something needs attention. Everything else is
 * reported as working normally — no invented health infrastructure.
 */
export async function getIntelligenceHealth(): Promise<IntelligenceHealth> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("intelligence_jobs")
    .select("id")
    .eq("status", "failed")
    .gte("updated_at", daysAgoIso(3))
    .limit(1);

  if ((data ?? []).length > 0) {
    return {
      state: "attention",
      message: "Some recent intelligence operations did not complete.",
    };
  }
  return { state: "healthy", message: "Intelligence is working normally." };
}

// ============================================================================
// Credit Snapshot (existing credit architecture — read-only)
// ============================================================================

/**
 * Reads the org wallet balance through the canonical CreditService and sums
 * consumption entries from the last 30 days of the ledger. Returns null when
 * no wallet exists yet — the UI simply hides the credit line.
 */
export async function getCreditSnapshot(): Promise<CreditSnapshot | null> {
  const ctx = await resolveBillingContext();
  if (!ctx) return null;

  const balance = await CreditService.getBalance(ctx.organizationId);
  const entries = await CreditService.getLedger(ctx.organizationId, {
    limit: 200,
  });
  const cutoff = daysAgoIso(30);
  const usedRecently = entries
    .filter(
      (e) =>
        e.amount < 0 && e.type !== "reservation" && e.created_at >= cutoff
    )
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);

  return { balance, usedRecently };
}



