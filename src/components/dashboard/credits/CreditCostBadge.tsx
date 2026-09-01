import { CreditToken } from "./CreditToken";
import { getOperationCost, type CreditOperationKey } from "@/features/credits/operations";

// ============================================================================
// Prosventa Credits — Credit Cost Badge
// Stage 8 — Phase 2: Credit Consumption + Usage Tracking
// ============================================================================
// Cost disclosure for billable operations: "Uses N <token>".
//
// The displayed value comes from the SHARED CreditOperationCatalog — the same
// single source the server re-resolves at execution time. The frontend is
// never billing authority; it only displays the authoritative configuration.
// Uses the custom Prosventa Credit Token (never a generic emoji).
// ============================================================================

interface CreditCostBadgeProps {
  operationKey: CreditOperationKey;
  /** Compact variant for inline placement next to buttons. */
  compact?: boolean;
  className?: string;
}

export function CreditCostBadge({
  operationKey,
  compact = false,
  className,
}: CreditCostBadgeProps) {
  const cost = getOperationCost(operationKey);
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 text-sky-700 " +
        (compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs") +
        (className ? ` ${className}` : "")
      }
      title={`This operation uses ${cost} Prosventa Credits`}
      data-testid="credit-cost"
      data-operation={operationKey}
    >
      Uses {cost}
      <CreditToken size={compact ? 16 : 20} />
    </span>
  );
}

/**
 * Clean insufficient-credits boundary. No checkout exists yet (later Stage 8
 * phase) — this is the placeholder action boundary.
 */
export function InsufficientCreditsNotice({
  required,
  available,
  compact = false,
}: {
  required?: number | null;
  available?: number | null;
  compact?: boolean;
}) {
  return (
    <span
      role="status"
      data-testid="insufficient-credits"
      className={
        "inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700 " +
        (compact ? "text-[11px]" : "text-xs")
      }
    >
      <CreditToken size={compact ? 16 : 20} />
      <span>
        Insufficient credits
        {typeof required === "number" && typeof available === "number"
          ? ` — needs ${required}, available ${available}.`
          : "."}
      </span>
    </span>
  );
}


// ---------------------------------------------------------------------------
// Server actions attach a structured `billing` field on billing failures
// (see BillableOperations.toBillingErrorInfo). This accessor lets client
// components read it without widening every operation-result type.
// ---------------------------------------------------------------------------
export interface BillingErrorInfoLike {
  code: string;
  message: string;
  balance: number | null;
  required: number | null;
}

export function getBillingInfo(op: unknown): BillingErrorInfoLike | null {
  const info = (op as { billing?: BillingErrorInfoLike | null } | null)?.billing;
  return info ?? null;
}
