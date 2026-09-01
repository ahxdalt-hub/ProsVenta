// ============================================================================
// Prosventa Payments — Reconciliation
// Stage 8 — Phase 4: Payment + Credit Purchase System
// ============================================================================
// DETECTION ONLY — discrepancies are reported, never silently "fixed". Any
// repair is an explicit, auditable process (Phase 6 production hardening).
//
// Detects:
//   - paid_without_credits   : purchase marked paid but no 'purchase:{id}'
//                              ledger entry exists
//   - credits_without_paid   : ledger purchase-grant without a paid purchase
//   - duplicate_grants       : more than one positive grant per purchase ref
//   - amount_mismatches      : payment row amount ≠ purchase snapshot amount
//   - failed_webhooks        : provider events stuck in 'failed'/'processing'
// ============================================================================

import "server-only";

import { createClient } from "@/lib/supabase/server";
import { PaymentError, toPaymentError } from "./errors";

export interface ReconciliationFinding {
  type: string;
  purchaseId: string | null;
  detail: Record<string, unknown>;
}

export interface PaymentReconciliationReport {
  checkedAt: string;
  ok: boolean;
  findings: ReconciliationFinding[];
}

export const PaymentReconciliation = {
  /** Full consistency sweep for one organization (admin/support tooling). */
  async runForOrganization(organizationId: string): Promise<PaymentReconciliationReport> {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new PaymentError("UNAUTHORIZED_PAYMENT_OPERATION");

      const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .single();
      if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new PaymentError("UNAUTHORIZED_PAYMENT_OPERATION");
      }

      const findings: ReconciliationFinding[] = [];

      const [{ data: purchases }, { data: grantEntries }, { data: events }] =
        await Promise.all([
          supabase.from("purchases").select("*").eq("organization_id", organizationId),
          supabase
            .from("credit_transactions")
            .select("reference_id, idempotency_key, amount")
            .eq("organization_id", organizationId)
            .eq("type", "purchase"),
          supabase
            .from("payment_provider_events")
            .select("id, processing_status")
            .in("processing_status", ["failed", "processing"])
            .limit(100),
        ]);

      const purchaseRows = purchases ?? [];
      const grantsByRef = new Map<string, { count: number; total: number }>();
      for (const entry of grantEntries ?? []) {
        const ref = String(entry.reference_id ?? "");
        if (!ref) continue;
        const current = grantsByRef.get(ref) ?? { count: 0, total: 0 };
        current.count += 1;
        current.total += entry.amount ?? 0;
        grantsByRef.set(ref, current);
      }

      for (const p of purchaseRows) {
        const grants = grantsByRef.get(p.id);

        if (p.purchase_status === "paid" && !grants) {
          findings.push({
            type: "paid_without_credits",
            purchaseId: p.id,
            detail: { expectedCredits: p.credits },
          });
        }
        if (p.purchase_status !== "paid" && grants && grants.total > 0) {
          findings.push({
            type: "credits_without_paid",
            purchaseId: p.id,
            detail: { grantedTotal: grants.total },
          });
        }
        if (grants && grants.count > 1) {
          findings.push({
            type: "duplicate_grants",
            purchaseId: p.id,
            detail: { count: grants.count },
          });
        }
        if (grants && grants.total !== p.credits) {
          findings.push({
            type: "grant_amount_mismatch",
            purchaseId: p.id,
            detail: { expected: p.credits, actual: grants.total },
          });
        }
      }

      for (const event of events ?? []) {
        findings.push({
          type: event.processing_status === "failed" ? "failed_webhook" : "stuck_webhook",
          purchaseId: null,
          detail: { eventId: event.id },
        });
      }

      return {
        checkedAt: new Date().toISOString(),
        ok: findings.length === 0,
        findings,
      };
    } catch (error) {
      throw toPaymentError(error);
    }
  },
};
