"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: string[] | FilterOption[];
  onChange: (value: string) => void;
}

function normalizeOptions(options: string[] | FilterOption[]): FilterOption[] {
  if (options.length === 0) return [];
  if (typeof options[0] === "string") {
    return (options as string[]).map((o) => ({ label: o, value: o }));
  }
  return options as FilterOption[];
}

export function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const normalized = normalizeOptions(options);
  const selectedLabel = normalized.find((o) => o.value === value)?.label;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
          value
            ? "border-blue-200 bg-blue-50/50 text-blue-700 font-medium"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
        )}
        aria-expanded={open}
        aria-label={`Filter by ${label}`}
      >
        <span className="truncate">
          {value ? selectedLabel : `All ${label.toLowerCase()}`}
        </span>
        <svg
          className={cn("w-3.5 h-3.5 shrink-0 ml-2 transition-transform duration-150", open && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
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
            className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 py-1 z-50"
            role="listbox"
          >
            <button
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center px-3 py-2 text-sm transition-colors duration-100",
                !value
                  ? "text-blue-700 bg-blue-50/50 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              )}
              role="option"
              aria-selected={!value}
            >
              All {label.toLowerCase()}
            </button>
            {normalized.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors duration-100",
                  value === option.value
                    ? "text-blue-700 bg-blue-50/50 font-medium"
                    : "text-slate-600 hover:bg-slate-50"
                )}
                role="option"
                aria-selected={value === option.value}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && (
                  <svg className="w-3.5 h-3.5 shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}