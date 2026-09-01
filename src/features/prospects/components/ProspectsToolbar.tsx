"use client";

// ============================================================================
// ProspectsToolbar — Search / Filter / Sort controls for the Prospects page
// ============================================================================
// Three INDEPENDENT controls:
//   • Search  — debounced free-text query (URL: ?search=)
//   • Filter  — popover with structured filters (URL: ?status=&industry=…)
//   • Sort    — popover with ordering options (URL: ?sort=&order=)
//
// All state lives in the URL search params. Changing any control performs a
// server navigation (router.push), so the data layer (queryProspects) does the
// actual work server-side under RLS. The browser never downloads the whole
// dataset, and one keystroke never fires more than one request (350ms debounce).
// ============================================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ProspectPriority, ProspectSource, ProspectStatus } from "@/types/database";
import {
  STATUS_OPTIONS,
  STATUS_LABELS,
  PRIORITY_OPTIONS,
  PRIORITY_LABELS,
} from "./status-config";
import type { ProspectSortField, SortOrder } from "../types/query";

// ----------------------------------------------------------------------------

/** Active filter values (the subset the toolbar manages). */
export interface ProspectToolbarFilters {
  status?: ProspectStatus;
  priority?: ProspectPriority;
  industry?: string;
  country?: string;
  source?: ProspectSource;
  /** Minimum company size (employee_count >=). */
  minEmployees?: number;
}

const SOURCE_LABELS: Record<ProspectSource, string> = {
  manual: "Manual",
  import: "Import",
  discovery: "Discovery",
  api: "API",
};

const SEARCH_DEBOUNCE_MS = 350;

interface SortOption {
  /** Label shown in the menu. */
  label: string;
  /** URL value for `sort` (empty = default ordering). */
  sort: ProspectSortField | "";
  order: SortOrder;
}

const SORT_OPTIONS: SortOption[] = [
  { label: "Default (newest first)", sort: "", order: "desc" },
  { label: "ICP score — highest first", sort: "icp_score", order: "desc" },
  { label: "ICP score — lowest first", sort: "icp_score", order: "asc" },
  { label: "Recently added — newest first", sort: "created_at", order: "desc" },
  { label: "Recently added — oldest first", sort: "created_at", order: "asc" },
  { label: "Last activity — most recent", sort: "updated_at", order: "desc" },
  { label: "Last activity — least recent", sort: "updated_at", order: "asc" },
  { label: "Name — A to Z", sort: "name", order: "asc" },
  { label: "Name — Z to A", sort: "name", order: "desc" },
  { label: "Company — A to Z", sort: "company_name", order: "asc" },
  { label: "Company — Z to A", sort: "company_name", order: "desc" },
];

interface ProspectsToolbarProps {
  /** Active search term (from URL, owned by the server shell). */
  search: string;
  /** Active filters (from URL, owned by the server shell). */
  filters: ProspectToolbarFilters;
  /** Active sort field ("" = default). */
  sort: ProspectSortField | "";
  /** Active sort direction. */
  order: SortOrder;
  /** Distinct option sets for the filter panel (server-provided). */
  industries: string[];
  countries: string[];
  sources: string[];
}

