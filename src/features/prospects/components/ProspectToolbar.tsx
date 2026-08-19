"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ProspectFilters, ProspectSortField, SortOrder } from "@/features/prospects/types/query";
import { FilterPanel } from "./FilterPanel";

interface ProspectToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  isSearching: boolean;
  industries: string[];
  countries: string[];
  tags: string[];
  owners: { id: string; full_name: string | null }[];
  sources: string[];
  currentFilters: ProspectFilters;
  onFilterChange: (changes: Record<string, string | null>) => void;
  onFiltersChange: (filters: ProspectFilters) => void;
  onClearAll: () => void;
  hasFilters: boolean;
  currentSort?: ProspectSortField;
  currentOrder?: SortOrder;
  onSort: (field: ProspectSortField) => void;
  onCreateClick: () => void;
}

const sortOptions: { label: string; value: ProspectSortField }[] = [
  { label: "Company", value: "company_name" },
  { label: "Industry", value: "industry" },
  { label: "Location", value: "location" },
  { label: "Status", value: "status" },
  { label: "Priority", value: "priority" },
  { label: "Lead Score", value: "lead_score" },
  { label: "AI Fit Score", value: "ai_fit_score" },
  { label: "Revenue", value: "revenue" },
  { label: "Employees", value: "employee_count" },
  { label: "Source", value: "source" },
  { label: "Created", value: "created_at" },
  { label: "Updated", value: "updated_at" },
];

export function ProspectToolbar({
  searchTerm,
  onSearchChange,
  onClearSearch,
  isSearching,
  industries,
  countries,
  tags,
  owners,
  sources: _sources,
  currentFilters,
  onFilterChange,
  onFiltersChange,
  onClearAll,
  hasFilters,
  currentSort,
  currentOrder,
  onSort,
  onCreateClick,
}: ProspectToolbarProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close sort menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowSortMenu(false);
        setShowFilters(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleFiltersChange = useCallback(
    (filters: ProspectFilters) => {
      onFiltersChange(filters);
    },
    [onFiltersChange]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentFilters.industry) count++;
    if (currentFilters.country) count++;
    if (currentFilters.status) count++;
    if (currentFilters.source) count++;
    if (currentFilters.priority) count++;
    if (currentFilters.buying_intent) count++;
    if (currentFilters.tags && currentFilters.tags.length > 0) count++;
    if (currentFilters.owner) count++;
    if (currentFilters.lead_score !== undefined) count++;
    if (currentFilters.ai_fit_score !== undefined) count++;
    if (currentFilters.revenue !== undefined) count++;
    if (currentFilters.employee_count !== undefined) count++;
    if (currentFilters.favorites_only) count++;
    if (currentFilters.quick_filter) count++;
    if (currentFilters.conditions && currentFilters.conditions.length > 0) count += currentFilters.conditions.length;
    return count;
  }, [currentFilters]);

  return (
    <div className="premium-card p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <motion.svg
              animate={isSearching ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={{ duration: 0.3, repeat: isSearching ? Infinity : 0 }}
              className={cn("w-4 h-4", isSearching ? "text-blue-500" : "text-slate-400")}
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
            </motion.svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search company, person, email, industry, tags..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-blue-400/40 focus:border-blue-400 hover:border-slate-300"
            aria-label="Search prospects"
          />
          {/* Clear search button */}
          <AnimatePresence>
            {searchTerm && !isSearching && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={onClearSearch}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors duration-150"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
          {/* Searching spinner */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                <svg className="w-4 h-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "btn-press inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
              showFilters || activeFilterCount > 0
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
            aria-expanded={showFilters}
            aria-label="Toggle filters"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort button */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              aria-expanded={showSortMenu}
              aria-label="Sort prospects"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18M6 12h12M10 18h4" />
              </svg>
              <span className="hidden sm:inline">Sort</span>
            </button>

            {/* Sort dropdown */}
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 py-1.5 z-50 max-h-72 overflow-y-auto"
                  role="menu"
                >
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Sort by
                  </div>
                  {sortOptions.map((option) => {
                    const isActive = (currentSort ?? "created_at") === option.value;
                    const isAsc = currentOrder === "asc";
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          onSort(option.value);
                          setShowSortMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors duration-100",
                          isActive
                            ? "text-blue-700 bg-blue-50/50 font-medium"
                            : "text-slate-600 hover:bg-slate-50"
                        )}
                        role="menuitem"
                      >
                        <span>{option.label}</span>
                        {isActive && (
                          <svg
                            className={cn("w-3.5 h-3.5 transition-transform duration-150", !isAsc && "rotate-180")}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="6 9 12 4 18 9" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Clear all button */}
          {hasFilters && (
            <button
              onClick={onClearAll}
              className="btn-press inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors duration-150"
              aria-label="Clear all filters"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-slate-200" />

          {/* Create prospect button */}
          <button
            onClick={onCreateClick}
            className="btn-press inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-800 hover:shadow-md transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden sm:inline">Add Prospect</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Filter panel - animated expand */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-slate-100">
              <FilterPanel
                filters={currentFilters}
                onFiltersChange={handleFiltersChange}
                industries={industries}
                countries={countries}
                tags={tags}
                owners={owners}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}