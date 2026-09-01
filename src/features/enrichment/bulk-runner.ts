// ============================================================================
// Prosventa Enrichment — Bulk Runner (trusted-server worker)
// Feature 2: Enrichment - Phase 3 of 4
// ============================================================================
// Executes ONE bulk enrichment operation entirely server-side. The browser
// NEVER processes work — it creates the operation and observes status. This
// runner is dispatched through Next.js `after()` exactly like the existing
// automation orchestrator, so closing/minimizing the window or refreshing
// never interrupts processing.
//
// Per-job pipeline:
//   claim (atomic conditional UPDATE) → freshness/duplicate checks
//     → provider legs through the Phase-1 facade (enrichProspect)
//     → SUCCESS/PARTIAL: consume actual unit cost (idempotent ledger entry)
//     → FAILURE/SKIP/CANCEL: nothing consumed; reservation released at end
//   → FINALIZE: release ALL unused reserved credits ONCE (idempotent),
//     persist real counters, emit ONE summary notification.
//
// Accounting rules (central credit service ONLY — no local arithmetic on
// balances):
//   reserved = unit × prospects      (before any provider call)
//   used     += unit per successful job (ledger consumption, jobId-keyed)
//   released = reserved − used       (single idempotent release)
//
// Timeouts: a timed-out request may still have succeeded downstream, so it is
// marked failed WITHOUT automatic retry (double-charge protection) and its
// reservation share is released — Prosventa never charges for unconfirmed work.
// ============================================================================

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreditService } from "@/features/credits/service";
import { UsageService } from "@/features/credits/usage-service";
import { createNotificationEntry } from "@/lib/db/collaboration";
import { enrichProspect } from "./service";
import {
  BULK_ENRICHMENT_CONCURRENCY,
  computeFinalOperationStatus,
  isStaleBulkOperation,
  type BulkCounters,
} from "./bulk";

interface BulkOpRow {
  id: string;
  organization_id: string;
  created_by: string;
  status: string;
  reserved_credits: number;
}

interface BulkJobRow {
  id: string;
  prospect_id: string;
  organization_id: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  reserved_credits: number;
}

async function loadOperation(
  admin: ReturnType<typeof createAdminClient>,
  operationId: string
): Promise<BulkOpRow | null> {
  const { data } = await admin
    .from("bulk_enrichment_operations")
    .select("id, organization_id, created_by, status, reserved_credits")
    .eq("id", operationId)
    .maybeSingle();
  return (data as unknown as BulkOpRow) ?? null;
}

/**
 * THE bulk worker entry point. Safe to call multiple times for the same
 * operation: only a queued/processing operation proceeds.
 */
