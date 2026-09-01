// ============================================================================
// Prosventa Intelligence Workspace — Intelligence Status Area
// ============================================================================
// Compact status derived from REAL application state (recent intelligence job
// outcomes). No invented health infrastructure: recent failures mean
// attention is required; otherwise the system reports normal.
// ============================================================================

import { getIntelligenceHealth } from "../data";
import { Reveal } from "./Reveal";

export async function IntelligenceStatus() {
  let health;
  try {
    health = await getIntelligenceHealth();
  } catch {
    // The status strip must never break the page — degrade to informational.
    return (
      <Reveal>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" aria-hidden="true" />
          Status unavailable
        </div>
      </Reveal>
    );
  }

  const healthy = health.state === "healthy";

  return (
    <Reveal delay={0.05}>
      <div
        role="status"
        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
          healthy
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${
            healthy ? "bg-green-500" : "bg-amber-500"
          }`}
        />
        {health.message}
      </div>
    </Reveal>
  );
}
