"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

interface ProspectSearchControlsProps {
  industries: string[];
  countries: string[];
  defaultSearch?: string;
}

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all duration-150";

const selectClasses = `${inputClasses} cursor-pointer`;

export function ProspectSearchControls({
  industries,
  countries,
  defaultSearch = "",
}: ProspectSearchControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(defaultSearch);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local search state in sync when URL changes (e.g. clear filters)
  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (current !== searchTerm) {
      setSearchTerm(current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const updateParams = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Reset to page 1 on any filter/search change
    params.delete("page");

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateParams({ search: value });
    }, 300);
  };

  const clearAll = () => {
    setSearchTerm("");
    if (timerRef.current) clearTimeout(timerRef.current);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("industry");
    params.delete("country");
    params.delete("status");
    params.delete("source");
    params.delete("page");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasFilters = [
    searchParams.get("search"),
    searchParams.get("industry"),
    searchParams.get("country"),
    searchParams.get("status"),
    searchParams.get("source"),
  ].some(Boolean);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search companies, industries, locations..."
            className={`${inputClasses} pl-10 w-full sm:w-72`}
            aria-label="Search prospects"
          />
        </div>

        {/* Industry filter */}
        <select
          value={searchParams.get("industry") ?? ""}
          onChange={(e) => updateParams({ industry: e.target.value })}
          className={selectClasses}
          aria-label="Filter by industry"
        >
          <option value="">All industries</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>

        {/* Country filter */}
        <select
          value={searchParams.get("country") ?? ""}
          onChange={(e) => updateParams({ country: e.target.value })}
          className={selectClasses}
          aria-label="Filter by country"
        >
          <option value="">All countries</option>
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={searchParams.get("status") ?? ""}
          onChange={(e) => updateParams({ status: e.target.value })}
          className={selectClasses}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="proposal_sent">Proposal Sent</option>
          <option value="negotiation">Negotiation</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>

        {/* Source filter */}
        <select
          value={searchParams.get("source") ?? ""}
          onChange={(e) => updateParams({ source: e.target.value })}
          className={selectClasses}
          aria-label="Filter by source"
        >
          <option value="">All sources</option>
          <option value="manual">Manual</option>
          <option value="import">Import</option>
          <option value="discovery">Discovery</option>
          <option value="api">API</option>
        </select>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className={`btn-press inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-150 ${isPending ? "opacity-50" : ""}`}
            disabled={isPending}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}