export async function runBulkEnrichmentOperation(operationId: string): Promise<void> {
  const admin = createAdminClient();

  const op = await loadOperation(admin, operationId);
  if (!op || !["queued", "processing"].includes(op.status)) return;

  await admin
    .from("bulk_enrichment_operations")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", operationId)
    .in("status", ["queued", "processing"]);

  // Claim the queued job ids once; workers compete via conditional updates so
  // a retried/crashed runner can never double-process a claimed job.
  const { data: queued } = await admin
    .from("bulk_enrichment_jobs")
    .select("id")
    .eq("operation_id", operationId)
    .eq("status", "queued")
    .order("created_at");
  const queue: string[] = (queued ?? []).map((j) => (j as { id: string }).id);

  let cancelled = false;
  let cursor = 0;

  const claimNext = async (): Promise<BulkJobRow | null> => {
    while (cursor < queue.length) {
      const jobId = queue[cursor++];
      // Observe cancellation before every claim — queued work must be able
      // to stop, already-billable work is never undone.
      const live = await loadOperation(admin, operationId);
      if (!live || !["queued", "processing"].includes(live.status)) {
        cancelled = true;
        return null;
      }
      // ATOMIC claim: only wins when the job is still 'queued'.
      const { data: claimed } = await admin
        .from("bulk_enrichment_jobs")
        .update({
          status: "processing",
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId!)
        .eq("status", "queued")
        .select("*");
      const row = (claimed ?? [])[0] as BulkJobRow | undefined;
      if (row) return row;
    }
    return null;
  };

  const worker = async () => {
    for (;;) {
      const job = await claimNext();
      if (!job) return;
      try {
        await processBulkJob(job, op);
      } catch (error) {
        console.error(
          `[enrichment] bulk job ${job.id} crashed { op: ${operationId}, prospect: ${job.prospect_id} }`,
          error instanceof Error ? error.message : error
        );
        await failBulkJob(admin, job.id, job.attempt_count + 1, "unknown");
      }
    }
  };

  // Controlled concurrency — a small fixed pool derived from infrastructure
  // limits, never one-request-per-prospect.
  await Promise.all(
    Array.from({ length: Math.min(BULK_ENRICHMENT_CONCURRENCY, Math.max(queue.length, 1)) }, worker)
  );

  await finalizeBulkOperation(admin, operationId, cancelled);
}

// ----------------------------------------------------------------------------
// Per-job processing
// ----------------------------------------------------------------------------

async function processBulkJob(job: BulkJobRow, op: BulkOpRow): Promise<void> {
  const supabase = await createClient();
  const admin = createAdminClient();

  // ---- Freshness / duplicate protection (no provider call when skippable) --
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: freshPerson }, { data: freshCompany }] = await Promise.all([
    supabase
      .from("prospect_enrichments")
      .select("id")
      .eq("prospect_id", job.prospect_id)
      .in("status", ["completed", "partial"])
      .gte("last_retrieved_at", since)
      .limit(1),
    supabase
      .from("company_enrichments")
      .select("id")
      .eq("prospect_id", job.prospect_id)
      .in("status", ["completed", "partial"])
      .gte("last_retrieved_at", since)
      .limit(1),
  ]);
  if ((freshPerson && freshPerson.length > 0) || (freshCompany && freshCompany.length > 0)) {
    await skipBulkJob(admin, job.id, "recently_enriched");
    return;
  }

  const { data: activeJobs } = await supabase
    .from("intelligence_jobs")
    .select("id")
    .eq("prospect_id", job.prospect_id)
    .eq("organization_id", job.organization_id)
    .in("status", ["pending", "processing"])
    .limit(1);
  if (activeJobs && activeJobs.length > 0) {
    await skipBulkJob(admin, job.id, "already_processing");
    return;
  }

  // ---- Provider work through the Phase-1 facade ----------------------------
  const startedAt = Date.now();
  const [person, company] = await Promise.all([
    enrichProspect({ prospectId: job.prospect_id, operation: "prospect_enrichment" }),
    enrichProspect({ prospectId: job.prospect_id, operation: "company_enrichment" }),
  ]);

  const personUsable =
    person.response !== null &&
    Object.values(person.response.person).some((v) => v !== null);
  const companyUsable = company.response !== null;
  const anyFailedLeg = person.status === "failed" && company.status === "failed";
  const anySkippedLeg =
    person.status === "used_cached" ||
    company.status === "used_cached" ||
    person.status === "already_in_progress" ||
    company.status === "already_in_progress";

  if (anySkippedLeg && !personUsable && !companyUsable) {
    // Nothing new was fetched — the existing services deduplicated this work.
    await skipBulkJob(
      admin,
      job.id,
      person.status === "already_in_progress" || company.status === "already_in_progress"
        ? "already_processing"
        : "recently_enriched"
    );
    return;
  }

  if (anyFailedLeg && !personUsable && !companyUsable) {
    const timedOut = /timeout|timed out/i.test(person.message + " " + company.message);
    await failBulkJob(admin, job.id, job.attempt_count + 1, timedOut ? "timeout" : "unknown");
    return;
  }

  // ---- Success/partial → finalize ACTUAL usage against the reservation -----
  const partial = (!personUsable && companyUsable) || (personUsable && !companyUsable);
  await consumeBulkJob(admin, op, job, partial ? "partial" : "completed", Date.now() - startedAt);
}

