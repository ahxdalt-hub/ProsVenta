// ============================================================================
// Prosventa Enrichment — Bulk Server Actions (client boundary)
// Feature 2: Enrichment - Phase 3 of 4
// ============================================================================
// The ONLY entry points for bulk enrichment from the browser:
//
//   getBulkEnrichmentEstimate  → real catalog cost + live balance (no charge)
//   startBulkEnrichment        → validate → reserve → queue → process (after)
//   getBulkEnrichmentStatus    → REAL backend state for progress polling
//   cancelBulkEnrichment       → stops un-started work; never unbills done work
//   retryFailedBulkJobs        → bounded, credit-aware retry of eligible jobs
//
// Security model (mirrors Phase 1/2):
//   - organization ALWAYS resolved from the session; never trusted from input
//   - every prospect verified to belong to that organization
//   - credits move ONLY through CreditService RPCs; the browser can never set
//     amounts, finalize usage, or mark jobs completed
// ============================================================================

"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreditService } from "@/features/credits/service";
import { toCreditError } from "@/features/credits/errors";
import {
  BULK_ENRICHMENT_MAX_PROSPECTS,
  buildBulkOperationKey,
  computeBulkEstimate,
  isRetryableBulkJob,
} from "./bulk";

export interface BulkEstimateResult {
  ok: boolean;
  message: string | null;
  prospectCount: number;
  unitCost: number;
  estimatedCost: number;
  availableCredits: number;
  maxProspects: number;
  exceedsLimit: boolean;
  insufficientCredits: boolean;
  shortfall: number;
  /** Active operation already running for this organization, if any. */
  activeOperationId: string | null;
}

function estimateFailure(message: string): BulkEstimateResult {
  return {
    ok: false,
    message,
    prospectCount: 0,
    unitCost: 0,
    estimatedCost: 0,
    availableCredits: 0,
    maxProspects: BULK_ENRICHMENT_MAX_PROSPECTS,
    exceedsLimit: false,
    insufficientCredits: false,
    shortfall: 0,
    activeOperationId: null,
  };
}

async function resolveActor(): Promise<{
  userId: string;
  organizationId: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();
  if (!membership?.organization_id) return null;
  return { userId: user.id, organizationId: membership.organization_id as string };
}

/** Deduplicates and verifies EVERY id belongs to the caller's organization. */
async function validateProspectSelection(
  prospectIds: string[]
): Promise<{ valid: string[] } | { invalid: true }> {
  const unique = Array.from(new Set(prospectIds)).filter(Boolean);
  if (unique.length === 0) return { invalid: true };
  const actor = await resolveActor();
  if (!actor) return { invalid: true };
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospects")
    .select("id")
    .eq("organization_id", actor.organizationId)
    .in("id", unique);
  const valid = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  // Never silently truncate: any unknown/foreign id fails the whole request.
  if (valid.length !== unique.length) return { invalid: true };
  return { valid };
}

// ----------------------------------------------------------------------------
// Estimate — real catalog cost + live wallet balance. Opens NO reservation
// and performs NO provider call.
// ----------------------------------------------------------------------------
export async function getBulkEnrichmentEstimate(
  prospectIds: string[]
): Promise<BulkEstimateResult> {
  const actor = await resolveActor();
  if (!actor) return estimateFailure("Please sign in to enrich prospects.");

  // Clear any operation orphaned by a crash/restart BEFORE the active check,
  // so a stale run can never permanently block new bulk work or strand credits.
  const runner = await import("./bulk-runner");
  await runner.recoverStaleBulkEnrichmentOperations();

  const checked = await validateProspectSelection(prospectIds);
  if ("invalid" in checked) {
    return estimateFailure(
      "Some selected prospects are not available in your organization."
    );
  }

  const count = checked.valid.length;
  const estimate = computeBulkEstimate(count);

  // One active bulk operation per organization (server-enforced).
  const supabase = await createClient();
  const { data: active } = await supabase
    .from("bulk_enrichment_operations")
    .select("id")
    .eq("organization_id", actor.organizationId)
    .in("status", ["queued", "processing"])
    .limit(1);
  const activeOperationId =
    ((active ?? [])[0] as { id: string } | undefined)?.id ?? null;

  let availableCredits = 0;
  try {
    availableCredits = await CreditService.getBalance(actor.organizationId);
  } catch {
    return estimateFailure("Could not read your credit balance right now.");
  }

  const exceedsLimit = count > BULK_ENRICHMENT_MAX_PROSPECTS;
  const shortfall = Math.max(estimate.estimatedCost - availableCredits, 0);

  return {
    ok: true,
    message:
      exceedsLimit && count > 0
        ? `Bulk enrichment is limited to ${BULK_ENRICHMENT_MAX_PROSPECTS} prospects per operation.`
        : activeOperationId && count > 0
          ? "A bulk enrichment is already running for your organization."
          : null,
    prospectCount: count,
    unitCost: estimate.unitCost,
    estimatedCost: estimate.estimatedCost,
    availableCredits,
    maxProspects: BULK_ENRICHMENT_MAX_PROSPECTS,
    exceedsLimit,
    insufficientCredits: shortfall > 0,
    shortfall,
    activeOperationId,
  };
}

