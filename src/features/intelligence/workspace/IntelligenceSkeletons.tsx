// ============================================================================
// Prosventa Intelligence Workspace — Loading Skeletons
// ============================================================================
// Phase 1: layout-stable skeletons matching the final Intelligence page
// structure so loading never causes layout jumping.
// ============================================================================

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`premium-skeleton ${className}`} aria-hidden="true" />;
}

export function IntelligenceWorkspaceSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading Intelligence">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Attention summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="premium-card flex items-center gap-4 p-5">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>

      {/* Priorities + feed / context column */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8 min-w-0">
          <div className="space-y-3">
            <Skeleton className="h-6 w-52" />
            <div className="premium-card divide-y divide-slate-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full max-w-md" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-44" />
            <div className="premium-card divide-y divide-slate-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full max-w-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden space-y-3 xl:block" aria-hidden="true">
          <Skeleton className="h-3 w-32" />
          <div className="premium-card divide-y divide-slate-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
