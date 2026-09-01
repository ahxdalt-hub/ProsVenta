// ============================================================================
// Prosventa Payments — Payment History Queries
// Stage 8 — Phase 4: Payment + Credit Purchase System
// ============================================================================
// Server-side, paginated purchase/payment history. Never loads full history
// into the browser. RLS scopes every read to the caller's own organization.
// ============================================================================

import "server-only";

import { createClient } from "@/lib/supabase/server";
import { PaymentError, toPaymentError } from "./errors";
import type { PurchaseRow } from "./types";

export interface HistoryPage {
  purchases: PurchaseRow[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const PurchaseHistory = {
  /** Paginated purchase list for the caller's organization. */
  async list(params: {
    page?: number;
    pageSize?: number;
    status?: PurchaseRow["purchase_status"] | null;
    organizationId: string;
  }): Promise<HistoryPage> {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new PaymentError("UNAUTHORIZED_PAYMENT_OPERATION");

      // Membership check → clean authorization error for foreign org ids
      // (RLS would also block the read itself).
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("organization_id", params.organizationId)
        .maybeSingle();
      if (!membership) throw new PaymentError("UNAUTHORIZED_PAYMENT_OPERATION");

      const page = Math.max(1, params.page ?? 1);
      const pageSize = Math.min(Math.max(1, params.pageSize ?? 20), 100);
      const from = (page - 1) * pageSize;

      let query = supabase
        .from("purchases")
        .select("*")
        .eq("organization_id", params.organizationId)
        .order("created_at", { ascending: false })
        .range(from, from + pageSize); // fetch one extra to compute hasMore
      if (params.status) {
        query = query.eq("purchase_status", params.status);
      }

      const { data, error } = await query;
      if (error) throw new PaymentError("PAYMENT_SERVICE_ERROR", { cause: error });

      const rows = (data ?? []) as unknown as PurchaseRow[];
      return {
        purchases: rows.slice(0, pageSize),
        page,
        pageSize,
        hasMore: rows.length > pageSize,
      };
    } catch (error) {
      throw toPaymentError(error);
    }
  },

  /**
   * Single purchase with its payment rows — the "Purchase → +Credits →
   * Ledger" traceability view for support/audit foundations.
   */
  async getWithPayments(params: {
    purchaseId: string;
    organizationId: string;
  }): Promise<{ purchase: PurchaseRow; payments: unknown[] }> {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new PaymentError("UNAUTHORIZED_PAYMENT_OPERATION");

      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("organization_id", params.organizationId)
        .maybeSingle();
      if (!membership) throw new PaymentError("UNAUTHORIZED_PAYMENT_OPERATION");

      const { data: purchase, error } = await supabase
        .from("purchases")
        .select("*, payments(*)")
        .eq("id", params.purchaseId)
        .eq("organization_id", params.organizationId)
        .single();
      if (error || !purchase) throw new PaymentError("PURCHASE_NOT_FOUND", { cause: error });

      const { payments, ...row } = purchase as unknown as Record<string, unknown>;
      return { purchase: row as unknown as PurchaseRow, payments: (payments as unknown[]) ?? [] };
    } catch (error) {
      throw toPaymentError(error);
    }
  },
};
