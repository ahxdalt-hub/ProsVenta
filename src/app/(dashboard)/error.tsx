"use client";

import { useEffect } from "react";
import { DashboardErrorState } from "@/components/dashboard/feedback/PageStates";

export default function DashboardErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console in development
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <section className="dashboard-enter">
      <DashboardErrorState
        title="Something went wrong"
        description="We encountered an unexpected error while loading this page. Your data is safe — please try again."
        onRetry={reset}
      />
    </section>
  );
}