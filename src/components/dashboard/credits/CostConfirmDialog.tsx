"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatCredits, CREDIT_LABEL } from "@/features/credits/ui-config";

interface ConfirmCostProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  cost: number;
  balance: number | null;
  loading?: boolean;
  confirmLabel?: string;
  /** For batch flows the total is an estimate, not a guaranteed charge. */
  estimated?: boolean;
}

/**
 * High-cost operation / batch confirmation. Shows exact (or estimated) usage
 * and projected remaining balance. Only rendered when
 * requiresConfirmation(cost) is true at the call site.
 */
export function CostConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  cost,
  balance,
  loading = false,
  confirmLabel = "Continue",
  estimated = false,
}: ConfirmCostProps) {
  const projected =
    typeof balance === "number" ? Math.max(balance - cost, 0) : null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-600">
        <p>
          This will use{" "}
          <strong className="font-semibold text-slate-900 tabular-nums">
            {formatCredits(cost)} {CREDIT_LABEL}
          </strong>
          .
        </p>
        {typeof balance === "number" && projected !== null && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">
              Your balance after this operation will be approximately:
            </p>
            <p className="mt-1 font-semibold text-slate-900 tabular-nums">
              {formatCredits(balance)} → {formatCredits(projected)}
            </p>
          </div>
        )}
        {estimated && (
          <p className="text-xs text-slate-400">
            Final usage may vary slightly depending on results.
          </p>
        )}
      </div>
    </Modal>
  );
}
