"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type {
  CheckoutResultDto,
  CreditPackageDto,
} from "@/features/credits/api-types";
import { formatCredits, CREDIT_LABEL } from "@/features/credits/ui-config";
import { CreditToken } from "./CreditToken";

// ============================================================================
// CreditPurchaseSelector — customer-facing purchase selection
// ============================================================================
// Displays the AUTHORITATIVE package catalog (GET /api/payments/packages).
// Checkout sends ONLY the package key — never an amount — so the frontend can
// never construct a price. Double-submission is blocked client-side and
// idempotency-keyed server-side.
// ============================================================================

const PENDING_PURCHASE_KEY = "prosventa.pending-purchase";

export function PurchaseSelector({ balance }: { balance?: number | null }) {
  const { data, error, loading, refresh } =
    useApiResource<CreditPackageDto[]>("/api/payments/packages");
  const [selected, setSelected] = useState<CreditPackageDto | null>(null);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function startCheckout(pkg: CreditPackageDto) {
    if (startingCheckout) return; // duplicate-click protection
    setStartingCheckout(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          packageKey: pkg.key,
          requestId: crypto.randomUUID(), // server-side idempotency key
        }),
      });
      const body = (await res.json()) as CheckoutResultDto & { error?: string };
      if (!res.ok || !body.checkoutUrl) {
        throw new Error(
          body.error ?? "We couldn't start your checkout. Please try again."
        );
      }
      // Remember the purchase for the return page's authoritative status poll.
      try {
        sessionStorage.setItem(PENDING_PURCHASE_KEY, body.purchaseId);
      } catch {
        /* storage unavailable — return page falls back to generic state */
      }
      window.location.assign(body.checkoutUrl);
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "We couldn't start your checkout."
      );
      setStartingCheckout(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="premium-card h-44 animate-pulse bg-slate-50" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-medium text-slate-700">
          Credit packages are currently unavailable.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No credit packages right now"
        description={`Packages to add ${CREDIT_LABEL} will appear here when available.`}
      />
    );
  }

  const grid = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="package-grid">
      {data.map((pkg) => (
        <article
          key={pkg.key}
          className={`premium-card flex flex-col p-5 ${pkg.recommended ? "ring-1 ring-sky-300" : ""}`}
          data-testid="package-card"
          data-recommended={pkg.recommended || undefined}
        >
          <div className="flex items-start justify-between">
            <h4 className="text-sm font-semibold text-slate-900">{pkg.name}</h4>
            {pkg.recommended && <Badge>Recommended</Badge>}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sky-600">
              <CreditToken size={32} />
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900 tabular-nums">
              {formatCredits(pkg.creditAmount)}
            </span>
            <span className="text-sm text-slate-500">Credits</span>
          </div>
          {pkg.description && (
            <p className="mt-2 flex-1 text-xs text-slate-500">{pkg.description}</p>
          )}
          <p className="mt-4 text-lg font-semibold text-slate-900">{pkg.displayPrice}</p>
          <Button
            className="mt-3"
            onClick={() => setSelected(pkg)}
            aria-label={`Purchase ${formatCredits(pkg.creditAmount)} Credits for ${pkg.displayPrice}`}
          >
            Purchase
          </Button>
        </article>
      ))}
    </div>
  );

  // Purchase confirmation — exact package, exact total. No vague labels.
  const confirmDialog = selected ? (
    <Modal
      open
      onClose={() => (startingCheckout ? undefined : setSelected(null))}
      title={selected.name}
      description={startingCheckout ? "Preparing secure checkout..." : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={() => setSelected(null)} disabled={startingCheckout}>
            Cancel
          </Button>
          <Button onClick={() => void startCheckout(selected)} loading={startingCheckout}>
            {startingCheckout ? "Preparing secure checkout..." : `Pay ${selected.displayPrice}`}
          </Button>
        </>
      }
    >
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">You&apos;ll receive</dt>
          <dd className="flex items-center gap-1 font-medium text-slate-900 tabular-nums">
            {formatCredits(selected.creditAmount)}
            <CreditToken size={16} /> Credits
          </dd>
        </div>
        {typeof balance === "number" && (
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Balance after purchase</dt>
            <dd className="font-medium text-slate-900 tabular-nums">
              ≈ {formatCredits(balance + selected.creditAmount)}
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2">
          <dt className="font-medium text-slate-900">Total</dt>
          <dd className="text-base font-bold text-slate-900">{selected.displayPrice}</dd>
        </div>
        {checkoutError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {checkoutError}
          </p>
        )}
      </dl>
    </Modal>
  ) : null;

  return (
    <>
      {grid}
      {confirmDialog}
    </>
  );
}

