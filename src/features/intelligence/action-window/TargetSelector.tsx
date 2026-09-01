"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Search, Building2, User, Loader2 } from "lucide-react";
import { searchIntelligenceTargets } from "./actions";
import type { IntelligenceActionKind, IntelligenceTarget } from "./types";

const SEARCH_MIN_LENGTH = 1;
const inputId = "intelligence-action-target";

interface TargetSelectorProps {
  kind: IntelligenceActionKind;
  placeholder: string;
  initialTarget?: IntelligenceTarget | null;
  onSelect: (target: IntelligenceTarget | null) => void;
}

export function TargetSelector({
  kind,
  placeholder,
  onSelect,
  initialTarget = null,
}: TargetSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IntelligenceTarget[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [selected, setSelected] = useState<IntelligenceTarget | null>(
    initialTarget
  );
  const [showList, setShowList] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selected || query.trim().length < SEARCH_MIN_LENGTH) {
      setStatus("idle");
      setResults([]);
      return;
    }
    setStatus("loading");
    const seq = ++seqRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await searchIntelligenceTargets(kind, query);
        if (seqRef.current === seq) {
          setResults(found);
          setStatus("done");
        }
      } catch {
        if (seqRef.current === seq) {
          setResults([]);
          setStatus("error");
        }
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected, kind]);

  function choose(target: IntelligenceTarget) {
    setSelected(target);
    setShowList(false);
    onSelect(target);
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    onSelect(null);
    setShowList(true);
  }

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-xs font-medium text-slate-500"
      >
        Target
      </label>
      {selected ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {selected.name}
              </p>
              {selected.sub && (
                <p className="truncate text-xs text-slate-500">{selected.sub}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-blue-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Clear selected target"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              id={inputId}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowList(true);
              }}
              onFocus={() => setShowList(true)}
              onBlur={() => setTimeout(() => setShowList(false), 120)}
              placeholder={placeholder}
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
            {status === "loading" && (
              <Loader2
                className={`absolute right-3 top-2.5 h-4 w-4 text-blue-500 ${
                  reduce ? "" : "animate-spin"
                }`}
                aria-hidden="true"
              />
            )}
          </div>

          {showList && query.trim().length >= SEARCH_MIN_LENGTH && (
            <ul
              role="listbox"
              aria-label="Search results"
              className="mt-2 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              {status === "loading" && (
                <li className="px-3.5 py-2.5 text-sm text-slate-400">
                  Searching…
                </li>
              )}
              {status === "error" && (
                <li className="px-3.5 py-2.5 text-sm text-slate-500">
                  Search is unavailable right now.
                </li>
              )}
              {status === "done" && results.length === 0 && (
                <li className="px-3.5 py-2.5 text-sm text-slate-400">
                  No matches — try a different name or company.
                </li>
              )}
              {status === "done" &&
                results.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(result)}
                      className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                        <User className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {result.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {result.sub}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}