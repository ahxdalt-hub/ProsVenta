"use client";

import { motion } from "framer-motion";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import { fadeDown } from "@/lib/motion";

export type DateRange = "today" | "7d" | "30d" | "90d" | "year" | "all";
export type StatusFilter = "all" | "new" | "contacted" | "qualified" | "proposal_sent" | "negotiation" | "won" | "lost";

export interface AnalyticsFilterState {
  dateRange: DateRange;
  industry: string; // "all" or specific industry
  country: string; // "all" or specific country
  status: StatusFilter;
}

interface AnalyticsFiltersProps {
  filters: AnalyticsFilterState;
  onChange: (filters: AnalyticsFilterState) => void;
  industries: string[];
  countries: string[];
  organizationName?: string | null;
}

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

/**
 * Premium filter bar for the Analytics workspace.
 * Updates analytics instantly via client-side filtering.
 */
export function AnalyticsFilters({
  filters,
  onChange,
  industries,
  countries,
  organizationName,
}: AnalyticsFiltersProps) {
  const hasActiveFilters =
    filters.dateRange !== "all" ||
    filters.industry !== "all" ||
    filters.country !== "all" ||
    filters.status !== "all";

  const update = (patch: Partial<AnalyticsFilterState>) => {
    onChange({ ...filters, ...patch });
  };

  const clear = () => {
    onChange({ dateRange: "all", industry: "all", country: "all", status: "all" });
  };

  return (
    <motion.div
      variants={fadeDown}
      initial="hidden"
      animate="visible"
      className="flex flex-wrap items-center gap-2.5"
    >
      {/* Date Range */}
      <FilterSelect
        icon="analytics"
        value={filters.dateRange}
        onChange={(v) => update({ dateRange: v as DateRange })}
        options={DATE_RANGE_OPTIONS}
      />

      {/* Industry */}
      <FilterSelect
        icon="organization"
        value={filters.industry}
        onChange={(v) => update({ industry: v })}
        options={[
          { value: "all", label: "All industries" },
          ...industries.map((i) => ({ value: i, label: i })),
        ]}
      />

      {/* Country */}
      <FilterSelect
        icon="target"
        value={filters.country}
        onChange={(v) => update({ country: v })}
        options={[
          { value: "all", label: "All countries" },
          ...countries.map((c) => ({ value: c, label: c })),
        ]}
      />

      {/* Status */}
      <FilterSelect
        icon="prospects"
        value={filters.status}
        onChange={(v) => update({ status: v as StatusFilter })}
        options={STATUS_OPTIONS}
      />

      {/* Organization (display only — users typically have one) */}
      {organizationName && (
        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 sm:flex">
          <DashboardIcon name="members" size={14} />
          <span className="max-w-[120px] truncate">{organizationName}</span>
        </div>
      )}

      {/* Clear */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clear}
          className="btn-press inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <DashboardIcon name="x" size={14} />
          Clear
        </button>
      )}
    </motion.div>
  );
}

// ============================================================================
// Filter Select (styled native select)
// ============================================================================

interface FilterSelectProps {
  icon: Parameters<typeof DashboardIcon>[0]["name"];
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function FilterSelect({ icon, value, onChange, options }: FilterSelectProps) {
  return (
    <div className="relative inline-flex items-center">
      <span className="pointer-events-none absolute left-2.5 text-slate-400">
        <DashboardIcon name={icon} size={14} />
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-slate-400">
        <DashboardIcon name="chevron-down" size={14} />
      </span>
    </div>
  );
}