// ============================================================================
// Prosventa Credits — BillableOperations
// Stage 8 — Phase 2: Credit Consumption + Usage Tracking
// ============================================================================
// The ONLY way product code executes a billable operation. Wraps the actual
// work in the credit lifecycle:
//
//   REQUEST → AUTHORIZE → PREFLIGHT → [RESERVE] → EXECUTE
//     → SUCCESS: CONSUME + usage.completed (+ ledger link)
//     → FAILURE: no consumption / RELEASE + usage.failed
//     → DUPLICATE: original charge kept, second request cancelled
//
// Guarantees:
//   - Atomic consumption: balance mutation happens inside Phase 1 SECURITY
//     DEFINER RPCs with FOR UPDATE row locks — concurrent requests can never
//     overdraw or double-account.
//   - Failed operations never consume credits (all-or-nothing policy).
//   - Duplicate requests within the idempotency window share one ledger key;
//     the ledger's unique index makes double charging impossible even when
//     two duplicates race.
//   - Preflight rejection (INSUFFICIENT_CREDITS) creates NO transaction and
//     NO usage record — only structured error information.
// ============================================================================

import "server-only";

import { createClient } from "@/lib/supabase/server";
import { toCreditError } from "./errors";
import { CreditService } from "./service";
import { UsageService } from "./usage-service";
import {
  AUTOMATION_MAX_CREDITS_PER_EXECUTION,
  buildOperationIdempotencyKey,
  computePreflight,
  getCreditOperation,
  LOW_BALANCE_THRESHOLD,
  type CreditOperationKey,
  type PreflightResult,
} from "./operations";

// ============================================================================
// Structured billing outcomes for server actions (RSC-safe — errors are
// returned as data, never thrown across the serialization boundary).
// ============================================================================

export interface BillingErrorInfo {
  code: string;
  message: string;
  /** Available balance when the error is balance-related. */
  balance: number | null;
  /** Credits the operation would have needed. */
  required: number | null;
}

/** Extracts a serializable summary from any thrown error. */
export function toBillingErrorInfo(
  error: unknown,
  required: number
): BillingErrorInfo {
  const credit = toCreditError(error);
  return {
    code: credit.code,
    message:
      credit.code === "INSUFFICIENT_CREDITS"
        ? "Not enough credits available for this operation."
        : credit.message,
    balance: credit.balance,
    required,
  };
}

export interface BilledOutcome<T> {
  result?: T;
  /** Present when billing/execution failed; check `error` first. */
  error: BillingErrorInfo | null;
  /** Credits consumed by this execution (0 on failure/duplicate). */
  creditsCharged: number;
  balance: number | null;
  usageId: string | null;
  duplicate: boolean;
}

interface ExecuteBillableParams<T> {
  operationKey: CreditOperationKey;
  organizationId: string;
  actorUserId: string;
  prospectId?: string | null;
  companyDomain?: string | null;
  provider?: string | null;
  executionId?: string | null;
  /** Extra scope distinguishing logical variants (e.g. "refresh"). */
  scope?: string | null;
  metadata?: Record<string, unknown>;
  /**
   * Optional honest-billing predicate: when it returns false (e.g. the
   * service served fresh cached data or detected an already-running job),
   * the pending usage is cancelled and NOTHING is charged.
   */
  shouldCharge?: (result: T) => boolean;
  execute: () => Promise<T>;
}

async function resolveProspectContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prospectId: string | null | undefined,
  organizationId: string
): Promise<boolean> {
  if (!prospectId) return true;
  // Prospect attribution must be honest AND org-owned (never an RLS bypass).
  const { data } = await supabase
    .from("prospects")
    .select("organization_id")
    .eq("id", prospectId)
    .single();
  return Boolean(data && data.organization_id === organizationId);
}

/**
 * Executes a billable operation through the full credit lifecycle.
 * Throws nothing — every failure becomes a structured BilledOutcome.error.
 */
