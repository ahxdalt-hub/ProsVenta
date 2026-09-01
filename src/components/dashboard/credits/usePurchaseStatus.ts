"use client";

import { useEffect, useState } from "react";
import type { PurchaseStatusDto } from "@/features/credits/api-types";

// ============================================================================
// usePurchaseStatus — authoritative purchase status polling
// ============================================================================
// A checkout redirect is NOT proof of payment. Polls the Phase 4 status route
// (which asks the provider while pending) a bounded number of times. A network
// failure keeps the "still confirming" state — never fabricates an outcome.
// ============================================================================

const MAX_POLLS = 40; // ~2 minutes at 3s intervals
const INTERVAL_MS = 3000;

const UNRESOLVED = new Set(["pending", "processing"]);

export function usePurchaseStatus(purchaseId: string | null) {
  const [data, setData] = useState<PurchaseStatusDto | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!purchaseId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let polls = 0;

    async function poll() {
      polls += 1;
      try {
        const res = await fetch(`/api/payments/purchases/${purchaseId}`, {
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as PurchaseStatusDto;
        if (cancelled) return;
        setData(body);
        setError(false);
        if (UNRESOLVED.has(body.purchase.status) && polls < MAX_POLLS) {
          timer = setTimeout(() => void poll(), INTERVAL_MS);
        }
      } catch {
        if (cancelled) return;
        // Keep "confirming" state on failure; retry within bounds.
        setError(true);
        if (polls < MAX_POLLS) timer = setTimeout(() => void poll(), INTERVAL_MS);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [purchaseId]);

  return { data, error };
}
