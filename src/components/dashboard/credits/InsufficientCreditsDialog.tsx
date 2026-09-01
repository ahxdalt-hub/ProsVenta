"use client";

import Link from "next/link";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatCredits, CREDIT_LABEL } from "@/features/credits/ui-config";
import { CreditToken } from "./CreditToken";

// ============================================================================
// Insufficient credits — never a bare error. States exactly what's required,
// what's available, and the gap; routes to the purchase flow without ever
// triggering a purchase automatically.
// ============================================================================

export function InsufficientCreditsDialog({
  open,
  onClose,
  required,
  available,
}: {
  open: boolean;
  onClose: () => void;
  required: number;
  available: number;
}) {
  const needed = Math.max(required - available, 0);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Not enough ${CREDIT_LABEL}`}
      tone="alert"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Link
            href="/dashboard/settings/billing#get-credits"
            className="inline-flex items-center justify-center rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Get Credits
          </Link>
        </>
      }
    >
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">This operation requires</dt>
          <dd className="font-semibold text-slate-900 tabular-nums">
            {formatCredits(required)} Credits
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Available</dt>
          <dd className="font-semibold text-slate-900 tabular-nums">
            {formatCredits(available)} Credits
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-2">
          <dt className="text-slate-500">You need</dt>
          <dd className="font-semibold text-amber-700 tabular-nums">
            {formatCredits(needed)} more Credits
          </dd>
        </div>
      </dl>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
        <CreditToken size={16} /> You choose if and when to add credits.
      </p>
    </Modal>
  );
}
