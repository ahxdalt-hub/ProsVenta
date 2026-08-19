"use client";

import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Premium skeleton loading state for the Analytics dashboard.
 * Mirrors the exact layout of the loaded dashboard to prevent layout shifts.
 * Uses smooth shimmer animations with no flashes.
 */
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>

      {/* Content container */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-10">
          {/* KPI cards skeleton */}
          <div>
            <Skeleton className="mb-4 h-4 w-40" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="premium-card p-5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="mt-4 h-8 w-20" />
                  <Skeleton className="mt-2 h-4 w-28" />
                </div>
              ))}
            </div>
          </div>

          {/* Growth chart skeleton */}
          <div>
            <Skeleton className="mb-4 h-4 w-40" />
            <div className="premium-card p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-1 h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-[240px] w-full rounded-lg" />
            </div>
          </div>

          {/* Pipeline skeleton */}
          <div>
            <Skeleton className="mb-4 h-4 w-40" />
            <div className="premium-card p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-1 h-3 w-24" />
                </div>
              </div>
              <div className="flex items-center gap-8">
                <Skeleton className="h-40 w-40 rounded-full" />
                <div className="flex-1 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="ml-auto h-4 w-8" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Industry + Country skeleton */}
          <div>
            <Skeleton className="mb-4 h-4 w-40" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="premium-card p-6">
                  <div className="mb-4 flex items-center gap-2.5">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-1 h-3 w-24" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-7 flex-1 rounded-md" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lead quality skeleton */}
          <div>
            <Skeleton className="mb-4 h-4 w-40" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="premium-card p-6">
                  <div className="mb-4 flex items-center gap-2.5">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-1 h-3 w-24" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-7 flex-1 rounded-md" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export skeleton */}
          <div>
            <Skeleton className="mb-4 h-4 w-40" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="mt-1 h-3 w-36" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}