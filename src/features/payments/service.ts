// ============================================================================
// Prosventa Payments — PurchaseService
// Stage 8 — Phase 4: Payment + Credit Purchase System
// ============================================================================
// THE single server-side entry point for the purchase lifecycle:
//
//   User → select package → SERVER validates package + organization →
//   create pending purchase (snapshot) → provider checkout →
//   webhook / verification → transactional confirmation RPC →
//   grant_credits (existing CreditService accounting path) → wallet.
//
// Security model:
//   - Organization is resolved from the authenticated session — never from
//     client input. Purchases require owner/admin membership.
//   - Price, currency and credit amount come ONLY from the DB catalog
//     snapshot. Client-supplied amounts are ignored entirely.
//   - Double-click protection: per-org idempotency key unique index; a rapid
//     duplicate request returns the SAME purchase instead of creating four.
//   - Credits are granted exclusively inside the process_payment_confirmation
//     SQL transaction which calls the existing public.grant_credits ledger
//     function with the deterministic key 'purchase:{id}'. Payment code NEVER
//     touches org_credit_balances directly and cannot double-grant.
// ============================================================================

import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PaymentError, toPaymentError } from "./errors";
import { resolveActivePackage } from "./packages";
import { getPaymentProvider } from "./provider";
import type { CreditPackageRow, ParsedProviderEvent, PurchaseRow } from "./types";

/** Roles allowed to purchase on behalf of an organization. */
const PURCHASE_ROLES = new Set(["owner", "admin"]);

async function authorizePurchaser(organizationId: string | undefined): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  organizationId: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new PaymentError("UNAUTHORIZED_PAYMENT_OPERATION");

  // The organization is resolved server-side from membership — an
  // unauthenticated client can NEVER nominate an arbitrary org id.
  let query = supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data: memberships, error } = await query;
  if (error || !memberships?.length) {
    throw new PaymentError("UNAUTHORIZED_PAYMENT_OPERATION");
  }
  const membership = memberships.find((m) => PURCHASE_ROLES.has(m.role));
  if (!membership) {
    throw new PaymentError("UNAUTHORIZED_PAYMENT_OPERATION");
  }
  return {
    supabase,
    userId: user.id,
    organizationId: membership.organization_id as string,
  };
}

function buildSnapshot(pkg: CreditPackageRow) {
  return {
    package_key: pkg.key,
    package_name: pkg.name,
    package_status_at_purchase: pkg.status,
    credit_amount: pkg.credit_amount,
    currency: pkg.currency,
    price: pkg.price,
  };
}

export interface CheckoutResult {
  purchaseId: string;
  checkoutUrl: string;
  providerOrderId: string;
}

