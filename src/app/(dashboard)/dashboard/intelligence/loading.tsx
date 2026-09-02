// ============================================================================
// Prosventa Intelligence — Route loading state
// ============================================================================
// Layout-stable skeleton matching the Intelligence page structure so the
// loading transition never causes layout jumping.
// ============================================================================

import { IntelligenceWorkspaceSkeleton } from "@/features/intelligence/workspace/IntelligenceSkeletons";

export default function IntelligenceLoading() {
  return (
    <div className="dashboard-enter">
      <IntelligenceWorkspaceSkeleton />
    </div>
  );
}