export async function executeBillable<T>(
  params: ExecuteBillableParams<T>
): Promise<BilledOutcome<T>> {
  let cost: number;
  try {
    cost = getCreditOperation(params.operationKey).cost;
  } catch {
    return {
      error: { code: "OPERATION_NOT_BILLABLE", message: "Unknown operation.", balance: null, required: null },
      creditsCharged: 0,
      balance: null,
      usageId: null,
      duplicate: false,
    };
  }

  try {
    const supabase = await createClient();

    if (!(await resolveProspectContext(supabase, params.prospectId, params.organizationId))) {
      return {
        error: { code: "UNAUTHORIZED_CREDIT_OPERATION", message: "Prospect not found in this organization.", balance: null, required: null },
        creditsCharged: 0,
        balance: null,
        usageId: null,
        duplicate: false,
      };
    }

    // ---- PREFLIGHT (no writes on rejection) --------------------------------
    const available = await CreditService.getBalance(params.organizationId);
    const preflight: PreflightResult = computePreflight({
      unitCost: cost,
      quantity: 1,
      available,
    });
    if (preflight.status === "INSUFFICIENT_CREDITS") {
      return {
        error: {
          code: "INSUFFICIENT_CREDITS",
          message: "Not enough credits available for this operation.",
          balance: preflight.available,
          required: preflight.estimatedCost,
        },
        creditsCharged: 0,
        balance: preflight.available,
        usageId: null,
        duplicate: false,
      };
    }

    // ---- IDEMPOTENT KEY ----------------------------------------------------
    const idempotencyKey = buildOperationIdempotencyKey({
      operationKey: params.operationKey,
      organizationId: params.organizationId,
      prospectId: params.prospectId,
      scope: params.scope,
    });

    // ---- PENDING USAGE RECORD ---------------------------------------------
    const op = getCreditOperation(params.operationKey);
    const { usage, supabase: usageDb } = await UsageService.createPending({
      organizationId: params.organizationId,
      operationKey: params.operationKey,
      category: op.category,
      referenceId: crypto.randomUUID(),
      actorId: params.actorUserId,
      prospectId: params.prospectId ?? null,
      companyDomain: params.companyDomain ?? null,
      executionId: params.executionId ?? null,
      provider: params.provider ?? null,
      idempotencyKey,
      metadata: params.metadata,
    });

    // ---- RESERVATION MODE (long-running operations) ------------------------
    const reserved = op.billingMode === "reserve_consume_release";
    if (reserved) {
      await CreditService.reserve({
        actor: { userId: params.actorUserId },
        organizationId: params.organizationId,
        amount: cost,
        reference: { type: op.referenceType, id: usage.id },
      });
    }

    // ---- EXECUTE -----------------------------------------------------------
    try {
      const result = await params.execute();

      // Honest-billing gate: cache hits / duplicate in-flight jobs are free.
      if (params.shouldCharge && !params.shouldCharge(result)) {
        await UsageService.cancel({ usageId: usage.id, supabase: usageDb });
        const currentBalance = await CreditService.getBalance(params.organizationId);
        return {
          result,
          error: null,
          creditsCharged: 0,
          balance: currentBalance,
          usageId: null,
          duplicate: false,
        };
      }

      // ---- SUCCESS → CONSUME (atomic; duplicate-safe via ledger key) -------
      const consume = await CreditService.consume({
        actor: { userId: params.actorUserId },
        organizationId: params.organizationId,
        amount: cost,
        featureId: params.operationKey,
        idempotencyKey: reserved ? `${idempotencyKey}:finalize` : idempotencyKey,
        reference: { type: op.referenceType, id: usage.id },
        metadata: { usage_id: usage.id, operation: params.operationKey },
      });

      if (consume.status === "duplicate") {
        // A racing duplicate already charged. Cancel OUR pending record so
        // exactly one usage row carries the charge for this logical request.
        await UsageService.cancel({ usageId: usage.id, supabase: usageDb });
        if (reserved) {
          try {
            await CreditService.release({
              actor: { userId: params.actorUserId },
              organizationId: params.organizationId,
              amount: cost,
              reference: { type: op.referenceType, id: usage.id },
            });
          } catch (releaseError) {
            console.error("[credits] FAILED TO RELEASE RESERVATION", releaseError);
          }
        }
        const original = await UsageService.findByIdempotencyKey(idempotencyKey);
        return {
          result,
          error: null,
          creditsCharged: 0,
          balance: consume.balance,
          usageId: original?.id ?? null,
          duplicate: true,
        };
      }

      await UsageService.complete({
        usageId: usage.id,
        ledgerTransactionId: consume.entryId!,
        amount: cost,
        supabase: usageDb,
      });

      return {
        result,
        error: null,
        creditsCharged: cost,
        balance: consume.balance,
        usageId: usage.id,
        duplicate: false,
      };
    } catch (execError) {
      // ---- FAILURE → NO CONSUMPTION (or release) — never a silent charge ---
      if (reserved) {
        try {
          await CreditService.release({
            actor: { userId: params.actorUserId },
            organizationId: params.organizationId,
            amount: cost,
            reference: { type: op.referenceType, id: usage.id },
          });
        } catch (releaseError) {
          console.error("[credits] FAILED TO RELEASE RESERVATION", {
            usageId: usage.id,
            error: releaseError instanceof Error ? releaseError.message : releaseError,
          });
        }
      }
      try {
        await UsageService.fail({
          usageId: usage.id,
          reason: execError instanceof Error ? execError.message : String(execError),
          supabase: usageDb,
        });
      } catch (usageErr) {
        console.error("[credits] failed to mark usage failed", usageErr);
      }
      return {
        error: toBillingErrorInfo(execError, cost),
        creditsCharged: 0,
        balance: available,
        usageId: usage.id,
        duplicate: false,
      };
    }
  } catch (error) {
    return {
      error: toBillingErrorInfo(error, cost),
      creditsCharged: 0,
      balance: null,
      usageId: null,
      duplicate: false,
    };
  }
}

