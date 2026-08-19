"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { searchWorkspaceProspects } from "../actions";
import type { ProspectStatus } from "@/types/database";
import { STATUS_LABELS } from "@/features/prospects/components/status-config";

interface ProspectOption {
  id: string;
  name: string;
  company_name: string;
  status: ProspectStatus;
  industry: string | null;
}

export function ProspectSelector({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (prospectId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ProspectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const results = await searchWorkspaceProspects(search);
      setOptions(results);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    load(q);
  };

  const handleSelect = (option: ProspectOption) => {
    setSelectedLabel(option.company_name || option.name);
    setOpen(false);
    setQuery("");
    onSelect(option.id);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn("truncate", !selectedLabel && "text-slate-400")}>
          {selectedLabel ?? "Select a prospect…"}
        </span>
        <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search prospects…"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              aria-label="Search prospects"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {loading && (
              <li className="px-3 py-2 text-xs text-slate-400">Searching…</li>
            )}
            {!loading && options.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-400">No prospects found.</li>
            )}
            {!loading &&
              options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === option.id}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
                      value === option.id && "bg-blue-50/50"
                    )}
                  >
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {option.company_name || option.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {option.name}
                      {option.industry ? ` · ${option.industry}` : ""}
                      {option.status ? ` · ${STATUS_LABELS[option.status]}` : ""}
                    </p>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}