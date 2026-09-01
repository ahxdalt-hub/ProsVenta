export default function OrganizationLoading() {
  return (
    <div className="space-y-6 sm:space-y-8" aria-busy="true">
      {/* ============================ Hero / header ============================ */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="skeleton h-16 w-16 rounded-2xl sm:h-20 sm:w-20" />
          <div className="min-w-0 flex-1 pt-1">
            <div className="skeleton h-3 w-24" />
            <div className="mt-2.5 flex items-center gap-3">
              <div className="skeleton h-7 w-56 max-w-full" />
              <div className="skeleton hidden h-6 w-28 rounded-full sm:block" />
            </div>
            <div className="skeleton mt-3 h-4 w-80 max-w-full" />
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <div className="skeleton h-6 w-32 rounded-full" />
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-6 w-24 rounded-full" />
              <div className="skeleton h-6 w-28 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:shrink-0">
          <div className="skeleton h-9 w-full rounded-lg sm:w-40" />
          <div className="skeleton h-9 w-full rounded-lg sm:w-44" />
        </div>
      </div>

      {/* ========================= At-a-glance stat strip ====================== */}
      <div className="premium-card overflow-hidden">
        <div className="grid grid-cols-3 gap-px bg-slate-200/70">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white p-4 sm:p-6">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton mt-3 h-6 w-12" />
              <div className="skeleton mt-2.5 h-3 w-32 max-w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* ============================= Main content ============================= */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Organization profile skeleton */}
        <div className="premium-card p-6 lg:col-span-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-lg" />
              <div>
                <div className="skeleton h-4 w-40" />
                <div className="skeleton mt-1.5 h-3 w-52" />
              </div>
            </div>
            <div className="skeleton h-6 w-28 rounded-md" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i}>
                <div className="skeleton h-3 w-20" />
                <div className="skeleton mt-2 h-4 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Workspace information skeleton */}
        <div className="premium-card p-6 lg:col-span-5">
          <div className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 rounded-lg" />
            <div>
              <div className="skeleton h-4 w-36" />
              <div className="skeleton mt-1.5 h-3 w-44" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="skeleton h-3 w-20" />
                <div className="skeleton mt-2 h-4 w-28" />
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <div className="skeleton h-3 w-28" />
            <div className="mt-3 flex items-center gap-3">
              <div className="skeleton h-9 w-9 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton mt-1.5 h-3 w-36" />
              </div>
              <div className="skeleton h-5 w-14 rounded-full" />
            </div>
          </div>
        </div>

        {/* Team members skeleton */}
        <div className="premium-card p-6 lg:col-span-12">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-lg" />
              <div>
                <div className="skeleton h-4 w-28" />
                <div className="skeleton mt-1.5 h-3 w-56" />
              </div>
            </div>
            <div className="skeleton h-8 w-36 rounded-lg" />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex -space-x-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="skeleton h-9 w-9 rounded-full ring-2 ring-white"
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <div className="skeleton h-6 w-16 rounded-full" />
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
          </div>
          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
              >
                <div className="skeleton h-10 w-10 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="skeleton h-4 w-28" />
                  <div className="skeleton mt-1.5 h-3 w-20" />
                </div>
                <div className="skeleton h-5 w-14 rounded-full" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading organization
      </span>
    </div>
  );
}