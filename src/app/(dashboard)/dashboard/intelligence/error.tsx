"use client";

// ============================================================================
// Prosventa Intelligence — Route error boundary
// ============================================================================
// Calm, user-safe recovery state. Raw errors are logged to the console for
// debugging but never rendered to the user.
// ============================================================================

import { useEffect } from "react";
import { DashboardErrorState } from "@/components/dashboard/feedback/PageStates";

export default function IntelligenceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Intelligence error:", error);
  }, [error]);

  return (
    <div className="dashboard-enter">
      <DashboardErrorState
        title="Intelligence couldn't load"
        description="We encountered an unexpected error while loading your intelligence workspace. Your data is safe — please try again."
        onRetry={reset}
      />
    </div>
  );
}
