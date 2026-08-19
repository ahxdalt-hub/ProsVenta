import { Suspense } from "react";
import { getAnalyticsData } from "@/lib/db/analytics";
import { AnalyticsClient } from "@/components/dashboard/analytics/AnalyticsClient";
import { AnalyticsSkeleton } from "@/components/dashboard/analytics/AnalyticsSkeleton";

export default async function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}

async function AnalyticsContent() {
  const data = await getAnalyticsData();
  return <AnalyticsClient data={data} />;
}