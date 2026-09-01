"use client";

// ============================================================================
// Prosventa — Shared Search Field (Phase 4)
// ============================================================================
// Consistent search across all prospecting surfaces: same visuals, debounce,
// clear button, loading indicator, and accessible label. Callers receive a
// single `value` (debounced when debounceMs is set) plus a `loading` flag so
// every screen shows the same search behavior.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Debounce delay for the emitted onChange (ms). 0 = emit immediately. */
  debounceMs?: number;
  /** Caller-provided loading state (shown as a spinner in the field). */
  loading?: boolean;
  placeholder?: string;
  /** Accessible name for screen readers. */
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchField({
  value,
  onChange,
  debounceMs = 0,
  loading = false,
  placeholder = "Search…",
  label = "Search",
  disabled = false,
  className,
}: SearchFieldProps) {
  const [inputValue, setInputValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the immediate input in sync when the caller resets it.
  useEffect(() => setInputValue(value), [value]);

  const handleChange = (raw: string) => {
    setInputValue(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (debounceMs <= 0) {
      onChange(raw);
      return;
    }
    debounceRef.current = setTimeout(() => onChange(raw), debounceMs);
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const showClear = inputValue.length > 0 && !loading;

  return (
    <div className={cn("relative", className)}>
      {/* Leading search icon */}
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
        role="searchbox"
        aria-label={label}
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-colors duration-150 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/40 hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-500"
      />

      <AnimatePresence>
        {showClear && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            type="button"
            aria-label="Clear search"
            disabled={disabled}
            onClick={() => {
              setInputValue("");
              if (debounceRef.current) clearTimeout(debounceRef.current);
              onChange("");
            }}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors duration-150 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            <svg className="h-4 w-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}