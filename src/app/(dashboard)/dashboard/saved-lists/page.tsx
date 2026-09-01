// ============================================================================
// Prosventa Saved Lists — Organized prospect workspace (Phase 2 rebuild)
// ============================================================================
// Server shell: ensures the organization exists, then loads every saved list
// with its real prospect count in ONE aggregated query (no waterfalls, no
// per-list round trips). All data flows through RLS-scoped lib/db functions.
// ============================================================================

import { Suspense } from "react";
import { ensureOrganization } from "@/lib/db/organizations";
import { getSavedListsWithCounts } from "@/lib/db/lists";
import { SavedListsWorkspace } from "@/features/prospects/components/saved-lists/SavedListsWorkspace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Saved Lists - Prosventa",
};

function SavedListsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="premium-card p-5">
            <div className="flex items-start gap-3">
              <div className="premium-skeleton h-9 w-9 shrink-0 rounded-lg" aria-hidden="true" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="premium-skeleton h-4 w-32" aria-hidden="true" />
                <div className="premium-skeleton h-3 w-24" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="premium-skeleton h-3 w-full" aria-hidden="true" />
              <div className="premium-skeleton h-3 w-2/3" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DashboardSavedListsPage() {
  await ensureOrganization();

  let lists: Awaited<ReturnType<typeof getSavedListsWithCounts>> = [];
  let loadError = false;
  try {
    lists = await getSavedListsWithCounts();
  } catch {
    loadError = true;
  }

  return (
    <Suspense fallback={<SavedListsSkeleton />}>
      <SavedListsWorkspace
        initialLists={lists}
        loadError={loadError ? "We couldn't load your saved lists. Please try again." : null}
      />
    </Suspense>
  );
}

