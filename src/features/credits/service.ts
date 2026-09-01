// ============================================================================
// Prosventa Credits — Canonical CreditService
// Stage 8 — Phase 1: Prosventa Credits Architecture
// ============================================================================
// THE single server-side entry point for every credit operation. Product
// features (research, enrichment, automation, …) must call this service —
// never wallet tables directly. This prevents per-feature billing logic
// from appearing throughout the codebase.
//
// Security model:
//   1. Caller must be authenticated (Supabase session).
//   2. Caller must be a member of the target organization (RLS-verified
//      membership read).
//   3. Mutations require an allowed role; adjustments are owner/admin only.
//   4. Actual balance mutation happens inside SECURITY DEFINER RPCs that are
//      atomic (FOR UPDATE row locks), reject negative balances, and honor
//      idempotency keys. Clients have no INSERT/UPDATE/DELETE RLS policies.
//
// NOT implemented here (later Stage 8 phases): payment processing,
// subscriptions, plan enforcement, credit pricing, usage analytics.
// ============================================================================
import "server-only";

import { createClient } from "@/lib/supabase/server";
import { CreditError, toCreditError } from "./errors";
import {
  validateIdempotencyKey,
  validatePositiveAmount,
  validateReference,
  validateSignedAmount,
  sanitizeMetadata,
} from "./validation";
import type {
  CreditActor,
  CreditLedgerEntry,
  CreditMutationResult,
  CreditReference,
  CreditSource,
  ReconciliationReport,
} from "./types";

/** Roles allowed to trigger credit-consuming operations on behalf of an org. */
const MUTATION_ROLES = new Set(["owner", "admin", "member"]);
/** Roles allowed to perform administrative adjustments. */
const ADJUSTMENT_ROLES = new Set(["owner", "admin"]);

interface LedgerQueryOptions {
  limit?: number;
  offset?: number;
}

type RpcClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Server authorization gate shared by every mutating method:
 * authenticated user + organization membership + sufficient role.
 */
async function authorize(
  actor: CreditActor,
  organizationId: string,
  allowedRoles: ReadonlySet<string>
): Promise<RpcClient> {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user || auth.user.id !== actor.userId) {
    throw new CreditError("UNAUTHORIZED_CREDIT_OPERATION");
  }

  // Membership is verified against the DB (not client-supplied claims).
  // RLS additionally scopes this read to the caller's own memberships.
  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", actor.userId)
    .single();

  if (error || !membership) {
    throw new CreditError("UNAUTHORIZED_CREDIT_OPERATION");
  }
  if (!allowedRoles.has(membership.role)) {
    throw new CreditError("UNAUTHORIZED_CREDIT_OPERATION");
  }

  return supabase;
}

function parseMutationResult(raw: unknown): CreditMutationResult {
  const result = (raw ?? {}) as Record<string, unknown>;
  return {
    status: (result.status as CreditMutationResult["status"]) ?? "ok",
    balance: typeof result.balance === "number" ? result.balance : Number(result.balance ?? 0),
    entryId: (result.entry_id as string | null) ?? null,
  };
}