export interface BulkStartResult {
  ok: boolean;
  message: string | null;
  operationId: string | null;
  error:
    | "unauthenticated"
    | "invalid_selection"
    | "limit_exceeded"
    | "operation_in_progress"
    | "insufficient_credits"
    | "reserve_failed"
    | "error"
    | null;
  required?: number;
  available?: number;
}

/**
 * Starts a bulk enrichment operation:
 *   validate → preflight → RESERVE (server-side, atomic RPC) → queue jobs
 *   → process via `after()` (server-side worker; browser only observes).
 * Duplicate clicks/requests resolve to the SAME active operation.
 */
export async function startBulkEnrichment(
  prospectIds: string[]
): Promise<BulkStartResult> {
  const actor = await resolveActor();
  if (!actor) {
    return { ok: false, message: "Please sign in.", operationId: null, error: "unauthenticated" };
  }

  const checked = await validateProspectSelection(prospectIds);
  if ("invalid" in checked || checked.valid.length === 0) {
    return {
      ok: false,
      message: "The selected prospects are not available in your organization.",
      operationId: null,
      error: "invalid_selection",
    };
  }
  const ids = checked.valid;
  if (ids.length > BULK_ENRICHMENT_MAX_PROSPECTS) {
    return {
      ok: false,
      message: `You selected ${ids.length} prospects, but bulk enrichment is limited to ${BULK_ENRICHMENT_MAX_PROSPECTS} per operation.`,
      operationId: null,
      error: "limit_exceeded",
    };
  }

  const admin = createAdminClient();

  // Stuck-operation protection: recover crash-orphaned runs before deciding
  // whether an operation is genuinely active (same rationale as the estimate).
  try {
    const runner = await import("./bulk-runner");
    await runner.recoverStaleBulkEnrichmentOperations();
  } catch {
    /* recovery is best-effort — never blocks starting real work */
  }

  // Idempotency: an active operation for this org wins — a double-click or a
  // refreshed page re-attaches instead of creating duplicate work.
  const { data: existing } = await admin
    .from("bulk_enrichment_operations")
    .select("id, status")
    .eq("organization_id", actor.organizationId)
    .in("status", ["queued", "processing"])
    .limit(1);
  const existingOp = (existing ?? [])[0] as { id: string; status: string } | undefined;
  if (existingOp) {
    return {
      ok: true,
      message: "A bulk enrichment is already running for your organization.",
      operationId: existingOp.id,
      error: "operation_in_progress",
    };
  }

  const estimate = computeBulkEstimate(ids.length);
  const key = buildBulkOperationKey({
    organizationId: actor.organizationId,
    userId: actor.userId,
    prospectIds: ids,
  });

  const now = new Date().toISOString();
  const { data: created, error: insertError } = await admin
    .from("bulk_enrichment_operations")
    .insert({
      organization_id: actor.organizationId,
      created_by: actor.userId,
      status: "queued",
      total_prospects: ids.length,
      reserved_credits: estimate.estimatedCost,
      idempotency_key: `${key}:${Date.now()}`,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    // Lost an insert race against another starting operation — attach to it.
    const { data: raceWinner } = await admin
      .from("bulk_enrichment_operations")
      .select("id")
      .eq("organization_id", actor.organizationId)
      .in("status", ["queued", "processing"])
      .limit(1);
    const op = (raceWinner ?? [])[0] as { id: string } | undefined;
    if (op) {
      return {
        ok: true,
        message: "A bulk enrichment is already running.",
        operationId: op.id,
        error: "operation_in_progress",
      };
    }
    return { ok: false, message: "Could not start the operation.", operationId: null, error: "error" };
  }
  const operationId = (created as { id: string }).id;

  // RESERVE before ANY provider work — the reservation happens inside the
  // central SECURITY DEFINER RPC with row locks and balance guards.
  try {
    await CreditService.reserve({
      actor: { userId: actor.userId },
      organizationId: actor.organizationId,
      amount: estimate.estimatedCost,
      reference: { type: "enrichment", id: operationId },
    });
  } catch (error) {
    const credit = toCreditError(error);
    await admin
      .from("bulk_enrichment_operations")
      .update({ status: "failed", completed_at: now, updated_at: now })
      .eq("id", operationId)
      .in("status", ["queued"]);
    if (credit.code === "INSUFFICIENT_CREDITS") {
      return {
        ok: false,
        message: "Not enough credits available for this operation.",
        operationId: null,
        error: "insufficient_credits",
        required: estimate.estimatedCost,
        available: credit.balance ?? 0,
      };
    }
    return { ok: false, message: "Could not reserve credits.", operationId: null, error: "reserve_failed" };
  }

  // Queue one job per prospect — each carries its share of the reservation.
  const rows = ids.map((prospectId) => ({
    operation_id: operationId,
    organization_id: actor.organizationId,
    prospect_id: prospectId,
    created_by: actor.userId,
    status: "queued",
    max_attempts: 2,
    reserved_credits: estimate.unitCost,
  }));
  const { error: jobsError } = await admin.from("bulk_enrichment_jobs").insert(rows);
  if (jobsError) {
    // Release what could never be used — no stranded reservations.
    try {
      await CreditService.release({
        actor: { userId: actor.userId },
        organizationId: actor.organizationId,
        amount: estimate.estimatedCost,
        idempotencyKey: `bulk-release:${operationId}`,
        reference: { type: "enrichment", id: operationId },
      });
    } catch {
      /* reconcile_org_credits remains the safety net */
    }
    await admin
      .from("bulk_enrichment_operations")
      .update({
        status: "failed",
        released_credits: estimate.estimatedCost,
        completed_at: now,
        updated_at: now,
      })
      .eq("id", operationId);
    return { ok: false, message: "Could not create enrichment jobs.", operationId: null, error: "error" };
  }

  // Server-side processing via the EXISTING after() dispatch pattern — closing
  // or minimizing the window never interrupts it.
  after(async () => {
    try {
      const { runBulkEnrichmentOperation } = await import("./bulk-runner");
      await runBulkEnrichmentOperation(operationId!);
    } catch (err) {
      console.error(`[enrichment] bulk runner crashed for ${operationId}:`, err);
    }
  });

  return { ok: true, message: null, operationId, error: null };
}

// ----------------------------------------------------------------------------
// Status — REAL backend state for progress polling. Bounded payload only.
// ----------------------------------------------------------------------------
export interface BulkStatusResult {
  ok: boolean;
  found: boolean;
  status: string;
  total: number;
  counters: {
    enriched: number;
    partial: number;
    skipped: number;
    failed: number;
    cancelled: number;
  };
  processing: number;
  queued: number;
  reservedCredits: number;
  usedCredits: number;
  releasedCredits: number;
  retryableFailed: number;
}

function notFoundStatus(): BulkStatusResult {
  return {
    ok: false,
    found: false,
    status: "unknown",
    total: 0,
    counters: { enriched: 0, partial: 0, skipped: 0, failed: 0, cancelled: 0 },
    processing: 0,
    queued: 0,
    reservedCredits: 0,
    usedCredits: 0,
    releasedCredits: 0,
    retryableFailed: 0,
  };
}

export async function getBulkEnrichmentStatus(
  operationId: string
): Promise<BulkStatusResult> {
  const actor = await resolveActor();
  if (!actor) return notFoundStatus();

  // RLS additionally scopes this read; the org filter is defense-in-depth.
  const supabase = await createClient();
  const { data: op } = await supabase
    .from("bulk_enrichment_operations")
    .select("*")
    .eq("id", operationId)
    .eq("organization_id", actor.organizationId)
    .maybeSingle();
  if (!op) return notFoundStatus();

  const operation = op as Record<string, unknown>;
  const { data: jobs } = await supabase
    .from("bulk_enrichment_jobs")
    .select("status, attempt_count, max_attempts, error_category")
    .eq("operation_id", operationId);

  const counters = { enriched: 0, partial: 0, skipped: 0, failed: 0, cancelled: 0 };
  let processing = 0;
  let queued = 0;
  let retryableFailed = 0;
  for (const raw of (jobs ?? []) as Array<Record<string, unknown>>) {
    switch (raw.status) {
      case "completed": counters.enriched += 1; break;
      case "partial": counters.partial += 1; break;
      case "skipped": counters.skipped += 1; break;
      case "cancelled": counters.cancelled += 1; break;
      case "processing": processing += 1; break;
      case "queued": queued += 1; break;
      default:
        counters.failed += 1;
        if (
          isRetryableBulkJob({
            status: "failed",
            attemptCount: Number(raw.attempt_count ?? 0),
            maxAttempts: Number(raw.max_attempts ?? 2),
            errorCategory: (raw.error_category as string | null) ?? null,
          })
        ) {
          retryableFailed += 1;
        }
    }
  }

  return {
    ok: true,
    found: true,
    status: String(operation.status ?? "unknown"),
    total: Number(operation.total_prospects ?? 0),
    counters,
    processing,
    queued,
    reservedCredits: Number(operation.reserved_credits ?? 0),
    usedCredits: Number(operation.used_credits ?? 0),
    releasedCredits: Number(operation.released_credits ?? 0),
    retryableFailed,
  };
}

// ----------------------------------------------------------------------------
// Cancellation — stops only work that has NOT become billable. Completed
// provider operations are never "unbilled" by cancellation.
// ----------------------------------------------------------------------------
export async function cancelBulkEnrichment(
  operationId: string
): Promise<{ ok: boolean; message: string | null }> {
  const actor = await resolveActor();
  if (!actor) return { ok: false, message: "Please sign in." };

  const admin = createAdminClient();
  // Ownership + state check via the org-scoped conditional update itself.
  const { data } = await admin
    .from("bulk_enrichment_operations")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", operationId)
    .eq("organization_id", actor.organizationId)
    .in("status", ["queued", "processing"])
    .select("id");

  if (!data || data.length === 0) {
    return { ok: false, message: "This operation can no longer be cancelled." };
  }

  // The runner observes the cancelled status at each claim boundary and
  // finalizes: un-started jobs → cancelled (released), finished jobs stay
  // billable. If the runner already exited (nothing was claimed), force the
  // idempotent finalize here so credits never stay stranded.
  after(async () => {
    try {
      const runner = await import("./bulk-runner");
      await runner.finalizeCancelledBulkOperation(operationId);
    } catch (err) {
      console.error(`[enrichment] bulk cancel-finalize failed for ${operationId}:`, err);
    }
  });

  return { ok: true, message: null };
}

// ----------------------------------------------------------------------------
// Bounded retry — only eligible failed jobs, with a fresh reservation.
// ----------------------------------------------------------------------------
export async function retryFailedBulkJobs(
  operationId: string
): Promise<{ ok: boolean; message: string | null; retried: number }> {
  const actor = await resolveActor();
  if (!actor) return { ok: false, message: "Please sign in.", retried: 0 };

  const admin = createAdminClient();
  const { data: op } = await admin
    .from("bulk_enrichment_operations")
    .select("id, status, organization_id, reserved_credits")
    .eq("id", operationId)
    .eq("organization_id", actor.organizationId)
    .maybeSingle();
  if (!op) return { ok: false, message: "Operation not found.", retried: 0 };
  const operation = op as {
    id: string;
    status: string;
    organization_id: string;
    reserved_credits: number;
  };

  const { data: failedJobs } = await admin
    .from("bulk_enrichment_jobs")
    .select("id, status, attempt_count, max_attempts, error_category")
    .eq("operation_id", operation.id)
    .eq("status", "failed");

  const eligible = ((failedJobs ?? []) as Array<Record<string, unknown>>).filter((j) =>
    isRetryableBulkJob({
      status: String(j.status),
      attemptCount: Number(j.attempt_count ?? 0),
      maxAttempts: Number(j.max_attempts ?? 2),
      errorCategory: (j.error_category as string | null) ?? null,
    })
  );
  if (eligible.length === 0) {
    return { ok: false, message: "No failed enrichments are retryable.", retried: 0 };
  }

  const estimate = computeBulkEstimate(eligible.length);

  try {
    await CreditService.reserve({
      actor: { userId: actor.userId },
      organizationId: operation.organization_id,
      amount: estimate.estimatedCost,
      reference: { type: "enrichment", id: `${operation.id}:retry` },
    });
  } catch (error) {
    const credit = toCreditError(error);
    if (credit.code === "INSUFFICIENT_CREDITS") {
      return {
        ok: false,
        message: `Not enough credits to retry ${eligible.length} enrichments.`,
        retried: 0,
      };
    }
    return { ok: false, message: "Could not reserve credits for retry.", retried: 0 };
  }

  await Promise.all(
    eligible.map((j) =>
      admin
        .from("bulk_enrichment_jobs")
        .update({
          status: "queued",
          error_category: null,
          error_message: null,
          reserved_credits: estimate.unitCost,
          updated_at: new Date().toISOString(),
        })
        .eq("id", String(j.id))
        .eq("status", "failed")
    )
  );

  await admin
    .from("bulk_enrichment_operations")
    .update({
      status: "processing",
      // The retry reservation joins THIS operation's accounting so finalize
      // releases exactly reserved − used, never more.
      reserved_credits: operation.reserved_credits + estimate.estimatedCost,
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", operation.id)
    .in("status", ["failed", "partial", "completed"]);

  after(async () => {
    try {
      const runner = await import("./bulk-runner");
      await runner.runBulkEnrichmentOperation(operation.id);
    } catch (err) {
      console.error(`[enrichment] bulk retry runner crashed for ${operation.id}:`, err);
    }
  });

  return { ok: true, message: null, retried: eligible.length };
}
