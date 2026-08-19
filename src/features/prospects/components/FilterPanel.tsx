"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  FilterCondition,
  FilterField,
  FilterOperator,
  ProspectFilters,
  QuickFilterPreset,
} from "@/features/prospects/types/query";
import { STATUS_OPTIONS, STATUS_LABELS, PRIORITY_OPTIONS, PRIORITY_LABELS } from "./status-config";

interface FilterPanelProps {
  filters: ProspectFilters;
  onFiltersChange: (filters: ProspectFilters) => void;
  industries: string[];
  countries: string[];
  tags: string[];
  owners: { id: string; full_name: string | null }[];
}

interface FieldOption {
  value: FilterField;
  label: string;
  type: "text" | "select" | "number" | "date" | "multi";
}

const FIELD_OPTIONS: FieldOption[] = [
  { value: "company_name", label: "Company", type: "text" },
  { value: "industry", label: "Industry", type: "select" },
  { value: "country", label: "Country", type: "select" },
  { value: "status", label: "Status", type: "select" },
  { value: "priority", label: "Priority", type: "select" },
  { value: "tags", label: "Tags", type: "multi" },
  { value: "owner", label: "Owner", type: "select" },
  { value: "created_at", label: "Created Date", type: "date" },
  { value: "updated_at", label: "Updated Date", type: "date" },
  { value: "lead_score", label: "Lead Score", type: "number" },
  { value: "ai_fit_score", label: "AI Fit Score", type: "number" },
  { value: "buying_intent", label: "Buying Intent", type: "select" },
  { value: "revenue", label: "Revenue", type: "number" },
  { value: "employee_count", label: "Employees", type: "number" },
  { value: "source", label: "Source", type: "select" },
];

