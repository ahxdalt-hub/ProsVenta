// ============================================================================
// Prosventa Intelligence Orchestrator — Run Execution
// Stage 6 — Phase 6: Intelligence Orchestration (Final Phase)
// ============================================================================
// Executes ONE pipeline run for one prospect by coordinating the EXISTING
// intelligence services. This module implements no intelligence logic itself:
//
//   company enrichment      → existing company-enrichment service
//   person enrichment       → existing person-enrichment service
//   normalization/quality   → embedded in those services + scoring context
//   ICP scoring             → existing deterministic engine + upsert
//   signal detection        → existing signal service (internal + external)
//   recommendations         → existing evidence-based evaluation service
//
// Design rules:
//  - Provider-aware: services resolve providers/capabilities themselves; an
//    unconfigured capability surfaces as a SKIPPED operation, never a failure.
//  - Failure isolation: each operation is independently recorded; hard
//    dependencies gate downstream work, soft failures never stop the run.
//  - Idempotent: scores/recommendations/signals are deduplicated by the
//    existing upsert/dedupe mechanisms, so repeated runs are safe.
//  - Cost-safe: freshness checks inside the services prevent redundant
//    provider calls on refresh-less runs.
//  - Never throws: a failing run marks its job row failed and returns.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { intelligenceLogger } from "../logger";
import { sleep, getBackoffDelay } from "../retry";
import {
  canRunOperation,
  summarizeOperations,
  type OperationId,
  type OperationResult,
  type OperationResults,
} from "./operations";
import { parseRunMetadata, type PipelineRunMetadata } from "./state";
import type { IntelligenceJob } from "../types";

export const PIPELINE_JOB_TYPE = "intelligence_pipeline";
export const PIPELINE_PROVIDER = "intelligence-pipeline";

/** Extra orchestrator-level attempt for unexpected transient errors. */
const MAX_OP_ATTEMPTS = 2;

type OperationFnResult = {
  outcome: "success" | "failed" | "skipped";
  reason?: string | null;
};

// ============================================================================
// Operation execution wrapper (bounded retry for unexpected transient errors)
// ============================================================================

async function executeOperation(
  id: OperationId,
  prospectId: string,
  fn: () => Promise<OperationFnResult>
): Promise<OperationResult> {
  const startedAt = Date.now();
  let lastReason: string | null = null;

  for (let attempt = 1; attempt <= MAX_OP_ATTEMPTS; attempt++) {
    try {
      const result = await fn();
      // Skipped operations are terminal — retrying cannot help.
      if (result.outcome !== "failed" || attempt === MAX_OP_ATTEMPTS) {
        return { ...result, attempts: attempt, durationMs: Date.now() - startedAt };
      }
      lastReason = result.reason ?? null;
    } catch (error) {
      // Services handle provider retries internally; reaching here means an
      // unexpected error escaped. One bounded extra attempt with backoff.
      if (attempt === MAX_OP_ATTEMPTS) {
        intelligenceLogger.error("pipeline operation failed", {
          operation: id,
          target: prospectId,
          status: "failed",
          errorCategory: error instanceof Error ? error.name : "UNKNOWN",
          durationMs: Date.now() - startedAt,
        });
        return {
          outcome: "failed",
          attempts: attempt,
          reason: lastReason ?? "unexpected_error",
          durationMs: Date.now() - startedAt,
        };
      }
      await sleep(getBackoffDelay(attempt + 1));
    }
  }

  return { outcome: "failed", attempts: MAX_OP_ATTEMPTS, reason: lastReason };
}

// ============================================================================
// Individual operations (thin adapters over existing services)
// ============================================================================

async function runCompanyEnrichment(prospectId: string): Promise<OperationFnResult> {
  const { enrichCompanyForProspect } = await import("../company-enrichment/service");
  const result = await enrichCompanyForProspect(prospectId, "", { refresh: false });

  if (result.status === "completed") return { outcome: "success" };
  if (result.status === "processing") {
    // Another enrichment job is already running — skip so this run never
    // double-charges the provider.
    return { outcome: "skipped", reason: "already_in_progress" };
  }
  const message = (result.message || "").toLowerCase();
  if (message.includes("valid company domain") || message.includes("not found")) {
    return { outcome: "skipped", reason: "insufficient_data" };
  }
  return { outcome: "failed", reason: message.slice(0, 120) || "enrichment_failed" };
}

async function runPersonEnrichment(prospectId: string): Promise<OperationFnResult> {
  const { enrichPersonForProspect } = await import("../person-enrichment/service");
  const result = await enrichPersonForProspect(prospectId, { refresh: false });

  if (result.status === "completed") return { outcome: "success" };
  if (result.status === "processing") {
    return { outcome: "skipped", reason: "already_in_progress" };
  }

  // No usable person identity → honest skip, not a failure.
  const message = (result.message || "").toLowerCase();
  if (
    message.includes("identify this person") ||
    message.includes("couldn't identify") ||
    message.includes("enough information")
  ) {
    return { outcome: "skipped", reason: "insufficient_identity" };
  }
  return { outcome: "failed", reason: message.slice(0, 120) || "enrichment_failed" };
}

