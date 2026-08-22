import { Spinner } from "@/components/ui/Spinner";

export default function OrganizationLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page header */}
      <div>
        <div className="skeleton h-7 w-40" />
        <div className="skeleton mt-2 h-4 w-64" />
      </div>

      {/* Organization identity skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <div className="skeleton h-16 w-16 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton mt-2 h-4 w-72 max-w-full" />
          </div>
        </div>
      </div>

      {/* Workspace information skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="skeleton h-5 w-44" />
        <div className="mt-4 space-y-3">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>

      {/* Members skeleton */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="skeleton h-5 w-24" />
            <div className="skeleton mt-1.5 h-4 w-56" />
          </div>
          <div className="skeleton h-9 w-36 rounded-lg" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="skeleton h-10 w-10 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton mt-1.5 h-3 w-48" />
              </div>
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-2" role="status" aria-label="Loading organization">
        <Spinner size="lg" className="text-blue-600" />
        <span className="sr-only">Loading organization</span>
      </div>
    </div>
  );
}