export const CreditService = {
  /**
   * Fast available-balance lookup for UI display. Reads the wallet row —
   * never recomputes the ledger in the browser.
   */
  async getBalance(organizationId: string): Promise<number> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("org_credit_balances")
        .select("balance")
        .eq("organization_id", organizationId)
        .single();
      if (error || !data) throw new CreditError("WALLET_NOT_FOUND");
      return data.balance;
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /** Full wallet snapshot including lifetime counters and reservations. */
  async getWallet(organizationId: string) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("org_credit_balances")
        .select("*")
        .eq("organization_id", organizationId)
        .single();
      if (error || !data) throw new CreditError("WALLET_NOT_FOUND");
      return data;
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /**
   * Grants credits (grant/purchase). Positive amounts only.
   * Idempotent when an idempotency key is provided.
   */
  async grant(params: {
    actor: CreditActor;
    organizationId: string;
    amount: number;
    type: "grant" | "purchase";
    source: CreditSource;
    idempotencyKey?: string | null;
    reference?: CreditReference | null;
    metadata?: Record<string, unknown>;
  }): Promise<CreditMutationResult> {
    const amount = validatePositiveAmount(params.amount);
    const key = validateIdempotencyKey(params.idempotencyKey);
    if (params.reference) {
      validateReference(params.reference.type, params.reference.id);
    }
    const supabase = await authorize(params.actor, params.organizationId, MUTATION_ROLES);

    try {
      const { data, error } = await supabase.rpc("grant_credits", {
        p_org_id: params.organizationId,
        p_amount: amount,
        p_type: params.type,
        p_source: params.source,
        p_actor_id: params.actor.userId,
        p_idempotency_key: key,
        p_reference_type: params.reference?.type ?? null,
        p_reference_id: params.reference?.id ?? null,
        p_metadata: sanitizeMetadata(params.metadata),
      });
      if (error) throw error;
      return parseMutationResult(data);
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /**
   * Consumes credits for a product operation. Atomic; never overdraws the
   * wallet. Throws CreditError("INSUFFICIENT_CREDITS") when the balance is
   * too low — with NO partial consumption and NO ledger entry.
   */
  async consume(params: {
    actor: CreditActor;
    organizationId: string;
    amount: number;
    featureId?: string;
    idempotencyKey?: string | null;
    reference?: CreditReference | null;
    metadata?: Record<string, unknown>;
  }): Promise<CreditMutationResult> {
    const amount = validatePositiveAmount(params.amount);
    const key = validateIdempotencyKey(params.idempotencyKey);
    if (params.reference) {
      validateReference(params.reference.type, params.reference.id);
    }
    const supabase = await authorize(params.actor, params.organizationId, MUTATION_ROLES);

    try {
      const { data, error } = await supabase.rpc("consume_credits", {
        p_org_id: params.organizationId,
        p_amount: amount,
        p_feature_id: params.featureId ?? "",
        p_actor_id: params.actor.userId,
        p_idempotency_key: key,
        p_reference_type: params.reference?.type ?? null,
        p_reference_id: params.reference?.id ?? null,
        p_metadata: sanitizeMetadata(params.metadata),
      });
      if (error) throw error;
      const result = parseMutationResult(data);
      if (result.status === "insufficient_credits") {
        throw new CreditError("INSUFFICIENT_CREDITS", { balance: result.balance });
      }
      if (result.status === "wallet_not_found") {
        throw new CreditError("WALLET_NOT_FOUND");
      }
      return result;
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /** Refunds credits after a failed/voided operation. Always ledgered. */
  async refund(params: {
    actor: CreditActor;
    organizationId: string;
    amount: number;
    idempotencyKey?: string | null;
    reference?: CreditReference | null;
    metadata?: Record<string, unknown>;
  }): Promise<CreditMutationResult> {
    const amount = validatePositiveAmount(params.amount);
    const key = validateIdempotencyKey(params.idempotencyKey);
    if (params.reference) {
      validateReference(params.reference.type, params.reference.id);
    }
    const supabase = await authorize(params.actor, params.organizationId, MUTATION_ROLES);

    try {
      const { data, error } = await supabase.rpc("refund_credits", {
        p_org_id: params.organizationId,
        p_amount: amount,
        p_actor_id: params.actor.userId,
        p_idempotency_key: key,
        p_reference_type: params.reference?.type ?? null,
        p_reference_id: params.reference?.id ?? null,
        p_metadata: sanitizeMetadata(params.metadata),
      });
      if (error) throw error;
      const result = parseMutationResult(data);
      if (result.status === "wallet_not_found") {
        throw new CreditError("WALLET_NOT_FOUND");
      }
      return result;
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /**
   * Administrative adjustment (signed). Auditable by design: a non-empty
   * reason is mandatory and stored on the ledger entry. Owner/admin only.
   */
  async adjust(params: {
    actor: CreditActor;
    organizationId: string;
    amount: number;
    reason: string;
    idempotencyKey?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<CreditMutationResult> {
    const amount = validateSignedAmount(params.amount);
    const key = validateIdempotencyKey(params.idempotencyKey);
    if (!params.reason || params.reason.trim().length === 0) {
      throw new CreditError("INVALID_TRANSACTION_REFERENCE");
    }
    const supabase = await authorize(params.actor, params.organizationId, ADJUSTMENT_ROLES);

    try {
      const { data, error } = await supabase.rpc("adjust_credits", {
        p_org_id: params.organizationId,
        p_amount: amount,
        p_reason: params.reason.trim(),
        p_actor_id: params.actor.userId,
        p_idempotency_key: key,
        p_metadata: sanitizeMetadata(params.metadata),
      });
      if (error) throw error;
      const result = parseMutationResult(data);
      if (result.status === "insufficient_credits") {
        throw new CreditError("INSUFFICIENT_CREDITS", { balance: result.balance });
      }
      if (result.status === "wallet_not_found") {
        throw new CreditError("WALLET_NOT_FOUND");
      }
      return result;
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /** Reserves credits for a long-running operation (available → reserved). */
  async reserve(params: {
    actor: CreditActor;
    organizationId: string;
    amount: number;
    idempotencyKey?: string | null;
    reference?: CreditReference | null;
  }): Promise<CreditMutationResult> {
    const amount = validatePositiveAmount(params.amount);
    const key = validateIdempotencyKey(params.idempotencyKey);
    if (params.reference) {
      validateReference(params.reference.type, params.reference.id);
    }
    const supabase = await authorize(params.actor, params.organizationId, MUTATION_ROLES);

    try {
      const { data, error } = await supabase.rpc("reserve_credits", {
        p_org_id: params.organizationId,
        p_amount: amount,
        p_actor_id: params.actor.userId,
        p_idempotency_key: key,
        p_reference_type: params.reference?.type ?? null,
        p_reference_id: params.reference?.id ?? null,
      });
      if (error) throw error;
      const result = parseMutationResult(data);
      if (result.status === "insufficient_credits") {
        throw new CreditError("INSUFFICIENT_CREDITS", { balance: result.balance });
      }
      if (result.status === "wallet_not_found") {
        throw new CreditError("WALLET_NOT_FOUND");
      }
      return result;
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /** Releases previously reserved credits back to available. */
  async release(params: {
    actor: CreditActor;
    organizationId: string;
    amount: number;
    idempotencyKey?: string | null;
    reference?: CreditReference | null;
  }): Promise<CreditMutationResult> {
    const amount = validatePositiveAmount(params.amount);
    const key = validateIdempotencyKey(params.idempotencyKey);
    if (params.reference) {
      validateReference(params.reference.type, params.reference.id);
    }
    const supabase = await authorize(params.actor, params.organizationId, MUTATION_ROLES);

    try {
      const { data, error } = await supabase.rpc("release_credits", {
        p_org_id: params.organizationId,
        p_amount: amount,
        p_actor_id: params.actor.userId,
        p_idempotency_key: key,
        p_reference_type: params.reference?.type ?? null,
        p_reference_id: params.reference?.id ?? null,
      });
      if (error) throw error;
      const result = parseMutationResult(data);
      if (result.status === "wallet_not_found") {
        throw new CreditError("WALLET_NOT_FOUND");
      }
      return result;
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /** Chronological, paginated ledger history for the organization. */
  async getLedger(
    organizationId: string,
    options: LedgerQueryOptions = {}
  ): Promise<CreditLedgerEntry[]> {
    try {
      const supabase = await createClient();
      const limit = Math.min(options.limit ?? 50, 200);
      let query = supabase
        .from("credit_transactions")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (options.offset) {
        query = query.range(options.offset, options.offset + limit - 1);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as CreditLedgerEntry[];
    } catch (error) {
      throw toCreditError(error);
    }
  },

  /**
   * Reconciliation safeguard: verifies wallet balance equals the sum of valid
   * ledger movements (reservations accounted explicitly).
   */
  async reconcile(organizationId: string): Promise<ReconciliationReport> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("reconcile_org_credits", {
        p_org_id: organizationId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : (data as unknown as Record<string, unknown>);
      if (!row) throw new CreditError("WALLET_NOT_FOUND");
      return {
        balance: Number(row.balance ?? 0),
        reserved: Number(row.reserved ?? 0),
        ledgerTotal: Number(row.ledger_total ?? 0),
        expectedBalance: Number(row.expected_balance ?? 0),
        matches: Boolean(row.matches),
      };
    } catch (error) {
      throw toCreditError(error);
    }
  },
};
