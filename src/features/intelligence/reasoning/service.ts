// ============================================================================
// Prosventa Intelligence — Central Service
// Feature 4 — Phase 1: server-side boundary for Intelligence operations.
// ============================================================================
// Responsibilities:
//   * resolve authorization SERVER-SIDE (org from membership, never the client)
//   * collect + validate context into the normalized ReasoningInput
//   * run the engine behind the model-provider abstraction
//   * store structured results with versioning + evidence refs
//   * determine freshness / staleness; reuse unchanged intelligence (caching)
//   * record usage metadata (measurement only — no billing in Phase 1)
//
// UI components never perform intelligence calculations directly.
// Graceful degradation: missing ICP/enrichment/signals never crash generation;
// AI/model failures preserve existing intelligence untouched. No fake
// intelligence is ever produced.
// ============================================================================

"use server";

import { createClient } from "@/lib/supabase/server";
import { IntelligenceError } from "../errors";
import { getIcpConfiguration } from "@/lib/db/icp-scoring";
import { recordIntelligenceUsage } from "@/lib/db/intelligence";
import {
  createPendingInsight,
  getEvidenceRefs,
  getLatestInsightForCompany,
  getLatestInsightForProspect,
  insertEvidenceRefs,
  updateInsight,
} from "@/lib/db/intelligence-insights";
import {
  finalizeContext,
  toReasoningSignals,
  buildSubjectFacts,
} from "./collect";
import { knownFact, type ReasoningInput } from "./context";
import {
  runIntelligenceEngine,
  ReasoningEngineError,
  reasoningModelRegistry,
} from "./engine";
import {
  runDeterministicAnalysis,
} from "./deterministic";
import { maybeRegisterEnvReasoningModel } from "./providers/openai-compatible";
import type { AiIntelligenceOutput } from "./schema";
import { canReuseIntelligence, evaluateStaleness } from "./invalidation";
import {
  GenerationThrottle,
  isStuckGeneration,
  isValidCompanyKey,
  isValidUuid,
} from "./hardening";

// ============================================================================
// Cost protection (§23, §26): bounded per-organization generation rate.
// The DB partial unique index dedupes concurrent generation for the SAME
// subject; this throttle additionally bounds volume ACROSS subjects so no
// browser can trigger unbounded AI work.
// NOTE: kept module-private — this file is "use server", which must only
// export async server actions.
// ============================================================================
const generationThrottle = new GenerationThrottle();

/** Malformed-id rejection used by every public entry point (§7). */
function invalidSubject(scope: IntelligenceScope, subjectId: unknown): IntelligenceOperationResult | null {
  const valid =
    scope === "prospect"
      ? isValidUuid(subjectId)
      : isValidCompanyKey(subjectId);
  if (valid) return null;
  return {
    status: "failed",
    message:
      scope === "prospect"
        ? "Invalid prospect id."
        : "Invalid company key.",
    insightId: null,
  };
}
import type {
  ConfidenceBreakdown,
  IntelligenceScope,
} from "./types";

const REASONING_ENGINE_VERSION = "phase2-intelligence-engine";

export interface IntelligenceOperationResult {
  status: "ready" | "stale" | "failed" | "in_progress" | "insufficient_evidence";
  message: string;
  insightId: string | null;
}

async function getOrgAndUser(): Promise<{ orgId: string; userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new IntelligenceError("AUTHENTICATION_FAILED");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) throw new IntelligenceError("AUTHENTICATION_FAILED");
  return { orgId: membership.organization_id, userId: user.id };
}

/** Verifies a prospect belongs to the caller's org (server-side). */
async function loadAuthorizedProspect(orgId: string, prospectId: string) {
  const supabase = await createClient();
  const { data: prospect } = await supabase
    .from("prospects")
    .select(
      "id, organization_id, company_name, website, industry, location, contact_name, contact_email, employee_count, updated_at"
    )
    .eq("id", prospectId)
    .single();
  if (!prospect || prospect.organization_id !== orgId) return null;
  return prospect as unknown as {
    id: string;
    organization_id: string;
    company_name: string | null;
    website: string | null;
    industry: string | null;
    location: string | null;
    contact_name: string | null;
    contact_email: string | null;
    employee_count: number | null;
    updated_at: string | null;
  };
}

