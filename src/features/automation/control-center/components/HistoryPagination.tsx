// ============================================================================
// Prosventa Automation Control Center — History Pagination (server-driven)
// ============================================================================

import Link from "next/link";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  /** Current filter querystring (without "page") so links preserve filters. */
  baseQuery: string;
}

export function HistoryPagination({ page, pageSize, total, baseQuery }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const join = baseQuery.includes("?") ? "&" : "?";
  return (
    <nav aria-label="History pages" className="flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link
          href={`${baseQuery}${join}page=${page - 1}`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 transition hover:border-navy-300 hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
        >
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-xs text-slate-500">
        Page {page} of {totalPages} · {total} execution{total === 1 ? "" : "s"}
      </span>
      {page < totalPages ? (
        <Link
          href={`${baseQuery}${join}page=${page + 1}`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 transition hover:border-navy-300 hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
        >
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
