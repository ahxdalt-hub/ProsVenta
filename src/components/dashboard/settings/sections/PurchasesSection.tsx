"use client";

import { PurchaseHistory } from "@/components/dashboard/credits/PurchaseHistory";

// ============================================================================
// PurchasesSection — Settings › Purchases
// ============================================================================
// Real purchase records only (GET /api/payments/purchases). Statuses render
// from the authoritative backend state; empty state explains what will appear.
// ============================================================================

export function PurchasesSection() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Credits are added to your workspace only after payment is confirmed by
        the payment provider.
      </p>
      <PurchaseHistory />
    </div>
  );
}