const QUICK_FILTERS: { value: QuickFilterPreset; label: string; icon: string }[] = [
  { value: "today", label: "Today", icon: "M12 2v4m0 16v-4M2 12h4m16 0h-4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
  { value: "yesterday", label: "Yesterday", icon: "M3 12h4l3-9 4 18 3-9h4" },
  { value: "last_7_days", label: "Last 7 Days", icon: "M3 3v5h5M21 21v-5h-5M3 8a9 9 0 0 1 15.36-5.36M21 16a9 9 0 0 1-15.36 5.36" },
  { value: "last_30_days", label: "Last 30 Days", icon: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2" },
  { value: "recently_updated", label: "Recently Updated", icon: "M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" },
  { value: "high_score", label: "High Score", icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  { value: "recently_contacted", label: "Recently Contacted", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
];

function getOperatorsForField(field: FilterField): FilterOperator[] {
  switch (field) {
    case "company_name":
    case "industry":
    case "country":
      return ["is", "is_not", "contains", "does_not_contain"];
    case "status":
    case "priority":
    case "source":
    case "buying_intent":
      return ["is", "is_not"];
    case "tags":
      return ["has_any_of", "is", "is_not"];
    case "owner":
      return ["is", "is_not"];
    case "created_at":
    case "updated_at":
      return ["before", "after", "is"];
    case "lead_score":
    case "ai_fit_score":
    case "revenue":
    case "employee_count":
      return ["gt", "gte", "lt", "lte", "eq"];
    default:
      return ["is"];
  }
}

function getOperatorLabel(op: FilterOperator): string {
  switch (op) {
    case "is": return "is";
    case "is_not": return "is not";
    case "contains": return "contains";
    case "does_not_contain": return "doesn't contain";
    case "gt": return ">";
    case "gte": return "≥";
    case "lt": return "<";
    case "lte": return "≤";
    case "eq": return "=";
    case "is_one_of": return "is one of";
    case "is_none_of": return "is none of";
    case "has_any_of": return "has any of";
    case "exists": return "exists";
    case "before": return "before";
    case "after": return "after";
    default: return op;
  }
}

function getFieldLabel(field: FilterField): string {
  const opt = FIELD_OPTIONS.find((o) => o.value === field);
  return opt?.label ?? field;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  industries,
  countries,
  tags,
  owners,
}: FilterPanelProps) {
  const [conditions, setConditions] = useState<FilterCondition[]>(filters.conditions ?? []);
  const [draftField, setDraftField] = useState<FilterField>("industry");
  const [draftOperator, setDraftOperator] = useState<FilterOperator>("is");
  const [draftValue, setDraftValue] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterPreset | undefined>(filters.quick_filter);

  const availableFields = useMemo(
    () => FIELD_OPTIONS.filter((f) => !conditions.some((c) => c.field === f.value)),
    [conditions]
  );

  const handleAddCondition = useCallback(() => {
    if (!draftValue) return;
    const newCondition: FilterCondition = {
      id: `${Date.now()}`,
      field: draftField,
      operator: draftOperator,
      value: draftValue,
    };
    const next = [...conditions, newCondition];
    setConditions(next);
    onFiltersChange({ ...filters, conditions: next });
    setDraftValue("");
    setDraftOperator("is");
  }, [conditions, draftField, draftOperator, draftValue, filters, onFiltersChange]);

  const handleRemoveCondition = useCallback(
    (id: string) => {
      const next = conditions.filter((c) => c.id !== id);
      setConditions(next);
      onFiltersChange({ ...filters, conditions: next });
    },
    [conditions, filters, onFiltersChange]
  );

  const handleConditionChange = useCallback(
    (id: string, updates: Partial<FilterCondition>) => {
      const next = conditions.map((c) => (c.id === id ? { ...c, ...updates } : c));
      setConditions(next);
      onFiltersChange({ ...filters, conditions: next });
    },
    [conditions, filters, onFiltersChange]
  );

  const handleQuickFilter = useCallback(
    (preset: QuickFilterPreset) => {
      const next = activeQuickFilter === preset ? undefined : preset;
      setActiveQuickFilter(next);
      onFiltersChange({ ...filters, quick_filter: next });
    },
    [activeQuickFilter, filters, onFiltersChange]
  );

  const handleFavoritesOnly = useCallback(
    (checked: boolean) => {
      onFiltersChange({ ...filters, favorites_only: checked || undefined });
    },
    [filters, onFiltersChange]
  );

  const handleClearAll = useCallback(() => {
    setConditions([]);
    setActiveQuickFilter(undefined);
    onFiltersChange({});
  }, [onFiltersChange]);

  const activeCount =
    conditions.length +
    (activeQuickFilter ? 1 : 0) +
    (filters.favorites_only ? 1 : 0) +
    (filters.industry ? 1 : 0) +
    (filters.country ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.priority ? 1 : 0) +
    (filters.tags && filters.tags.length > 0 ? 1 : 0) +
    (filters.buying_intent ? 1 : 0) +
    (filters.owner ? 1 : 0);

  const currentFieldDef = FIELD_OPTIONS.find((f) => f.value === draftField);
  const fieldOperators = getOperatorsForField(draftField);

  return (
    <div className="space-y-4">
      {/* Quick Filters Row */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Filters</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_FILTERS.map((qf) => (
            <button
              key={qf.value}
              onClick={() => handleQuickFilter(qf.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 btn-press",
                activeQuickFilter === qf.value
                  ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
              aria-pressed={activeQuickFilter === qf.value}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={qf.icon} />
              </svg>
              {qf.label}
            </button>
          ))}

          {/* Favorites toggle */}
          <button
            onClick={() => handleFavoritesOnly(!filters.favorites_only)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 btn-press",
              filters.favorites_only
                ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
            aria-pressed={filters.favorites_only}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill={filters.favorites_only ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Favorites
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Basic Filters Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {/* Industry */}
        <FilterSelect
          label="Industry"
          value={filters.industry ?? ""}
          options={industries}
          onChange={(v) => onFiltersChange({ ...filters, industry: v || undefined })}
        />
        {/* Country */}
        <FilterSelect
          label="Country"
          value={filters.country ?? ""}
          options={countries}
          onChange={(v) => onFiltersChange({ ...filters, country: v || undefined })}
        />
        {/* Status */}
        <FilterSelect
          label="Status"
          value={filters.status ?? ""}
          options={STATUS_OPTIONS.map((s) => ({ label: STATUS_LABELS[s], value: s }))}
          onChange={(v) => onFiltersChange({ ...filters, status: (v as any) || undefined })}
        />
        {/* Priority */}
        <FilterSelect
          label="Priority"
          value={filters.priority ?? ""}
          options={PRIORITY_OPTIONS.map((p) => ({ label: PRIORITY_LABELS[p], value: p }))}
          onChange={(v) => onFiltersChange({ ...filters, priority: (v as any) || undefined })}
        />
        {/* Buying Intent */}
        <FilterSelect
          label="Buying Intent"
          value={filters.buying_intent ?? ""}
          options={[
            { label: "Low", value: "low" },
            { label: "Medium", value: "medium" },
            { label: "High", value: "high" },
          ]}
          onChange={(v) => onFiltersChange({ ...filters, buying_intent: (v as any) || undefined })}
        />
        {/* Source */}
        <FilterSelect
          label="Source"
          value={filters.source ?? ""}
          options={[
            { label: "Manual", value: "manual" },
            { label: "Import", value: "import" },
            { label: "Discovery", value: "discovery" },
            { label: "API", value: "api" },
          ]}
          onChange={(v) => onFiltersChange({ ...filters, source: (v as any) || undefined })}
        />
        {/* Owner */}
        <FilterSelect
          label="Owner"
          value={filters.owner ?? ""}
          options={[
            { label: "Assigned to me", value: "__me__" },
            ...owners.map((o) => ({ label: o.full_name ?? "Unnamed", value: o.id })),
          ]}
          onChange={(v) => onFiltersChange({ ...filters, owner: v || undefined })}
        />
        {/* Tags */}
        {tags.length > 0 && (
          <FilterSelect
            label="Tags"
            value={filters.tags?.[0] ?? ""}
            options={tags}
            onChange={(v) => onFiltersChange({ ...filters, tags: v ? [v] : undefined })}
          />
        )}
      </div>

      {/* Advanced Filter Builder */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Filter Builder
          </span>
          {activeCount > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors duration-150 inline-flex items-center gap-1"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Clear all ({activeCount})
            </button>
          )}
        </div>

        {/* Active conditions */}
        <div className="space-y-1.5">
          <AnimatePresence>
            {conditions.map((condition) => {
              const def = FIELD_OPTIONS.find((f) => f.value === condition.field);
              return (
                <motion.div
                  key={condition.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5"
                >
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                    AND
                  </span>
                  <span className="text-xs font-medium text-slate-700 shrink-0">{getFieldLabel(condition.field)}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{getOperatorLabel(condition.operator)}</span>
                  <span className="text-xs text-blue-600 font-medium truncate flex-1">
                    {String(condition.value)}
                  </span>
                  <button
                    onClick={() => handleRemoveCondition(condition.id)}
                    className="flex items-center justify-center w-5 h-5 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors duration-150 shrink-0"
                    aria-label="Remove condition"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Draft condition builder */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={draftField}
            onChange={(e) => {
              const field = e.target.value as FilterField;
              setDraftField(field);
              setDraftOperator(getOperatorsForField(field)[0]);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            aria-label="Filter field"
          >
            {FIELD_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          <select
            value={draftOperator}
            onChange={(e) => setDraftOperator(e.target.value as FilterOperator)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            aria-label="Filter operator"
          >
            {fieldOperators.map((op) => (
              <option key={op} value={op}>{getOperatorLabel(op)}</option>
            ))}
          </select>

          {currentFieldDef && currentFieldDef.type === "select" && (
            <select
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[120px]"
              aria-label="Filter value"
            >
              <option value="">Select value...</option>
              {draftField === "industry" && industries.map((i) => <option key={i} value={i}>{i}</option>)}
              {draftField === "country" && countries.map((c) => <option key={c} value={c}>{c}</option>)}
              {draftField === "status" && STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              {draftField === "priority" && PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              {draftField === "buying_intent" && ["low", "medium", "high"].map((b) => <option key={b} value={b}>{b}</option>)}
              {draftField === "source" && ["manual", "import", "discovery", "api"].map((s) => <option key={s} value={s}>{s}</option>)}
              {draftField === "owner" && [
                { label: "Assigned to me", value: "__me__" },
                ...owners.map((o) => ({ label: o.full_name ?? "Unnamed", value: o.id })),
              ].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              {draftField === "tags" && tags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {currentFieldDef && currentFieldDef.type === "text" && (
            <input
              type="text"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddCondition(); }}
              placeholder={`Enter ${currentFieldDef.label.toLowerCase()}...`}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[140px]"
              aria-label="Filter value"
            />
          )}

          {currentFieldDef && currentFieldDef.type === "number" && (
            <input
              type="number"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddCondition(); }}
              placeholder="Enter value..."
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm w-28"
              aria-label="Filter value"
            />
          )}

          {currentFieldDef && currentFieldDef.type === "date" && (
            <input
              type="date"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              aria-label="Filter value"
            />
          )}

          {currentFieldDef && currentFieldDef.type === "multi" && (
            <input
              type="text"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddCondition(); }}
              placeholder="Comma-separated tags..."
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[140px]"
              aria-label="Filter value"
            />
          )}

          <button
            onClick={handleAddCondition}
            disabled={!draftValue}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors duration-150 btn-press disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
        </div>

        {conditions.length === 0 && !activeQuickFilter && !filters.favorites_only && activeCount === 0 && (
          <p className="mt-2 text-xs text-slate-400">
            Combine multiple conditions with AND. Example: Industry = Software AND Country = Germany AND Lead Score {'>'} 80.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FilterSelect — reusable filter dropdown
// ============================================================================
interface FilterSelectProps {
  label: string;
  value: string;
  options: string[] | { label: string; value: string }[];
  onChange: (value: string) => void;
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const normalized = useMemo(
    () => (typeof options[0] === "string" ? (options as string[]).map((o) => ({ label: o, value: o })) : options as { label: string; value: string }[]),
    [options]
  );
  const filtered = normalized.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));
  const selected = normalized.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
          value
            ? "border-blue-200 bg-blue-50/50 text-blue-700 font-medium"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
        )}
        aria-expanded={open}
        aria-label={`Filter by ${label}`}
      >
        <span className="truncate">
          {value ? selected?.label ?? value : `All ${label.toLowerCase()}`}
        </span>
        <svg className={cn("w-3 h-3 shrink-0 ml-1.5 transition-transform duration-150", open && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 overflow-hidden"
            role="listbox"
          >
            {normalized.length > 8 && (
              <div className="p-1.5 border-b border-slate-100">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Search ${label}`}
                />
              </div>
            )}
            <div className="max-h-48 overflow-y-auto py-1">
              <button
                onClick={() => { onChange(""); setOpen(false); }}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-xs transition-colors duration-100",
                  !value ? "text-blue-700 bg-blue-50/50 font-medium" : "text-slate-600 hover:bg-slate-50"
                )}
                role="option"
                aria-selected={!value}
              >
                All {label.toLowerCase()}
              </button>
              {filtered.map((option) => (
                <button
                  key={option.value}
                  onClick={() => { onChange(option.value); setOpen(false); setSearch(""); }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs transition-colors duration-100",
                    value === option.value
                      ? "text-blue-700 bg-blue-50/50 font-medium"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                  role="option"
                  aria-selected={value === option.value}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.value && (
                    <svg className="w-3 h-3 shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}