// ============================================================================
// PREFLIGHT — single + batch. Read-only; safe to call before any UI action.
// ============================================================================

export interface OperationPreflight extends PreflightResult {
  operationKey: CreditOperationKey;
  lowBalance: boolean;
}

/** Single-operation preflight for the authoritative wallet balance. */
export async function preflightOperation(
  organizationId: string,
  operationKey: CreditOperationKey,
  quantity = 1
): Promise<OperationPreflight> {
  const op = getCreditOperation(operationKey);
  const available = await CreditService.getBalance(organizationId);
  const result = computePreflight({ unitCost: op.cost, quantity, available });
  return {
    ...result,
    operationKey,
    lowBalance: available > 0 && available < LOW_BALANCE_THRESHOLD,
  };
}

/**
 * Batch preflight: "Enrich 50 prospects × 3 = 150 vs available".
 * READY only when the WHOLE batch fits — no silent partial execution.
 */
export async function preflightBatch(
  organizationId: string,
  operationKey: CreditOperationKey,
  quantity: number
): Promise<OperationPreflight> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("invalid_batch_quantity");
  }
  return preflightOperation(organizationId, operationKey, quantity);
}

/**
 * Executes N independent billable units AFTER a successful batch preflight.
 * Each unit is billed individually (its own failure never charges), and the
 * outcome reports exactly which succeeded.
 */
export async function executeBillableBatch<T>(
  params: Omit<ExecuteBillableParams<T>, "prospectId"> & {
    prospectIds: string[];
  }
): Promise<{
  outcomes: Array<{ prospectId: string } & BilledOutcome<T>>;
  totalCharged: number;
}> {
  const outcomes: Array<{ prospectId: string } & BilledOutcome<T>> = [];
  let totalCharged = 0;
  for (const prospectId of params.prospectIds) {
    const outcome = await executeBillable({
      ...params,
      prospectId,
      scope: params.scope ? `${params.scope}:batch` : "batch",
    });
    totalCharged += outcome.creditsCharged;
    outcomes.push({ prospectId, ...outcome });
  }
  return { outcomes, totalCharged };
}