type SignalRowInput = Parameters<typeof toReasoningSignals>[0][number];

async function loadSignalsForSubject(subject: {
  scope: IntelligenceScope;
  prospectId: string | null;
  companyKey: string | null;
}): Promise<SignalRowInput[]> {
  const supabase = await createClient();
  const columns =
    "id, signal_type, title, summary, status, importance, confidence, occurred_at, detected_at, source, source_url";

  if (subject.scope === "prospect" && subject.prospectId) {
    const filters = [`prospect_id.eq.${subject.prospectId}`];
    if (subject.companyKey) filters.push(`company_key.eq.${subject.companyKey}`);
    const { data } = await supabase
      .from("signals")
      .select(columns)
      .or(filters.join(","))
      .order("detected_at", { ascending: false })
      .limit(20);
    return (data ?? []) as SignalRowInput[];
  }
  if (subject.companyKey) {
    const { data } = await supabase
      .from("signals")
      .select(columns)
      .eq("company_key", subject.companyKey)
      .order("detected_at", { ascending: false })
      .limit(20);
    return (data ?? []) as SignalRowInput[];
  }
  return [];
}

async function loadEnrichmentAvailability(
  scope: IntelligenceScope,
  prospectId: string | null,
  companyKey: string | null
): Promise<ReasoningInputEnrichment> {
  const supabase = await createClient();
  let hasCompanyEnrichment = false;
  let hasProspectEnrichment = false;
  let lastRetrievedAt: string | null = null;
  let prospectJobTitle: string | null = null;

  try {
    if (companyKey && prospectId) {
      const { data } = await supabase
        .from("company_enrichments")
        .select("id, last_retrieved_at")
        .eq("prospect_id", prospectId)
        .eq("domain", companyKey)
        .maybeSingle();
      if (data) {
        hasCompanyEnrichment = true;
        lastRetrievedAt =
          (data as { last_retrieved_at?: string | null }).last_retrieved_at ?? null;
      }
    }
    if (scope === "prospect" && prospectId) {
      const { data } = await supabase
        .from("prospect_enrichments")
        .select("id, last_retrieved_at, enriched_at, data")
        .eq("prospect_id", prospectId)
        .maybeSingle();
      if (data) {
        hasProspectEnrichment = true;
        const row = data as {
          last_retrieved_at?: string | null;
          enriched_at?: string | null;
          data?: { person?: { jobTitle?: string | null } } | null;
        };
        // Relevant enriched field only — the normalized role feeds ICP matching.
        prospectJobTitle = row.data?.person?.jobTitle ?? null;
        lastRetrievedAt =
          lastRetrievedAt ?? row.last_retrieved_at ?? row.enriched_at ?? null;
      }
    }
  } catch {
    // Missing enrichment must never crash intelligence — confidence drops later.
  }

  return {
    hasCompanyEnrichment,
    hasProspectEnrichment,
    lastRetrievedAt,
    availableFields: [],
    prospectJobTitle,
  };
}

interface ReasoningInputEnrichment {
  hasCompanyEnrichment: boolean;
  hasProspectEnrichment: boolean;
  lastRetrievedAt: string | null;
  availableFields: string[];
  /** Role extracted from prospect enrichment (null when unknown). */
  prospectJobTitle: string | null;
}

// ============================================================================
// Context assembly
// ============================================================================

