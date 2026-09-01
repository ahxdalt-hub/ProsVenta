// ============================================================================
// Prosventa Intelligence Workspace — Credit Usage Line
// ============================================================================
// Concise credit awareness using the EXISTING credit architecture (read-only):
// wallet balance via CreditService + consumption from the last 30 days of the
// ledger. Hidden entirely when no reliable data exists. No deduction logic.
// ============================================================================

import { getCreditSnapshot } from "../data";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "./Reveal";

export function CreditUsageFallback() {
  return (
    <div className="inline-flex items-center gap-2 text-xs text-slate-400" aria-hidden="true">
      <Skeleton className="h-3.5 w-40" />
    </div>
  );
}

export async function CreditUsage() {
  // No wallet / unauthenticated → hide quietly; credits are optional context.
  let snapshot;
  try {
    snapshot = await getCreditSnapshot();
  } catch {
    return null;
  }
  if (!snapshot) return null;

  return (
    <Reveal>
      <p className="inline-flex items-center gap-2 text-xs text-slate-500">
        <span className="text-slate-400" aria-hidden="true">
          <DashboardIcon name="credits" size={14} />
        </span>
        Intelligence usage ·{" "}
        <span className="font-semibold tabular-nums text-slate-700">
          {snapshot.balance.toLocaleString("en-US")}
        </span>{" "}
        Credits available ·{" "}
        <span className="font-semibold tabular-nums text-slate-700">
          {snapshot.usedRecently.toLocaleString("en-US")}
        </span>{" "}
        used in the last 30 days
      </p>
    </Reveal>
  );
}