export function ProspectsToolbar({
  search,
  filters,
  sort,
  order,
  industries,
  countries,
  sources,
}: ProspectsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // ---- URL mutation helper --------------------------------------------------
  // Every control funnels through here. `page` is always reset because any
  // search/filter/sort change invalidates the current page window.
  const applyParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      mutate(params);
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [searchParams, pathname, router]
  );

  // ---- Search (debounced) ----------------------------------------------------
  // Local input state gives instant typing feedback; the URL (and therefore the
  // server query) is only updated after the user pauses typing.
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirstSearchRef = useRef(true);
  useEffect(() => {
    if (skipFirstSearchRef.current) {
      skipFirstSearchRef.current = false;
      return;
    }
    if (searchInput === search) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      applyParams((params) => {
        if (searchInput.trim()) params.set("search", searchInput.trim());
        else params.delete("search");
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchInput, search, applyParams]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    applyParams((params) => params.delete("search"));
  }, [applyParams]);

  // ---- Filters ----------------------------------------------------------------
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [draftFilters, setDraftFilters] = useState<ProspectToolbarFilters>(filters);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  // Click-outside / Escape dismiss for the filter popover.
  useEffect(() => {
    if (!showFilterPanel) return;
    const onDown = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowFilterPanel(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showFilterPanel]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => v !== undefined && v !== null).length,
    [filters]
  );

  const applyFilters = useCallback(() => {
    applyParams((params) => {
      params.delete("status");
      params.delete("priority");
      params.delete("industry");
      params.delete("country");
      params.delete("source");
      params.delete("min_employees");
      if (draftFilters.status) params.set("status", draftFilters.status);
      if (draftFilters.priority) params.set("priority", draftFilters.priority);
      if (draftFilters.industry) params.set("industry", draftFilters.industry);
      if (draftFilters.country) params.set("country", draftFilters.country);
      if (draftFilters.source) params.set("source", draftFilters.source);
      if (draftFilters.minEmployees !== undefined)
        params.set("min_employees", String(draftFilters.minEmployees));
    });
    setShowFilterPanel(false);
  }, [applyParams, draftFilters]);

  const clearAllFilters = useCallback(() => {
    setDraftFilters({});
    applyParams((params) => {
      params.delete("status");
      params.delete("priority");
      params.delete("industry");
      params.delete("country");
      params.delete("source");
      params.delete("min_employees");
    });
  }, [applyParams]);


  // ---- Sort -------------------------------------------------------------------
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSortMenu) return;
    const onDown = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSortMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showSortMenu]);

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.sort === sort && o.order === order)?.label ??
    "Default (newest first)";

  const selectSort = useCallback(
    (option: SortOption) => {
      setShowSortMenu(false);
      applyParams((params) => {
        if (option.sort) {
          params.set("sort", option.sort);
          params.set("order", option.order);
        } else {
          params.delete("sort");
          params.delete("order");
        }
      });
    },
    [applyParams]
  );

  // Shared control styles (match the existing table/pagination visual language).
  const controlBase =
    "btn-press inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";
  const controlIdle =
    "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
  const controlActive =
    "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {/* ---- Search ---- */}
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") clearSearch();
          }}
          placeholder="Search prospects..."
          aria-label="Search prospects"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 placeholder-slate-400 transition-colors duration-150 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        {searchInput && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>


      {/* ---- Filter ---- */}
      <div className="relative" ref={filterRef}>
        <button
          type="button"
          onClick={() => setShowFilterPanel((v) => !v)}
          aria-expanded={showFilterPanel}
          className={`${controlBase} ${activeFilterCount > 0 ? controlActive : controlIdle}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-none text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {showFilterPanel && (
          <div
            className="absolute left-0 top-full z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
            role="dialog"
            aria-label="Filter prospects"
          >
            <p className="mb-3 text-sm font-semibold text-slate-900">Filters</p>

            <div className="space-y-3">
              <FilterSelect
                label="Status"
                value={draftFilters.status ?? ""}
                onChange={(v) => setDraftFilters((d) => ({ ...d, status: (v || undefined) as ProspectStatus | undefined }))}
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
              />
              <FilterSelect
                label="Priority"
                value={draftFilters.priority ?? ""}
                onChange={(v) => setDraftFilters((d) => ({ ...d, priority: (v || undefined) as ProspectPriority | undefined }))}
                options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
              />
              <FilterSelect
                label="Industry"
                value={draftFilters.industry ?? ""}
                onChange={(v) => setDraftFilters((d) => ({ ...d, industry: v || undefined }))}
                options={industries.map((i) => ({ value: i, label: i }))}
              />
              <FilterSelect
                label="Location"
                value={draftFilters.country ?? ""}
                onChange={(v) => setDraftFilters((d) => ({ ...d, country: v || undefined }))}
                options={countries.map((c) => ({ value: c, label: c }))}
              />
              <FilterSelect
                label="Source"
                value={draftFilters.source ?? ""}
                onChange={(v) => setDraftFilters((d) => ({ ...d, source: (v || undefined) as ProspectSource | undefined }))}
                options={sources.map((s) => ({
                  value: s,
                  label: SOURCE_LABELS[s as ProspectSource] ?? s,
                }))}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Company size (min employees)
                </label>
                <input
                  type="number"
                  min={0}
                  value={draftFilters.minEmployees ?? ""}
                  onChange={(e) =>
                    setDraftFilters((d) => ({
                      ...d,
                      minEmployees:
                        e.target.value === "" ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0),
                    }))
                  }
                  placeholder="Any"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
                className="text-xs font-medium text-slate-500 transition hover:text-slate-700 disabled:opacity-40 disabled:hover:text-slate-500"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="btn-press rounded-lg bg-navy-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>


      {/* ---- Sort ---- */}
      <div className="relative" ref={sortRef}>
        <button
          type="button"
          onClick={() => setShowSortMenu((v) => !v)}
          aria-expanded={showSortMenu}
          className={`${controlBase} ${sort ? controlActive : controlIdle}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="8 9 12 5 16 9" />
            <polyline points="16 15 12 19 8 15" />
          </svg>
          Sort
        </button>

        {showSortMenu && (
          <div
            className="absolute left-0 top-full z-30 mt-2 w-64 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
            role="menu"
            aria-label="Sort prospects"
          >
            {SORT_OPTIONS.map((option) => {
              const selected = option.sort === sort && option.order === order;
              return (
                <button
                  key={`${option.sort}-${option.order}`}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => selectSort(option)}
                  className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition-colors duration-150 ${
                    selected
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                  {selected && (
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Active sort summary (subtle desktop hint; hidden below lg). */}
      {sort && !showSortMenu && (
        <span className="hidden text-xs text-slate-400 lg:inline" aria-hidden="true">
          {currentSortLabel}
        </span>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