// ============================================================================
// AUTOMATION CREDIT SAFETY — per-execution guard against runaway spend.
//
// A buggy workflow must never drain an organization's wallet. Every
// provider-backed automation step charges through this guard:
//   - cumulative per-execution accounting with a hard cap
//   - balance check per step (stop cleanly when exhausted)
//   - charge only on step success; failures are free
//
// Context note: background executions may run without a user session or
// wallet. In that case steps proceed UNBILLED (never fabricated charges,
// never broken automations) and a warning is logged for observability.
// ============================================================================

export interface AutomationChargeResult {
  /** true when credits were consumed for this step */
  charged: boolean;
  /** why charging did not happen (informational) */
  reason?: "credit_limit_reached" | "insufficient_credits" | "unavailable";
  creditsCharged: number;
  remainingBudget: number | null;
  usageId: string | null;
}

export class AutomationCreditGuard {
  private spent = 0;

  constructor(
    private readonly context: {
      organizationId: string;
      actorUserId: string;
      executionId: string;
      workflowId: string;
      maxCredits?: number;
    }
  ) {}

  get creditsSpent(): number {
    return this.spent;
  }

  get maxCredits(): number {
    return this.context.maxCredits ?? AUTOMATION_MAX_CREDITS_PER_EXECUTION;
  }

  /** True when the execution has exhausted its credit budget. */
  get budgetExhausted(): boolean {
    return this.spent >= this.maxCredits;
  }

  /**
   * Runs one provider-backed automation step through the standard lifecycle
   * (usage record + ledger transaction + attribution). Never throws.
   */
  async chargeStep(args: {
    stepRef: string;
    prospectId?: string | null;
    execute: () => Promise<void>;
  }): Promise<AutomationChargeResult> {
    const cap = this.maxCredits;
    const remaining = Math.max(cap - this.spent, 0);

    if (remaining < getCreditOperation("automation_execution").cost) {
      return {
        charged: false,
        reason: "credit_limit_reached",
        creditsCharged: 0,
        remainingBudget: remaining,
        usageId: null,
      };
    }

    try {
      // Preflight the real wallet before running the step.
      const available = await CreditService.getBalance(this.context.organizationId);
      if (available < getCreditOperation("automation_execution").cost) {
        return {
          charged: false,
          reason: "insufficient_credits",
          creditsCharged: 0,
          remainingBudget: remaining,
          usageId: null,
        };
      }

      const outcome = await executeBillable({
        operationKey: "automation_execution",
        organizationId: this.context.organizationId,
        actorUserId: this.context.actorUserId,
        prospectId: args.prospectId ?? null,
        executionId: this.context.executionId,
        scope: `step:${args.stepRef}`,
        metadata: { workflow_id: this.context.workflowId },
        execute: args.execute,
      });

      if (outcome.error && !outcome.duplicate) {
        return {
          charged: false,
          reason:
            outcome.error.code === "INSUFFICIENT_CREDITS"
              ? "insufficient_credits"
              : "unavailable",
          creditsCharged: 0,
          remainingBudget: remaining,
          usageId: null,
        };
      }

      this.spent += outcome.creditsCharged;
      return {
        charged: true,
        creditsCharged: outcome.creditsCharged,
        remainingBudget: Math.max(cap - this.spent, 0),
        usageId: outcome.usageId,
      };
    } catch (error) {
      // No session / no wallet in this execution context → proceed unbilled.
      console.warn("[credits] automation step proceeding unbilled", {
        executionId: this.context.executionId,
        error: error instanceof Error ? error.message : error,
      });
      return {
        charged: false,
        reason: "unavailable",
        creditsCharged: 0,
        remainingBudget: remaining,
        usageId: null,
      };
    }
  }
}

/**
 * Resolves the authenticated actor + organization for a server action.
 * Returns null when unauthenticated / not an org member — callers return
 * their standard failed-result shape.
 */
export async function resolveBillingContext(): Promise<{
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
  return { userId: user.id, organizationId: membership.organization_id };
}



