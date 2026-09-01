// ============================================================================
// Prosventa Credits — UsageService
// Stage 8 — Phase 2: Credit Consumption + Usage Tracking
// ============================================================================
// Product-side consumption records. The LEDGER answers "how did credits
// move?"; the USAGE RECORDS answer "what did the customer use Prosventa for?".
//
// Boundary rules:
//   - Product code calls UsageService / BillableOperations — never touches
//     credit_usage_records directly.
//   - Status transitions are controlled (USAGE_STATUS_TRANSITIONS); arbitrary
//     jumps are rejected.
//   - All reads are org-scoped and additionally protected by RLS.
//
// Attribution: actor (user or null for system), prospect, company domain,
// provider, execution id — only where genuinely applicable; never fabricated.
// ============================================================================
import "server-only";

import { createClient } from "@/lib/supabase/server";
import { CreditError, toCreditError } from "./errors";
import {
  isValidUsageTransition,
  type CreditOperationCategory,
  type CreditOperationKey,
  type CreditUsageStatus,
} from "./operations";
import { sanitizeMetadata } from "./validation";

export interface CreditUsageRecord {
  id: string;
  organization_id: string;
  actor_id: string | null;
  operation_key: CreditOperationKey;
  category: CreditOperationCategory;
  credit_amount: number;
  status: CreditUsageStatus;
  prospect_id: string | null;
  company_domain: string | null;
  reference_id: string;
  execution_id: string | null;
  provider: string | null;
  ledger_transaction_id: string | null;
  metadata: Record<string, unknown>;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

interface CreateUsageParams {
  supabase: Supabase;
  organizationId: string;
  operationKey: CreditOperationKey;
  category: CreditOperationCategory;
  referenceId: string;
  amount?: number;
  actorId?: string | null;
  prospectId?: string | null;
  companyDomain?: string | null;
  executionId?: string | null;
  provider?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}

async function insertUsage(
  params: CreateUsageParams
): Promise<CreditUsageRecord> {
  const { data, error } = await params.supabase
    .from("credit_usage_records")
    .insert({
      organization_id: params.organizationId,
      actor_id: params.actorId ?? null,
      operation_key: params.operationKey,
      category: params.category,
      credit_amount: params.amount ?? 0,
      status: "pending",
      prospect_id: params.prospectId ?? null,
      company_domain: params.companyDomain ?? null,
      // reference_id is NOT NULL — a usage record must always be traceable
      // to at least its own generated reference.
      reference_id: params.referenceId || crypto.randomUUID(),
      execution_id: params.executionId ?? null,
      provider: params.provider ?? null,
      metadata: sanitizeMetadata(params.metadata),
      idempotency_key: params.idempotencyKey ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as CreditUsageRecord;
}

async function transitionUsage(
  supabase: Supabase,
  usageId: string,
  to: Exclude<CreditUsageStatus, "pending">,
  patch: Record<string, unknown> = {}
): Promise<void> {
  const { data: current } = await supabase
    .from("credit_usage_records")
    .select("status")
    .eq("id", usageId)
    .single();
  const from = (current?.status ?? "pending") as CreditUsageStatus;
  if (!isValidUsageTransition(from, to)) {
    throw new CreditError("USAGE_INVALID_TRANSITION");
  }
  const { error } = await supabase
    .from("credit_usage_records")
    .update({ status: to, ...patch, updated_at: new Date().toISOString() })
    .eq("id", usageId);
  if (error) throw error;
}

export interface CreditUsageAggregates {
  totalCredits: number;
  usageCount: number;
  byCategory: Record<string, number>;
  byOperation: Record<string, number>;
  failedCredits: number;
}

function parseAggregate(raw: unknown): CreditUsageAggregates {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    totalCredits: Number(r.totalCredits ?? 0),
    usageCount: Number(r.usageCount ?? 0),
    byCategory: (r.byCategory ?? {}) as Record<string, number>,
    byOperation: (r.byOperation ?? {}) as Record<string, number>,
    failedCredits: Number(r.failedCredits ?? 0),
  };
}

export interface UsageListFilters {
  operationKey?: CreditOperationKey;
  category?: CreditOperationCategory;
  status?: CreditUsageStatus;
  prospectId?: string;
  actorId?: string;
  /** Inclusive ISO timestamps. */
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface UsagePage {
  records: CreditUsageRecord[];
  limit: number;
  offset: number;
  /** Best-effort total count for pagination UI. */
  total: number | null;
}

export const UsageService = {
  /**
   * Creates a PENDING usage record. Called by BillableOperations before an
   * operation executes; finalized after the outcome is known. Never called
   * on preflight rejection (no balance change, no usage noise).
   */
  async createPending(params: Omit<CreateUsageParams, "supabase">): Promise<{
    usage: CreditUsageRecord;
    supabase: Supabase;
  }> {
    try {
      const supabase = await createClient();
      const usage = await insertUsage({ ...params, supabase });
      return { usage, supabase };
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /** pending → completed. Links the ledger transaction + final amount. */
  async complete(params: {
    usageId: string;
    ledgerTransactionId: string;
    amount: number;
    supabase: Supabase;
  }): Promise<void> {
    try {
      await transitionUsage(params.supabase, params.usageId, "completed", {
        ledger_transaction_id: params.ledgerTransactionId,
        credit_amount: params.amount,
      });
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /** pending → failed. Failed operations never consume credits. */
  async fail(params: { usageId: string; reason?: string; supabase: Supabase }): Promise<void> {
    try {
      await transitionUsage(params.supabase, params.usageId, "failed", {
        metadata: params.reason ? { failure_reason: params.reason.slice(0, 200) } : {},
      });
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /** pending → cancelled (e.g., duplicate request lost the race). */
  async cancel(params: { usageId: string; supabase: Supabase }): Promise<void> {
    try {
      await transitionUsage(params.supabase, params.usageId, "cancelled");
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /** completed → refunded (support/billing correction path). */
  async markRefunded(params: {
    usageId: string;
    refundLedgerTransactionId: string;
    supabase: Supabase;
  }): Promise<void> {
    try {
      await transitionUsage(params.supabase, params.usageId, "refunded", {
        metadata: { refund_ledger_transaction_id: params.refundLedgerTransactionId },
      });
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /** Finds the original usage for a duplicate idempotent request. */
  async findByIdempotencyKey(key: string): Promise<CreditUsageRecord | null> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("credit_usage_records")
        .select("*")
        .eq("idempotency_key", key)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as CreditUsageRecord) ?? null;
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /**
   * Paginated, filtered usage history for one organization. Timestamp-ordered,
   * bounded page size — history pages load slices, never whole tables.
   */
  async list(
    organizationId: string,
    filters: UsageListFilters = {}
  ): Promise<UsagePage> {
    try {
      const supabase = await createClient();
      const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
      const offset = Math.max(filters.offset ?? 0, 0);

      let query = supabase
        .from("credit_usage_records")
        .select("*", { count: "exact" })
        .eq("organization_id", organizationId);

      if (filters.operationKey) query = query.eq("operation_key", filters.operationKey);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.prospectId) query = query.eq("prospect_id", filters.prospectId);
      if (filters.actorId) query = query.eq("actor_id", filters.actorId);
      if (filters.from) query = query.gte("created_at", filters.from);
      if (filters.to) query = query.lte("created_at", filters.to);

      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        records: (data ?? []) as unknown as CreditUsageRecord[],
        limit,
        offset,
        total: typeof count === "number" ? count : null,
      };
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /** Latest N usage events (default 10) for the future Billing/Usage UI. */
  async recent(organizationId: string, limit = 10): Promise<CreditUsageRecord[]> {
    const page = await this.list(organizationId, {
      limit: Math.min(limit, 50),
      offset: 0,
    });
    return page.records;
  },

  /** Aggregated server-side totals via the aggregate_credit_usage RPC. */
  async aggregate(
    organizationId: string,
    range?: { from?: Date; to?: Date }
  ): Promise<CreditUsageAggregates> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("aggregate_credit_usage", {
        p_org_id: organizationId,
        p_from: range?.from?.toISOString() ?? null,
        p_to: range?.to?.toISOString() ?? null,
      });
      if (error) throw error;
      return parseAggregate(data);
    } catch (error) {
      throw toCreditError(error);
    }
  },
};