/**
 * Normalization/validation stage. Data-quality enforcement is EMBEDDED in the
 * enrichment services (normalize → validate before persist). This stage
 * evaluates whether validated data actually exists for downstream stages.
 */
async function runNormalization(results: OperationResults): Promise<OperationFnResult> {
  const company = results.company_enrichment;
  const person = results.person_enrichment;
  if (company?.outcome === "success" || person?.outcome === "success") {
    return { outcome: "success" };
  }
  if (
    (!company || company.outcome === "skipped") &&
    (!person || person.outcome === "skipped")
  ) {
    // Base prospect data still flows through scoring/validation unchanged.
    return { outcome: "skipped", reason: "no_enrichment_available" };
  }
  return { outcome: "failed", reason: "validation_failed" };
}

async function runScoring(prospectId: string): Promise<OperationFnResult> {
  // Existing deterministic engine pieces — no second scoring system.
  const [{ getIcpConfiguration }, { buildScoringContext }, { scoreProspectAgainstIcp },
    { assertValidIcpCriteria }, { upsertProspectScore }, { SCORING_VERSION }] =
    await Promise.all([
      import("@/lib/db/icp-scoring"),
      import("../scoring/context"),
      import("../scoring/engine"),
      import("../scoring/icp-validation"),
      import("@/lib/db/icp-scoring"),
      import("../scoring/types"),
    ]);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { outcome: "failed", reason: "unauthenticated" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();
  if (!membership) return { outcome: "failed", reason: "no_organization" };
  const orgId = membership.organization_id;

  const icpConfig = await getIcpConfiguration(orgId);
  // No ICP configured → no fabricated score. Honest skip.
  if (!icpConfig) return { outcome: "skipped", reason: "no_icp_configuration" };

  let criteria;
  try {
    criteria = assertValidIcpCriteria(icpConfig.criteria);
  } catch {
    return { outcome: "skipped", reason: "invalid_icp_configuration" };
  }

  try {
    // buildScoringContext verifies the prospect belongs to this org.
    const context = await buildScoringContext(prospectId, orgId);
    const result = scoreProspectAgainstIcp(context, criteria);
    // Upsert — repeated runs update the single stored score, never duplicate.
    await upsertProspectScore({
      prospect_id: prospectId,
      organization_id: orgId,
      icp_configuration_id: icpConfig.id,
      score: result.score,
      confidence: result.confidence,
      category: result.category,
      company_score: result.companyScore,
      prospect_score: result.prospectScore,
      factors: result.factors,
      scoring_version: SCORING_VERSION,
      scored_at: new Date().toISOString(),
    });
    return { outcome: "success" };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("not found")) {
      return { outcome: "skipped", reason: "prospect_unavailable" };
    }
    return { outcome: "failed", reason: message.slice(0, 120) || "scoring_error" };
  }
}

async function runSignalDetection(prospectId: string): Promise<OperationFnResult> {
  const { detectSignalsForProspect } = await import("../signals/service");
  const result = await detectSignalsForProspect(prospectId, { runExternal: true });

  if (result.status === "completed") return { outcome: "success" };

  // Unconfigured external provider / throttle → honest skip. A skip is NEVER
  // equivalent to "no signals found" — the UI communicates the difference.
  const reason = (result as { reason?: string }).reason;
  if (reason === "not_configured" || reason === "rate_limited") {
    return { outcome: "skipped", reason };
  }
  return { outcome: "failed", reason: reason ?? "detection_failed" };
}

async function runRecommendations(prospectId: string): Promise<OperationFnResult> {
  const { autoGenerateRecommendations } = await import(
    "../recommendations/auto-recommendations"
  );
  const result = await autoGenerateRecommendations([prospectId]);

  // The typed reason union is narrow; treat unknown reasons defensively.
  const reason = result.reason as string | undefined;
  switch (reason) {
    case "no_qualifying_prospects":
      // A genuinely evaluated outcome — score exists, no recommendation
      // warranted. Not a failure and not a skip.
      return { outcome: "success" };
    case "no_icp_configuration":
      return { outcome: "skipped", reason };
    case "no_organization":
    case "unauthenticated":
      return { outcome: "skipped", reason: "unauthorized" };
    case "error":
      return { outcome: "failed", reason: "evaluation_failed" };
    default:
      // evaluated/created/duplicates > 0 → real evaluation happened.
      return { outcome: "success" };
  }
}

// ============================================================================
// Pipeline run execution
// ============================================================================

/**
 * Executes a queued pipeline run row (intelligence_jobs, provider
 * 'intelligence-pipeline'). Claims the row conditionally so concurrent
 * workers can never double-process the same run.
 */