/** Marks a job skipped (never billable — its share is released at finalize). */
async function skipBulkJob(
  admin: ReturnType<typeof createAdminClient>,
  jobId: string,
  reason: "already_processing" | "recently_enriched"
): Promise<void> {
  await admin
    .from("bulk_enrichment_jobs")
    .update({
      status: "skipped",
      skip_reason: reason,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "processing");
}

/** Consumes the job's actual unit cost against the operation reservation. */
async function consumeBulkJob(
  admin: ReturnType<typeof createAdminClient>,
  op: BulkOpRow,
  job: BulkJobRow,
  status: "completed" | "partial",
  durationMs: number
): Promise<void> {
  const { getProspectEnrichmentUnitCost } = await import("./bulk");
  const unitCost = getProspectEnrichmentUnitCost();
  const completedAt = new Date().toISOString();

  try {
    // Ledger consumption — jobId-keyed idempotency makes a retried finalize
    // physically unable to charge twice.
    const mutation = await CreditService.consume({
      actor: { userId: op.created_by },
      organizationId: op.organization_id,
      amount: unitCost,
      featureId: "enrichment",
      idempotencyKey: `bulk-consume:${job.id}`,
      reference: { type: "enrichment", id: job.id },
      metadata: {
        bulk_operation_id: op.id,
        prospect_id: job.prospect_id,
        outcome: status,
        duration_ms: durationMs,
      },
    });

    // Auditable usage record (what the customer used Prosventa for):
    // pending → completed with the real amount + ledger link.
    const { usage, supabase: usageClient } = await UsageService.createPending({
      organizationId: op.organization_id,
      operationKey: "prospect_enrichment",
      category: "enrichment",
      referenceId: job.id,
      amount: unitCost,
      actorId: op.created_by,
      prospectId: job.prospect_id,
      executionId: op.id,
      metadata: { bulk_operation_id: op.id, outcome: status },
    });
    await UsageService.complete({
      usageId: usage.id,
      ledgerTransactionId: mutation.entryId ?? "",
      amount: unitCost,
      supabase: usageClient,
    });

    await admin
      .from("bulk_enrichment_jobs")
      .update({
        status,
        used_credits: unitCost,
        provider_request_id: mutation.entryId,
        usage_record_id: usage.id,
        duration_ms: durationMs,
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq("id", job.id)
      .in("status", ["processing", "queued"]);
  } catch (error) {
    console.error(
      `[enrichment] bulk consume failed { job: ${job.id}, op: ${op.id} }`,
      error instanceof Error ? error.message : error
    );
    // Billing failure must not strand the job as processing; treat as failed
    // so finalize releases its reservation.
    await failBulkJob(admin, job.id, job.attempt_count + 1, "unknown");
  }
}

// ----------------------------------------------------------------------------
// Finalization — release unused reservation ONCE, persist real counters,
// emit ONE summary notification.
// ----------------------------------------------------------------------------

async function finalizeBulkOperation(
  admin: ReturnType<typeof createAdminClient>,
  operationId: string,
  wasCancelled: boolean,
  force = false
): Promise<void> {
  const op = await loadOperation(admin, operationId);
  // Non-forced finalization only applies to still-open operations; forced
  // finalization (cancellation with no live runner) may close any open or
  // freshly-cancelled operation exactly once.
  if (
    !op ||
    (!force && !["queued", "processing"].includes(op.status)) ||
    ["completed", "partial", "failed"].includes(op.status)
  ) {
    return;
  }

  const { data: jobs } = await admin
    .from("bulk_enrichment_jobs")
    .select("status")
    .eq("operation_id", operationId);

  const counters: BulkCounters = { enriched: 0, partial: 0, skipped: 0, failed: 0, cancelled: 0 };
  let unstarted = 0;
  for (const j of (jobs ?? []) as Array<{ status: string }>) {
    if (j.status === "completed") counters.enriched += 1;
    else if (j.status === "partial") counters.partial += 1;
    else if (j.status === "skipped") counters.skipped += 1;
    else if (j.status === "failed") counters.failed += 1;
    else if (j.status === "cancelled") counters.cancelled += 1;
    else unstarted += 1;
  }

  // Anything still queued/processing at finalize is cancelled work
  // (user cancelled mid-run) — never billed.
  if (unstarted > 0) {
    counters.cancelled += unstarted;
    await admin
      .from("bulk_enrichment_jobs")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("operation_id", operationId)
      .in("status", ["processing", "queued"]);
  }

  const { data: usedRows } = await admin
    .from("bulk_enrichment_jobs")
    .select("used_credits")
    .eq("operation_id", operationId);
  const usedCredits = (usedRows ?? []).reduce(
    (sum, r) => sum + Number((r as { used_credits: number }).used_credits ?? 0),
    0
  );
  const released = Math.max(op.reserved_credits - usedCredits, 0);

  // ONE idempotent release of ALL unused reserved credits. Duplicate finalize
  // attempts hit the ledger's unique idempotency key and return "duplicate".
  if (released > 0) {
    try {
      await CreditService.release({
        actor: { userId: op.created_by },
        organizationId: op.organization_id,
        amount: released,
        idempotencyKey: `bulk-release:${op.id}`,
        reference: { type: "enrichment", id: op.id },
      });
    } catch (error) {
      console.error(
        `[enrichment] bulk release failed { op: ${op.id}, amount: ${released} }`,
        error instanceof Error ? error.message : error
      );
    }
  }

  const finalStatus = computeFinalOperationStatus(counters);
  const update = admin
    .from("bulk_enrichment_operations")
    .update({
      status: finalStatus,
      enriched_count: counters.enriched,
      partial_count: counters.partial,
      skipped_count: counters.skipped,
      failed_count: counters.failed,
      cancelled_count: counters.cancelled,
      used_credits: usedCredits,
      released_credits: released,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", op.id);
  if (force) {
    await update.in("status", ["queued", "processing", "cancelled"]);
  } else {
    await update.in("status", ["queued", "processing"]);
  }

  await notifyBulkCompletion(op, counters, usedCredits, wasCancelled && unstarted > 0);
}

/**
 * Forced finalization for a cancelled operation whose runner is not alive
 * (nothing was ever claimed, or the runner exited before cancel landed).
 * Idempotent: ledger release keys and terminal-state guard make a double
 * invocation a no-op.
 */
export async function finalizeCancelledBulkOperation(operationId: string): Promise<void> {
  const admin = createAdminClient();
  await finalizeBulkOperation(admin, operationId, true, true);
}

/** Exactly ONE meaningful notification per operation — never per prospect. */
async function notifyBulkCompletion(
  op: BulkOpRow,
  counters: BulkCounters,
  usedCredits: number,
  cancelledPartially: boolean
): Promise<void> {
  try {
    const succeeded = counters.enriched + counters.partial;
    const total = succeeded + counters.skipped + counters.failed + counters.cancelled;
    const title = cancelledPartially
      ? "Bulk enrichment cancelled"
      : succeeded === 0
        ? "Bulk enrichment failed"
        : "Bulk enrichment completed";
    const body =
      `Bulk enrichment finished: ${succeeded} of ${total} prospects enriched` +
      (counters.failed > 0 ? `, ${counters.failed} failed.` : ".") +
      ` Credits used: ${usedCredits}.`;

    await createNotificationEntry({
      user_id: op.created_by,
      organization_id: op.organization_id,
      type: succeeded === 0 && !cancelledPartially ? "system_alert" : "signal_detected",
      title,
      body,
      entity_type: "prospect",
      entity_id: null,
      actor_id: op.created_by,
    });
  } catch {
    // Notifications must never break accounting finalization.
  }
}

/** Marks a job failed. Reservation share stays held until finalize releases it. */
async function failBulkJob(
  admin: ReturnType<typeof createAdminClient>,
  jobId: string,
  attemptCount: number,
  errorCategory: string
): Promise<void> {
  await admin
    .from("bulk_enrichment_jobs")
    .update({
      status: "failed",
      attempt_count: attemptCount,
      error_category: errorCategory,
      error_message:
        errorCategory === "timeout"
          ? "The provider did not respond in time."
          : "Enrichment failed for this prospect.",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .in("status", ["processing", "queued"]);
}

// ----------------------------------------------------------------------------
// Stuck-operation protection (Phase 4)
// ----------------------------------------------------------------------------
// If the server crashes or restarts mid-run, an operation can remain
// 'processing' forever: its jobs stay 'processing', its reservation stays
// stranded, and the org-level "one active operation" index blocks every future
// bulk enrichment. Recovery force-finalizes such operations exactly once —
// unstarted/uncertain work is cancelled and released (never billed), completed
// work stays billable. The idempotent release key makes double recovery safe.
//
// An operation counts as stale ONLY when NEITHER the operation NOR any of its
// jobs has been touched within the window — a legitimately slow live run keeps
// updating job rows and is never recovered prematurely.
// ----------------------------------------------------------------------------

export const BULK_STALE_OPERATION_MS = Math.max(
  60_000,
  Number(process.env.ENRICHMENT_BULK_STALE_OPERATION_MS ?? 15 * 60 * 1000)
);

/**
 * Recovers at most a small batch of stale operations. Called opportunistically
 * from the bulk entry points; never throws into the caller's flow.
 */
export async function recoverStaleBulkEnrichmentOperations(): Promise<number> {
  try {
    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - BULK_STALE_OPERATION_MS).toISOString();

    const { data: candidates } = await admin
      .from("bulk_enrichment_operations")
      .select("id, updated_at")
      .in("status", ["queued", "processing"])
      .lt("updated_at", cutoff)
      .limit(5);

    let recovered = 0;
    for (const raw of (candidates ?? []) as Array<{ id: string }>) {
      // Last activity = newest of the operation row itself and its most
      // recently touched job.
      const { data: lastJob } = await admin
        .from("bulk_enrichment_jobs")
        .select("updated_at")
        .eq("operation_id", raw.id)
        .order("updated_at", { ascending: false })
        .limit(1);
      const lastJobAt = ((lastJob ?? [])[0] as { updated_at?: string } | undefined)
        ?.updated_at ?? null;
      if (!isStaleBulkOperation({ opUpdatedAt: raw.updated_at ?? null, lastJobUpdatedAt: lastJobAt, cutoffIso: cutoff })) {
        continue; // still alive
      }

      await finalizeBulkOperation(admin, raw.id, true, true);
      console.error(
        `[enrichment] recovered stale bulk operation { op: ${raw.id}, idleMs: ${BULK_STALE_OPERATION_MS} }`
      );
      recovered += 1;
    }
    return recovered;
  } catch (error) {
    console.error(
      "[enrichment] stale-operation recovery failed:",
      error instanceof Error ? error.message : error
    );
    return 0;
  }
}

