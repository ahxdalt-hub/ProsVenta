"use client";

// ============================================================================
// Prosventa Automation Control Center — Retry Button
// ============================================================================
// Shown ONLY when the execution failed with a user-retryable category. Delegates
// to the Phase 4 mechanism (failed → queued → resumable runner) via the server
// action; the server re-validates org + state + retryability.
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { retryExecutionAction } from "@/features/automation/orchestrator-actions";

export function RetryExecutionButton({ executionId }: { executionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        loading={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const result = await retryExecutionAction(executionId);
          setLoading(false);
          if (result.error) setError(result.error);
          else router.refresh();
        }}
      >
        Retry
      </Button>
      <span role="alert" className="text-xs text-red-600">
        {error}
      </span>
    </div>
  );
}