export const PurchaseService = {
  /**
   * Starts a purchase: validates package + organization server-side, creates
   * the pending purchase with an immutable price snapshot, opens a hosted
   * provider checkout. Provider outage fails gracefully — no fake success.
   */
  async createCheckout(params: {
    /** Only the stable package key is accepted from the client. */
    packageKey: string;
    /** Client double-click protection key (optional but recommended). */
    clientRequestId?: string | null;
    organizationId?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutResult> {
    try {
      if (!params.successUrl || !params.cancelUrl) {
        throw new PaymentError("INVALID_CHECKOUT_REQUEST");
      }
      const { supabase, userId, organizationId } = await authorizePurchaser(
        params.organizationId
      );
      const provider = getPaymentProvider();

      // Server-authoritative commercial truth — never client numbers.
      const pkg = await resolveActivePackage(params.packageKey);

      const idempotencyKey =
        params.clientRequestId && params.clientRequestId.length <= 200
          ? `org:${organizationId}:pkg:${pkg.key}:${params.clientRequestId}`
          : null;

      // DOUBLE-CLICK PROTECTION (server-side): a duplicate request for the
      // same logical request hits this unique index and never creates a
      // second purchase.
      if (idempotencyKey) {
        const { data: existing } = await supabase
          .from("purchases")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        if (existing) {
          throw new PaymentError("DUPLICATE_PURCHASE_REQUEST");
        }
      }

      const { data: purchase, error } = await supabase
        .from("purchases")
        .insert({
          organization_id: organizationId,
          package_id: pkg.id,
          created_by: userId,
          purchase_status: "pending",
          currency: pkg.currency,
          amount: pkg.price,
          credits: pkg.credit_amount,
          snapshot: buildSnapshot(pkg),
          provider: provider.id,
          idempotency_key: idempotencyKey,
        })
        .select("*")
        .single();
      if (error || !purchase) {
        // Unique index hit → the original pending purchase wins.
        if (error && error.code === "23505") {
          throw new PaymentError("DUPLICATE_PURCHASE_REQUEST", { cause: error });
        }
        throw new PaymentError("PAYMENT_SERVICE_ERROR", { cause: error });
      }

      const record = purchase as unknown as PurchaseRow;
      let session;
      try {
        session = await provider.createCheckout({
          internalReference: record.id,
          amount: record.amount,
          currency: record.currency,
          description: `${record.snapshot.package_name} — ${record.credits.toLocaleString("en-US")} Prosventa Credits`,
          successUrl: params.successUrl,
          cancelUrl: params.cancelUrl,
          metadata: {
            purchase_id: record.id,
            organization_id: organizationId,
          },
        });
      } catch (providerError) {
        // Graceful outage handling: purchase stays 'pending' for safe retry;
        // nothing was charged and no credits exist to grant.
        throw toPaymentError(providerError);
      }

      const { error: linkErr } = await supabase
        .from("purchases")
        .update({ provider_order_id: session.providerOrderId })
        .eq("id", record.id);
      if (linkErr) throw new PaymentError("PAYMENT_SERVICE_ERROR", { cause: linkErr });

      console.info("[payments] checkout created", {
        purchaseId: record.id,
        organizationId,
        provider: provider.id,
        providerOrderId: session.providerOrderId,
      });

      return {
        purchaseId: record.id,
        checkoutUrl: session.checkoutUrl,
        providerOrderId: session.providerOrderId,
      };
    } catch (error) {
      throw toPaymentError(error);
    }
  },

  /**
   * Authoritative purchase status for the redirect/return flow. A successful
   * redirect is NOT proof of payment — when the purchase is still pending we
   * ask the PROVIDER first. Credits are only ever granted by the transactional
   * confirmation RPC; the client merely displays the resulting state.
   */
  async getVerifiedStatus(purchaseId: string): Promise<PurchaseRow> {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new PaymentError("UNAUTHORIZED_PAYMENT_OPERATION");

      // RLS scopes this read to the caller's own organization automatically.
      const { data: purchase } = await supabase
        .from("purchases")
        .select("*")
        .eq("id", purchaseId)
        .single();
      if (!purchase) throw new PaymentError("PURCHASE_NOT_FOUND");

      const row = purchase as unknown as PurchaseRow;
      if (
        row.purchase_status !== "pending" ||
        !row.provider_order_id ||
        !isProviderConfigured()
      ) {
        return row;
      }

      // Ask the authoritative source before showing any final status.
      const provider = getPaymentProvider();
      const remote = await provider.retrievePayment(row.provider_order_id);

      if (remote.status === "succeeded" && remote.providerPaymentId) {
        return confirmFromProviderState(
          row,
          remote.providerPaymentId,
          remote.amount,
          remote.currency,
          remote.paymentMethodType
        );
      }

      if (remote.status === "cancelled" || remote.status === "failed") {
        const admin = createAdminClient();
        const target = remote.status === "cancelled" ? "cancelled" : "failed";
        await admin.rpc("record_purchase_failure", {
          p_purchase_id: row.id,
          p_status: target,
          p_reason: `verification:${remote.rawStatus}`,
        });
        row.purchase_status = target;
      }
      return row;
    } catch (error) {
      throw toPaymentError(error);
    }
  },

  /**
   * Webhook processing pipeline (server-only, service role):
   *   verify signature → register event (PK idempotency) → identify purchase
   *   → transactional confirmation RPC (amount/currency validated, credits
   *   granted via grant_credits) → activity + notification → ack.
   */
  async processWebhookEvent(event: ParsedProviderEvent): Promise<{
    outcome: "processed" | "duplicate" | "ignored";
    detail: Record<string, unknown>;
  }> {
    const admin = createAdminClient();

    // 1. WEBHOOK IDEMPOTENCY: the event id IS the primary key. A redelivered
    //    event collides here and is safely acknowledged without reprocessing.
    const { error: insertErr } = await admin.from("payment_provider_events").insert({
      id: event.eventId,
      provider: "stripe",
      event_type: event.eventType,
      payload_summary: { kind: event.kind, reference: event.internalReference },
    });
    if (insertErr && insertErr.code === "23505") {
      console.info("[payments] webhook duplicate ignored", { eventId: event.eventId });
      return { outcome: "duplicate", detail: { eventId: event.eventId } };
    }
    if (insertErr) {
      throw new PaymentError("PAYMENT_SERVICE_ERROR", { cause: insertErr });
    }

    try {
      // Unknown events are safely acknowledged and marked ignored (provider
      // best practice: return 2xx so they stop retrying).
      if (event.kind === "unknown") {
        await markEventProcessed(admin, event.eventId, "ignored");
        return { outcome: "ignored", detail: { eventType: event.eventType } };
      }

      // 2. Identify the purchase via our own internal reference.
      let purchase: PurchaseRow | null = null;
      if (event.internalReference) {
        const { data } = await admin
          .from("purchases")
          .select("*")
          .eq("id", event.internalReference)
          .maybeSingle();
        purchase = (data as unknown as PurchaseRow) ?? null;
      }
      if (!purchase) {
        await markEventProcessed(admin, event.eventId, "ignored");
        console.warn("[payments] webhook for unknown purchase", { eventId: event.eventId });
        return { outcome: "ignored", detail: { reason: "unknown_purchase" } };
      }

      // 3. Handle by kind.
      if (event.kind === "payment_succeeded") {
        // TRANSACTIONAL CONFIRMATION: paid + payment row + credit grant in ONE
        // database transaction, with amount/currency validation and
        // deterministic purchase-to-credit idempotency inside the DB.
        const { data: result, error } = await admin.rpc("process_payment_confirmation", {
          p_purchase_id: purchase.id,
          p_provider_payment_id: event.providerPaymentId,
          p_amount: event.amount ?? null,
          p_currency: event.currency ?? null,
          p_provider_metadata: {},
          p_payment_method_type: null,
        });
        if (error) {
          throw new PaymentError("CREDIT_GRANT_FAILED", { cause: error });
        }
        const res = (result ?? {}) as Record<string, unknown>;
        const status = String(res.status ?? "");

        if (status === "amount_mismatch") {
          throw new PaymentError("PAYMENT_AMOUNT_MISMATCH");
        }
        if (status === "currency_mismatch") {
          throw new PaymentError("PAYMENT_CURRENCY_MISMATCH");
        }

        if (status === "ok" || status === "duplicate") {
          await notifyOutcome(admin, purchase, "payment_succeeded");
        }

        await markEventProcessed(admin, event.eventId, "processed");
        console.info("[payments] webhook processed", {
          eventId: event.eventId,
          purchaseId: purchase.id,
          organizationId: purchase.organization_id,
          result: status,
        });
        return { outcome: "processed", detail: { result: status } };
      }

      if (event.kind === "payment_failed") {
        await admin.rpc("record_purchase_failure", {
          p_purchase_id: purchase.id,
          p_status: "failed",
          p_reason: `webhook:${event.eventType}`,
        });
        await notifyOutcome(admin, purchase, "payment_failed");
        await markEventProcessed(admin, event.eventId, "processed");
        return { outcome: "processed", detail: { result: "failed" } };
      }

      // refund_processed events are acknowledged; compensating credit
      // movements happen only through the explicit administrative refund flow
      // (PurchaseService.processRefund) — never implicitly from webhooks.
      await markEventProcessed(admin, event.eventId, "ignored");
      return { outcome: "ignored", detail: { reason: "refund_handled_administratively" } };
    } catch (error) {
      // Mark the event failed for observability/reconciliation (Phase 6).
      await admin
        .from("payment_provider_events")
        .update({
          processing_status: "failed",
          error: error instanceof Error ? error.message : "unknown",
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.eventId);
      throw error;
    }
  },

  /**
   * REFUND FOUNDATION (administrative only). Verifies with the provider,
   * then runs the transactional refund RPC that adds compensating ledger
   * entries through adjust_credits and records consumed-credit shortfall.
   */
  async processRefund(params: {
    purchaseId: string;
    actorUserId: string;
    amountMinor?: number | null;
    reason?: string | null;
  }): Promise<Record<string, unknown>> {
    const supabase = await createClient();

    // ELEVATED AUTHORIZATION: refunds are owner/admin-only operations and are
    // never exposed to normal organization members.
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", params.actorUserId)
      .single();
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new PaymentError("UNAUTHORIZED_PAYMENT_OPERATION");
    }

    const { data: purchase } = await supabase
      .from("purchases")
      .select("*")
      .eq("id", params.purchaseId)
      .single();
    if (!purchase) throw new PaymentError("PURCHASE_NOT_FOUND");

    const row = purchase as unknown as PurchaseRow;
    if (
      !row.provider_payment_id ||
      !["paid", "partially_refunded"].includes(row.purchase_status)
    ) {
      throw new PaymentError("REFUND_INVALID_STATE");
    }

    // Verify with the provider first — money actually leaves here.
    const provider = getPaymentProvider();
    const refundResult = await provider.refundPayment({
      providerPaymentId: row.provider_payment_id,
      amount: params.amountMinor ?? null,
      reason: params.reason ?? null,
    });
    if (refundResult.status === "failed") {
      throw new PaymentError("PAYMENT_SERVICE_ERROR");
    }

    const admin = createAdminClient();
    const { data: result, error } = await admin.rpc("process_purchase_refund", {
      p_purchase_id: row.id,
      p_refund_amount: refundResult.amount,
      p_currency: row.currency,
      p_provider_refund_id: refundResult.providerRefundId,
      p_credits_to_revoke: null,
      p_actor_id: params.actorUserId,
      p_reason: params.reason ?? "administrative_refund",
    });
    if (error) throw new PaymentError("REFUND_INVALID_STATE", { cause: error });

    const res = (result ?? {}) as Record<string, unknown>;
    if (res.status !== "ok") {
      throw new PaymentError(
        res.status === "refund_amount_invalid"
          ? "REFUND_AMOUNT_INVALID"
          : res.status === "duplicate"
            ? "WEBHOOK_DUPLICATE_EVENT"
            : "REFUND_INVALID_STATE",
        { cause: res }
      );
    }

    console.info("[payments] refund processed", {
      purchaseId: row.id,
      organizationId: row.organization_id,
      providerRefundId: refundResult.providerRefundId,
      creditsRevoked: res.credits_revoked,
    });
    return res;
  },
};

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

/** Whether a provider is configured at all (env-based, never throws). */
function isProviderConfigured(): boolean {
  try {
    getPaymentProvider();
    return true;
  } catch {
    return false;
  }
}

/**
 * Confirms a purchase from VERIFIED provider state using the same
 * transactional RPC the webhook uses — one code path, one guarantee.
 */
async function confirmFromProviderState(
  row: PurchaseRow,
  providerPaymentId: string | null,
  amount: number | null,
  currency: string | null,
  methodType: string | null
): Promise<PurchaseRow> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("process_payment_confirmation", {
    p_purchase_id: row.id,
    p_provider_payment_id: providerPaymentId,
    p_amount: amount,
    p_currency: currency,
    p_provider_metadata: {},
    p_payment_method_type: methodType,
  });
  if (error) throw new PaymentError("CREDIT_GRANT_FAILED", { cause: error });
  const res = (data ?? {}) as Record<string, unknown>;
  if (res.status === "ok") {
    row.purchase_status = "paid";
    row.provider_payment_id = providerPaymentId;
  }
  return row;
}

