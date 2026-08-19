"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface ProspectPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
}

export function ProspectPagination({
  currentPage,
  totalPages,
  total,
}: ProspectPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
        <p className="text-sm text-slate-400">
          {total} {total === 1 ? "result" : "results"}
        </p>
      </div>
    );
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const pageNumbers: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let p = start; p <= end; p++) {
    pageNumbers.push(p);
  }

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
      <p className="text-sm text-slate-400">
        {total} {total === 1 ? "result" : "results"}
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="btn-press inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
          aria-label="Previous page"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Prev
        </button>

        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => goToPage(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={`btn-press inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all duration-150 ${
              page === currentPage
                ? "bg-navy-900 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
          aria-label="Next page"
        >
          Next
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </nav>
    </div>
  );
}