export async function executePipelineRun(job: IntelligenceJob): Promise<void> {
  const prospectId = job.prospect_id;
  if (!prospectId) return;

  const supabase = await createClient();

  // Concurrency guard: conditional claim — only one worker wins.
  const claim = await supabase
    .from("intelligence_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attempt_count: (job.attempt_count ?? 0) + 1,
    })
    .eq("id", job.id)
    .eq("status", "pending")
    .select("id");

  if (!claim.data || claim.data.length === 0) return; // already claimed

  const meta = parseRunMetadata(job.metadata);
  const results: OperationResults = {};
  let currentMeta: PipelineRunMetadata = { ...meta, operations: {} };

  /** Persists progressive state so a crash leaves an accurate record. */
  const persistProgress = async () => {
    await supabase
      .from("intelligence_jobs")
      .update({ metadata: currentMeta, updated_at: new Date().toISOString() })
      .eq("id", job.id);
  };

  intelligenceLogger.info("pipeline started", {
    operation: "intelligence_pipeline",
    target: prospectId,
    status: "processing",
    trigger: meta.trigger ?? null,
  });

  const steps: Array<{
    id: OperationId;
    gate?: () => boolean;
    run: () => Promise<OperationFnResult>;
  }> = [
    { id: "company_enrichment", run: () => runCompanyEnrichment(prospectId) },
    { id: "person_enrichment", run: () => runPersonEnrichment(prospectId) },
    { id: "normalization", run: () => runNormalization(results) },
    {
      id: "scoring",
      gate: () => canRunOperation("scoring", results),
      run: () => runScoring(prospectId),
    },
    { id: "signal_detection", run: () => runSignalDetection(prospectId) },
    {
      id: "recommendation_generation",
      gate: () => canRunOperation("recommendation_generation", results),
      run: () => runRecommendations(prospectId),
    },
  ];

  for (const step of steps) {
    // Dependency gating — hard dependency unsatisfied → blocked skip.
    if (step.gate && !step.gate()) {
      results[step.id] = { outcome: "skipped", attempts: 0, reason: "dependency_not_satisfied" };
      currentMeta = {
        ...currentMeta,
        operations: {
          ...currentMeta.operations,
          [step.id]: { outcome: "skipped", reason: "dependency_not_satisfied" },
        },
      };
      continue;
    }

    const result = await executeOperation(step.id, prospectId, () => step.run());
    results[step.id] = result;
    currentMeta = {
      ...currentMeta,
      operations: {
        ...currentMeta.operations,
        [step.id]: { outcome: result.outcome, reason: result.reason ?? null },
      },
    };
    await persistProgress();

    intelligenceLogger.info("pipeline operation finished", {
      operation: step.id,
      target: prospectId,
      status: result.outcome,
      durationMs: result.durationMs,
      retryCount: Math.max(0, result.attempts - 1),
      errorCategory: result.reason ?? undefined,
    });
  }

  // Final state — derived honestly from per-operation outcomes.
  const summary = summarizeOperations(results);
  let finalState: "completed" | "partially_completed" | "failed";
  if (summary.succeeded === 0 && summary.failed > 0) finalState = "failed";
  else if (summary.failed > 0 || summary.skipped > 0) finalState = "partially_completed";
  else finalState = "completed";

  const nowIso = new Date().toISOString();
  await supabase
    .from("intelligence_jobs")
    .update({
      status: finalState === "failed" ? "failed" : "completed",
      completed_at: nowIso,
      updated_at: nowIso,
      error_code:
        finalState === "failed"
          ? "PIPELINE_FAILED"
          : finalState === "partially_completed"
            ? "PARTIAL_RESULT"
            : null,
      error_message:
        finalState === "failed"
          ? "Intelligence processing could not complete for this prospect."
          : finalState === "partially_completed"
            ? "Some intelligence could not be retrieved."
            : null,
      metadata: { ...currentMeta, finalState },
    })
    .eq("id", job.id);

  // Stage 7 Phase 2: intelligence.completed / partially_completed / failed →
  // trigger engine. Fire-and-forget; never affects the run result.
  try {
    const { safeEmitWorkflowEvent } = await import(
      "@/features/intelligence/workflows/triggers/emit"
    );
    safeEmitWorkflowEvent({
      eventType:
        finalState === "completed"
          ? "intelligence.completed"
          : finalState === "partially_completed"
            ? "intelligence.partially_completed"
            : "intelligence.failed",
      organizationId: (job as unknown as { organization_id: string }).organization_id,
      targetType: "intelligence_run",
      targetId: job.id,
      payload: {
        job_id: job.id,
        prospect_id: prospectId,
        reason: summary.failed > 0 ? `${summary.failed}_operations_failed` : null,
        succeeded: summary.succeeded,
        failed: summary.failed,
        skipped: summary.skipped,
      },
      dedupeKey: `intelligence:${job.id}:${finalState}`,
    });
  } catch (err) {
    intelligenceLogger.error("pipeline event emission failed", { error: String(err) });
  }

  intelligenceLogger.info("pipeline finished", {
    operation: "intelligence_pipeline",
    target: prospectId,
    status: finalState,
    succeeded: summary.succeeded,
    failed: summary.failed,
    skipped: summary.skipped,
  });

  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/dashboard/prospects");
    revalidatePath("/dashboard/intelligence");
  } catch {
    // revalidatePath outside a request scope is a safe no-op here.
  }
}