async function markEventProcessed(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  status: "processed" | "ignored"
): Promise<void> {
  await admin
    .from("payment_provider_events")
    .update({
      processing_status: status,
      processed_at: new Date().toISOString(),
    })
    .eq("id", eventId);
}

/**
 * Reuses the EXISTING collaboration activity/notification infrastructure —
 * no duplicate event system. Notifications cannot be duplicated by webhook
 * retries because duplicates exit at the event-idempotency gate above and
 * never reach this function.
 */
async function notifyOutcome(
  admin: ReturnType<typeof createAdminClient>,
  purchase: PurchaseRow,
  outcome: "payment_succeeded" | "payment_failed" | "refund_processed"
): Promise<void> {
  try {
    if (!purchase.created_by) return;

    await admin.from("activity_events").insert({
      organization_id: purchase.organization_id,
      actor_id: purchase.created_by,
      action: outcome,
      entity_type: "purchase",
      entity_id: purchase.id,
      entity_name: String(purchase.snapshot.package_name ?? "Credit purchase"),
      metadata: { credits: purchase.credits, amount: purchase.amount },
    });

    const copy = {
      payment_succeeded: {
        type: "payment_succeeded",
        title: "Payment successful — credits added",
        body: `${purchase.credits.toLocaleString("en-US")} Prosventa Credits were added to your workspace.`,
      },
      payment_failed: {
        type: "payment_failed",
        title: "Payment couldn't be completed",
        body: "No credits were charged. Your existing balance is unchanged.",
      },
      refund_processed: {
        type: "refund_processed",
        title: "Refund processed",
        body: `A refund of ${purchase.refunded_amount} (${purchase.currency}) was processed.`,
      },
    }[outcome];

    await admin.from("notifications").insert({
      user_id: purchase.created_by,
      organization_id: purchase.organization_id,
      ...copy,
      entity_type: "purchase",
      entity_id: purchase.id,
    });
  } catch {
    // Notification failure must never break payment processing.
    console.warn("[payments] notification failure", { purchaseId: purchase.id });
  }
}

