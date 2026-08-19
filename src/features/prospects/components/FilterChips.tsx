"use client";

import { motion } from "framer-motion";
import type { ProspectFilters } from "@/features/prospects/types/query";

interface FilterChipsProps {
  filters: ProspectFilters;
  onRemove: (changes: Record<string, string | null>) => void;
  onClearAll: () => void;
}

interface Chip {
  key: string;
  label: string;
  value: string;
}

export function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  const chips: Chip[] = [];

  if (filters.search) {
    chips.push({ key: "search", label: "Search", value: filters.search });
  }
  if (filters.industry) {
    chips.push({ key: "industry", label: "Industry", value: filters.industry });
  }
  if (filters.country) {
    chips.push({ key: "country", label: "Country", value: filters.country });
  }
  if (filters.status) {
    chips.push({ key: "status", label: "Status", value: filters.status });
  }
  if (filters.source) {
    chips.push({ key: "source", label: "Source", value: filters.source });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <motion.span
          key={chip.key}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
        >
          <span className="text-blue-400">{chip.label}:</span>
          <span className="max-w-[120px] truncate">{chip.value}</span>
          <button
            onClick={() => onRemove({ [chip.key]: null })}
            className="flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:text-blue-700 hover:bg-blue-100 transition-colors duration-150"
            aria-label={`Remove ${chip.label} filter`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </motion.span>
      ))}
      <button
        onClick={onClearAll}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
      >
        Clear all
      </button>
    </div>
  );
}