function normalizeCompanyKey(website: string | null): string | null {
  if (!website) return null;
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

async function collectContext(
  orgId: string,
  scope: IntelligenceScope,
  prospectId: string | null,
  companyKey: string | null
): Promise<{
  input: ReturnType<typeof finalizeContext>;
  icp: Awaited<ReturnType<typeof getIcpConfiguration>>;
} | null> {
  if (scope === "prospect" && !prospectId) return null;
  if (scope === "company" && !companyKey) return null;

  const prospect =
    scope === "prospect" && prospectId
      ? await loadAuthorizedProspect(orgId, prospectId)
      : null;
  // Organization isolation: a prospect from another org yields null → refuse.
  if (scope === "prospect" && !prospect) return null;

  const resolvedCompanyKey = companyKey ?? normalizeCompanyKey(prospect?.website ?? null);
  const { prospectFacts, companyFacts } = buildSubjectFacts(scope, prospect);

  const signalRows = await loadSignalsForSubject({
    scope,
    prospectId: prospect?.id ?? null,
    companyKey: resolvedCompanyKey,
  });
  const signals = toReasoningSignals(signalRows);
  const enrichment = await loadEnrichmentAvailability(
    scope,
    prospect?.id ?? null,
    resolvedCompanyKey
  );
  // Enriched role becomes a provenance-tracked fact (source: enrichment row).
  if (enrichment.prospectJobTitle && prospect) {
    prospectFacts.push(
      knownFact("prospect.job_title", enrichment.prospectJobTitle, "prospect_enrichments", prospect.id)
    );
  }
  const icp = await getIcpConfiguration(orgId);

  const prior =
    scope === "prospect" && prospect
      ? await getLatestInsightForProspect(orgId, prospect.id)
      : resolvedCompanyKey
        ? await getLatestInsightForCompany(orgId, resolvedCompanyKey)
        : null;

  const input = finalizeContext(
    orgId,
    {
      scope,
      prospectId: prospect?.id ?? null,
      companyKey: resolvedCompanyKey,
      companyName: prospect?.company_name ?? null,
    },
    icp,
    prospectFacts,
    companyFacts,
    enrichment,
    signals,
    {
      priorInsightVersion: prior?.version ?? null,
      priorGeneratedAt: prior?.generated_at ?? null,
      enrichmentLastRetrievedAt: enrichment.lastRetrievedAt,
      activityCounts: {},
    }
  );

  return { input, icp };
}

// ============================================================================
// Read path: latest intelligence + staleness evaluation (caching foundation)
// ============================================================================

export async function getProspectIntelligence(
  prospectId: string
): Promise<IntelligenceOperationResult> {
  const bad = invalidSubject("prospect", prospectId);
  if (bad) return bad;
  try {
    const { orgId } = await getOrgAndUser();
    const collected = await collectContext(orgId, "prospect", prospectId, null);
    if (!collected) {
      return { status: "failed", message: "You do not have access to this prospect.", insightId: null };
    }

    const existing = await getLatestInsightForProspect(orgId, prospectId);
    if (!existing) {
      return { status: "insufficient_evidence", message: "No intelligence generated yet.", insightId: null };
    }
    return evaluateExisting(orgId, existing, collected.input.input, collected.input.digest);
  } catch {
    // A missing data source must never crash the dashboard.
    return { status: "failed", message: "Unable to load intelligence.", insightId: null };
  }
}

export async function getCompanyIntelligence(
  companyKey: string
): Promise<IntelligenceOperationResult> {
  const bad = invalidSubject("company", companyKey);
  if (bad) return bad;
  try {
    const { orgId } = await getOrgAndUser();
    const collected = await collectContext(orgId, "company", null, companyKey);
    if (!collected) {
      return { status: "failed", message: "Invalid company key.", insightId: null };
    }
    const existing = await getLatestInsightForCompany(orgId, companyKey);
    if (!existing) {
      return { status: "insufficient_evidence", message: "No intelligence generated yet.", insightId: null };
    }
    return evaluateExisting(orgId, existing, collected.input.input, collected.input.digest);
  } catch {
    return { status: "failed", message: "Unable to load intelligence.", insightId: null };
  }
}

async function evaluateExisting(
  orgId: string,
  existing: { id: string; status: string; input_digest: string | null; icp_configuration_id: string | null; generated_at: string | null },
  collectedInput: ReasoningInput,
  currentDigest: string
): Promise<IntelligenceOperationResult> {
  if (existing.status === "pending" || existing.status === "processing") {
    return { status: "in_progress", message: "Intelligence is being generated.", insightId: existing.id };
  }
  if (existing.status === "failed") {
    return { status: "failed", message: "The last generation attempt failed.", insightId: existing.id };
  }

  const stored = {
    icpConfigurationId: existing.icp_configuration_id,
    inputDigest: existing.input_digest,
    generatedAt: existing.generated_at,
  };

  // Unchanged digest → same evidence → reuse intelligence (no regeneration).
  const reusable = canReuseIntelligence(stored, currentDigest);
  const staleCheck = evaluateStaleness(stored, collectedInput, currentDigest);

  if (!reusable && staleCheck.stale) {
    await updateInsight(orgId, existing.id, { status: "stale" });
    return {
      status: "stale",
      message: `Evidence has changed (${staleCheck.reasons.join(", ")}) — regeneration recommended.`,
      insightId: existing.id,
    };
  }
  return { status: "ready", message: "Intelligence is up to date.", insightId: existing.id };
}

// ============================================================================
// Generation path (versioning + graceful degradation)
// ============================================================================

export async function generateProspectIntelligence(
  prospectId: string,
  options?: { refresh?: boolean }
): Promise<IntelligenceOperationResult> {
  const bad = invalidSubject("prospect", prospectId);
  if (bad) return bad;
  try {
    const { orgId, userId } = await getOrgAndUser();

    const collected = await collectContext(orgId, "prospect", prospectId, null);
    if (!collected) {
      return { status: "failed", message: "You do not have access to this prospect.", insightId: null };
    }

    const existing = await getLatestInsightForProspect(orgId, prospectId);

    // Caching: unchanged evidence → reuse existing intelligence.
    if (
      !options?.refresh &&
      existing?.status === "ready" &&
      canReuseIntelligence(
        {
          icpConfigurationId: existing.icp_configuration_id,
          inputDigest: existing.input_digest,
          generatedAt: existing.generated_at,
        },
        collected.input.digest
      )
    ) {
      return { status: "ready", message: "Intelligence is already up to date.", insightId: existing.id };
    }

    return await runGeneration(orgId, userId, "prospect", collected, existing);
  } catch {
    return { status: "failed", message: "Unable to generate intelligence.", insightId: null };
  }
}

export async function generateCompanyIntelligence(
  companyKey: string,
  options?: { refresh?: boolean }
): Promise<IntelligenceOperationResult> {
  const bad = invalidSubject("company", companyKey);
  if (bad) return bad;
  try {
    const { orgId, userId } = await getOrgAndUser();
    const collected = await collectContext(orgId, "company", null, companyKey);
    if (!collected) {
      return { status: "failed", message: "Invalid company key.", insightId: null };
    }
    const existing = await getLatestInsightForCompany(orgId, companyKey);
    if (
      !options?.refresh &&
      existing?.status === "ready" &&
      canReuseIntelligence(
        {
          icpConfigurationId: existing.icp_configuration_id,
          inputDigest: existing.input_digest,
          generatedAt: existing.generated_at,
        },
        collected.input.digest
      )
    ) {
      return { status: "ready", message: "Intelligence is already up to date.", insightId: existing.id };
    }
    return await runGeneration(orgId, userId, "company", collected, existing);
  } catch {
    return { status: "failed", message: "Unable to generate intelligence.", insightId: null };
  }
}

interface CollectedContextBundle {
  input: import("./collect").CollectedContext;
  icp: Awaited<ReturnType<typeof getIcpConfiguration>>;
}

async function runGeneration(
  orgId: string,
  userId: string,
  scope: IntelligenceScope,
  collected: CollectedContextBundle,
  existing: {
    id: string;
    version: number;
    status: string;
    updated_at?: string | null;
    created_at?: string | null;
  } | null
): Promise<IntelligenceOperationResult> {
  // No ICP → do not invent one. No evidence at all → say so honestly.
  if (!collected.icp && !collected.input.hasAnyEvidence) {
    return {
      status: "insufficient_evidence",
      message: "No ICP configured and no evidence available — cannot generate intelligence.",
      insightId: existing?.id ?? null,
    };
  }

  // Cost protection (§23, §26): bounded per-organization generation rate so a
  // browser can never trigger unbounded AI work, even across many subjects.
  const slot = generationThrottle.tryAcquire(orgId);
  if (!slot.allowed) {
    return {
      status: "in_progress",
      message:
        slot.reason === "concurrency"
          ? "Too many intelligence generations are already running for your workspace. Please wait a moment."
          : "Please wait a moment before generating intelligence again.",
      insightId: existing?.id ?? null,
    };
  }

  try {
    return await startGeneration(orgId, userId, scope, collected, existing);
  } finally {
    generationThrottle.release(orgId);
  }
}

async function startGeneration(
  orgId: string,
  userId: string,
  scope: IntelligenceScope,
  collected: CollectedContextBundle,
  existing: {
    id: string;
    version: number;
    status: string;
    updated_at?: string | null;
    created_at?: string | null;
  } | null
): Promise<IntelligenceOperationResult> {
  const pendingInput = {
    organization_id: orgId,
    scope,
    prospect_id: scope === "prospect" ? collected.input.input.subject.prospectId : null,
    company_key: scope === "company" ? collected.input.input.subject.companyKey : null,
    icp_configuration_id: collected.icp?.id ?? null,
    previous_version_id: existing?.id ?? null,
    input_digest: collected.input.digest,
    // Versioning: each generation attempt is a strictly newer version than the
    // latest existing row. Never default to 1 — that would make version-based
    // ordering meaningless and could serve stale rows as "latest".
    version: (existing?.version ?? 0) + 1,
  };

  // Duplicate-generation guard (DB partial unique index). If another request is
  // already generating for this subject, report in-progress instead of racing…
  let created = await createPendingInsight(pendingInput);

  // …UNLESS the active row is STUCK (crashed process / lost worker). A stuck
  // pending/processing row would otherwise lock the subject forever behind the
  // unique index. Recovery: mark it failed (previous valid intelligence is
  // preserved — only the abandoned attempt is closed) and retry once (§21).
  if (
    created.duplicate &&
    existing &&
    (existing.status === "pending" || existing.status === "processing") &&
    isStuckGeneration(existing.updated_at ?? existing.created_at ?? null, Date.now())
  ) {
    await updateInsight(orgId, existing.id, {
      status: "failed",
      error_code: "stuck_generation_recovered",
      error_message:
        "A previous generation attempt never completed (interrupted process). It was closed automatically; you can safely retry.",
    });
    created = await createPendingInsight(pendingInput);
  }

  if (created.duplicate || !created.row) {
    return { status: "in_progress", message: "Intelligence generation already running.", insightId: existing?.id ?? null };
  }
  const insight = created.row;

  const startedAt = Date.now();
  try {
    await updateInsight(orgId, insight.id, { status: "processing" });

    // Phase 2 pipeline: deterministic analysis ALWAYS runs first. Objective
    // factors (ICP fit, timing arithmetic, evidence strength) never depend on
    // AI availability — and AI can never override them (§16, §26).
    const deterministic = runDeterministicAnalysis(collected.input.input);

    const task = scope === "prospect" ? "prospect_reasoning" : "company_reasoning";
    let aiOutput: AiIntelligenceOutput | null = null;
    let descriptor = { providerId: "deterministic-engine", modelId: `rules-${REASONING_ENGINE_VERSION}` };
    let engineMode: "ai" | "deterministic_fallback" = "deterministic_fallback";

    maybeRegisterEnvReasoningModel();
    if (reasoningModelRegistry.hasAny()) {
      try {
        const result = await runIntelligenceEngine(collected.input.input, task);
        // The validated AI response contributes INTERPRETATION ONLY
        // (explanation / key factors / concerns). Scores and priority remain
        // the deterministic ones so a model can never invent a priority.
        aiOutput = {
          dimensions: deterministic.output.dimensions,
          key_factors:
            result.output.key_factors.length > 0 ? result.output.key_factors : deterministic.output.key_factors,
          concerns:
            result.output.concerns.length > 0 ? result.output.concerns : deterministic.output.concerns,
          explanation: result.output.explanation ?? deterministic.output.explanation,
        };
        descriptor = result.descriptor;
        engineMode = "ai";
      } catch (error) {
        if (!(error instanceof ReasoningEngineError)) throw error;
        // model_unavailable / timeout / rate limit / invalid output → keep the
        // deterministic analysis; nothing fake is stored (§20, §36–37).
      }
    }

    const finalOutput = aiOutput ?? deterministic.output;
    await persistOutput(
      orgId,
      insight.id,
      collected,
      finalOutput,
      descriptor,
      Date.now() - startedAt,
      deterministic.confidence,
      engineMode
    );
    await trackUsage(orgId, userId, descriptor.modelId, collected.input.input, finalOutput, Date.now() - startedAt, "completed");

    return { status: "ready", message: "Intelligence generated.", insightId: insight.id };
  } catch (error) {
    // Graceful degradation: mark THIS attempt failed; preserve all prior data.
    const code = error instanceof ReasoningEngineError ? error.code : "provider_failure";
    await updateInsight(orgId, insight.id, {
      status: "failed",
      error_code: code,
      error_message: error instanceof Error ? error.message : String(error),
    }).catch(() => undefined);
    await trackUsage(orgId, userId, null, collected.input.input, null, Date.now() - startedAt, "failed", code);
    return {
      status: "failed",
      message:
        code === "model_unavailable"
          ? "The reasoning model is not available yet — no intelligence was invented."
          : "Intelligence generation failed — existing intelligence preserved.",
      insightId: insight.id,
    };
  }
}

async function persistOutput(
  orgId: string,
  insightId: string,
  collected: CollectedContextBundle,
  output: AiIntelligenceOutput,
  descriptor: { providerId: string; modelId: string },
  durationMs: number,
  confidence: ConfidenceBreakdown,
  engineMode: "ai" | "deterministic_fallback"
): Promise<void> {
  await updateInsight(orgId, insightId, {
    status: "ready",
    scores: { dimensions: output.dimensions },
    key_factors: output.key_factors as unknown[],
    concerns: output.concerns as unknown[],
    explanation: output.explanation,
    // Real, evidence-derived confidence (Phase 2) — never invented.
    confidence: confidence as unknown as Record<string, unknown>,
    freshness: {
      // Freshness metadata of the underlying evidence — derived from the
      // signal freshness architecture. UI must not recompute this.
      oldestEvidenceAt: oldestEvidence(collected.input.input),
      newestEvidenceAt: newestEvidence(collected.input.input),
    },
    engine: {
      provider_id: descriptor.providerId,
      model_id: descriptor.modelId,
      mode: engineMode,
      engine_version: REASONING_ENGINE_VERSION,
      duration_ms: durationMs,
    },
    icp_snapshot: collected.icp
      ? ({
          configurationId: collected.icp.id,
          name: collected.icp.name,
          criteria: collected.icp.criteria,
        } as Record<string, unknown>)
      : {},
    input_digest: collected.input.digest,
    generated_at: new Date().toISOString(),
  });

  await insertEvidenceRefs(orgId, insightId, collected.input.input.evidenceRefs);
}

// ============================================================================
// Cost measurement foundation (NO billing / credit deduction in Phase 1)
// ============================================================================

async function trackUsage(
  orgId: string,
  userId: string,
  modelId: string | null,
  input: ReasoningInput,
  output: AiIntelligenceOutput | null,
  durationMs: number,
  status: "completed" | "failed",
  failureCode?: string | null
): Promise<void> {
  try {
    await recordIntelligenceUsage({
      organization_id: orgId,
      user_id: userId,
      operation: "intelligence_generation",
      provider: "reasoning-engine",
      status,
      // Compact size measures only — never the payloads themselves.
      model: modelId,
      ...(status === "completed"
        ? {
            input_size: JSON.stringify(input).length,
            output_size: JSON.stringify(output).length,
          }
        : {}),
      duration_ms: durationMs,
      // Observability foundation (§39): failure classification without any
      // sensitive payload — codes only.
      usage_metadata: failureCode ? { failureCode } : null,
    });
  } catch {
    // Usage tracking must never break intelligence itself.
  }
}

function oldestEvidence(input: ReasoningInput): string | null {
  const times = input.signals
    .map((s) => s.occurredAt ?? s.detectedAt)
    .filter((t): t is string => Boolean(t))
    .sort();
  return times[0] ?? null;
}

function newestEvidence(input: ReasoningInput): string | null {
  const times = input.signals
    .map((s) => s.occurredAt ?? s.detectedAt)
    .filter((t): t is string => Boolean(t))
    .sort()
    .reverse();
  return times[0] ?? null;
}

// Re-export query helpers so consumers have a single import surface.
export { getEvidenceRefs as getInsightEvidenceRefs };
export type {
  IntelligenceInsightRow,
  IntelligenceEvidenceRefRow,
} from "@/lib/db/intelligence-insights";

// ============================================================================
// Phase 3: Read path for the Intelligence UI
// ============================================================================
// Opening a prospect must NEVER regenerate intelligence. These reads return
// the STORED insight only; generation is an explicit user action via
// generateProspectIntelligence / generateCompanyIntelligence.
// ============================================================================

async function loadInsightView(
  orgId: string,
  scope: IntelligenceScope,
  subjectId: string
): Promise<import("./view").IntelligenceView> {
  const { mapViewFromRows } = await import("./view");
  try {
    const supabase = await createClient();
    const column = scope === "prospect" ? "prospect_id" : "company_key";
    const { data: rows } = await supabase
      .from("intelligence_insights")
      .select(
        "id, status, explanation, scores, key_factors, concerns, confidence, freshness, generated_at"
      )
      .eq("organization_id", orgId)
      .eq(column, subjectId)
      .order("created_at", { ascending: false })
      .order("version", { ascending: false })
      .limit(1);

    type SlimRow = {
      id: string;
      status: string;
      explanation: string | null;
      scores: Record<string, unknown> | null;
      key_factors: unknown[] | null;
      concerns: unknown[] | null;
      confidence: Record<string, unknown> | null;
      freshness: Record<string, unknown> | null;
      generated_at: string | null;
    };

    const row = (rows as SlimRow[] | null)?.[0] ?? null;

    let evidence: import("./view").EvidenceRowLike[] = [];
    if (row) {
      const refs = await getEvidenceRefs(orgId, row.id);
      evidence = (refs ?? []).map((r) => ({
        id: r.id,
        ref_type: r.ref_type,
        source: r.source,
        occurred_at: r.occurred_at,
        captured_at: r.captured_at,
        freshness: r.freshness,
        note: r.note,
      }));
    }

    return mapViewFromRows(row, evidence);
  } catch {
    // Read failures degrade to "not generated yet" — never a crash, never fake data.
    return mapViewFromRows(null, []);
  }
}

export async function getProspectIntelligenceView(
  prospectId: string
): Promise<import("./view").IntelligenceView> {
  try {
    const { orgId } = await getOrgAndUser();
    return await loadInsightView(orgId, "prospect", prospectId);
  } catch {
    return (await import("./view")).mapViewFromRows(null, []);
  }
}

export async function getCompanyIntelligenceView(
  companyKey: string
): Promise<import("./view").IntelligenceView> {
  try {
    const { orgId } = await getOrgAndUser();
    return await loadInsightView(orgId, "company", companyKey);
  } catch {
    return (await import("./view")).mapViewFromRows(null, []);
  }
}
