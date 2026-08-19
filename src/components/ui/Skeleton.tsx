interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`premium-skeleton ${className}`} aria-hidden="true" />;
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="premium-card p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-16" />
          <Skeleton className="mt-2 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function ProspectTableSkeleton() {
  return (
    <>
      {/* Desktop skeleton */}
      <div className="premium-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {["Company", "Industry", "Location", "Website", "Status", "Priority", "Source", "Created"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                      <div>
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="mt-1.5 h-3 w-20" />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-5 py-3.5"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-5 py-3.5"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-5 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-5 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-5 py-3.5"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-5 py-3.5"><Skeleton className="h-4 w-20" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile skeleton */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="premium-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                <div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-1.5 h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full shrink-0" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j}>
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="mt-1 h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function ListManagerSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="premium-card p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />
    </div>
  );
}