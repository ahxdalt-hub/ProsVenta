// ============================================================================
// Prosventa AI Search Bar
// Stage 3 — Phase 4: AI-Powered Prospect Search
// ============================================================================
// Premium AI search interface for the Prospect Workspace.
// Supports natural language parsing, suggestions, history, and recommendations.
// ============================================================================

"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ProspectFilters } from "@/features/prospects/types/query";
import type {
  SearchContext,
  SearchSuggestion as SearchSuggestionType,
  SmartRecommendation as SmartRecommendationType,
} from "../types";
import { parseNaturalLanguage, generateSuggestions, getSmartRecommendations } from "../parser";
import { useSearchHistory } from "../history";
import { SearchSuggestion } from "./SearchSuggestion";
import { SearchHistory } from "./SearchHistory";
import { SmartRecommendation } from "./SmartRecommendation";
import { FilterChip } from "./FilterChip";
import {
  SparkleIcon,
  XIcon,
} from "./icons";

export interface AIFilterChip {
  key: string;
  label: string;
  value: string;
}

export interface AISearchBarProps {
  /** Current search term */
  value: string;
  /** Search context with available options */
  context: SearchContext;
  /** Parsed AI query state */
  parsedQuery?: { summary: string; confidence: number; filters: ProspectFilters } | null;
  /** Active filter chips to display */
  activeChips?: AIFilterChip[];
  /** Whether a search is currently running */
  isSearching?: boolean;
  /** Callback when search value changes */
  onSearchChange: (value: string) => void;
  /** Callback when AI search is submitted */
  onSubmit: (query: string, filters: ProspectFilters) => void;
  /** Callback when a suggestion is selected */
  onSuggestionSelect?: (suggestion: SearchSuggestionType) => void;
  /** Callback when a history entry is selected */
  onHistorySelect?: (query: string, filters: ProspectFilters) => void;
  /** Callback when recommendation selected */
  onRecommendationSelect?: (filters: ProspectFilters) => void;
  /** Callback to clear a filter chip */
  onRemoveChip?: (key: string) => void;
  /** Callback to clear all active filters */
  onClearFilters?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disable the search input */
  disabled?: boolean;
}

export const AISearchBar = memo(function AISearchBar({
  value,
  context,
  parsedQuery,
  activeChips = [],
  isSearching = false,
  onSearchChange,
  onSubmit,
  onSuggestionSelect,
  onHistorySelect,
  onRecommendationSelect,
  onRemoveChip,
  onClearFilters,
  placeholder = 'Search prospects naturally — try "find software companies in Germany"',
  disabled = false,
}: AISearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { entries: historyEntries, addSearch, removeSearch, togglePin, clearHistory } = useSearchHistory();

  // Generate suggestions based on current input
  const suggestions = useMemo(
    () => generateSuggestions(value, context),
    [value, context]
  );

  const recommendations = useMemo(() => getSmartRecommendations(), []);

  const showDropdownContent =
    isFocused && showDropdown && !disabled && (suggestions.length > 0 || historyEntries.length > 0);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsFocused(false);
        setShowDropdown(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
      setShowDropdown(true);
      setActiveIndex(-1);
    },
    [onSearchChange]
  );

  const handleSubmit = useCallback(() => {
    const parsed = parseNaturalLanguage(value, context);
    const filters = parsed?.filters ?? {};
    onSubmit(value, filters);
    addSearch(value, filters);
    setShowDropdown(false);
    setIsFocused(false);
  }, [value, context, onSubmit, addSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          const suggestion = suggestions[activeIndex];
          onSuggestionSelect?.(suggestion);
          addSearch(suggestion.label, suggestion.filters);
          setShowDropdown(false);
          setIsFocused(false);
        } else {
          handleSubmit();
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
      }
    },
    [activeIndex, suggestions, onSuggestionSelect, addSearch, handleSubmit]
  );

  const handleSuggestionSelect = useCallback(
    (suggestion: SearchSuggestionType) => {
      onSuggestionSelect?.(suggestion);
      addSearch(suggestion.label, suggestion.filters);
      setShowDropdown(false);
      setIsFocused(false);
    },
    [onSuggestionSelect, addSearch]
  );

  const handleHistorySelect = useCallback(
    (query: string, filters: ProspectFilters) => {
      onHistorySelect?.(query, filters);
      setShowDropdown(false);
      setIsFocused(false);
    },
    [onHistorySelect]
  );

  const handleRecommendationSelect = useCallback(
    (rec: SmartRecommendationType) => {
      onRecommendationSelect?.(rec.filters as ProspectFilters);
      setShowDropdown(false);
      setIsFocused(false);
    },
    [onRecommendationSelect]
  );

  const handleClear = useCallback(() => {
    onSearchChange("");
    inputRef.current?.focus();
  }, [onSearchChange]);

  return (
    <div ref={containerRef} className="relative">
      {/* Premium AI Search Input */}
      <div
        className={cn(
          "relative flex items-center gap-3 rounded-2xl border bg-white shadow-sm transition-all duration-200",
          isFocused
            ? "border-blue-400 ring-4 ring-blue-500/10 shadow-md"
            : "border-slate-200 hover:border-slate-300",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        {/* Sparkle / AI icon */}
        <motion.div
          animate={isSearching ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={{ duration: 0.4, repeat: isSearching ? Infinity : 0 }}
          className={cn(
            "flex items-center justify-center ml-3 w-8 h-8 rounded-lg shrink-0",
            isFocused ? "text-blue-500" : "text-slate-400"
          )}
        >
          {isSearching ? (
            <svg className="w-4 h-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <SparkleIcon className="w-5 h-5" />
          )}
        </motion.div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none min-w-0"
          aria-label="AI Search prospects"
          role="combobox"
          aria-expanded={showDropdownContent}
          aria-controls="ai-search-dropdown"
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Parsed query indicator */}
        <AnimatePresence>
          {parsedQuery && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="hidden sm:flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 mr-1 shrink-0"
              title={`AI interpreted: ${parsedQuery.summary}`}
            >
              <span className="text-[11px] font-medium text-blue-600 max-w-[180px] truncate">
                {parsedQuery.summary}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clear button */}
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={handleClear}
              className="flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150 mr-1 shrink-0"
              aria-label="Clear search"
            >
              <XIcon className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Active AI filter chips */}
      <AnimatePresence>
        {activeChips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center gap-1.5 mt-2.5"
          >
            {activeChips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                value={chip.value}
                onRemove={() => onRemoveChip?.(chip.key)}
              />
            ))}
            {onClearFilters && activeChips.length > 0 && (
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
              >
                Clear all
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestions / History Dropdown */}
      <AnimatePresence>
        {showDropdownContent && (
          <motion.div
            id="ai-search-dropdown"
            initial={{ opacity: 0, y: 4, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40 z-50 overflow-hidden"
            role="listbox"
          >
            <div className="max-h-[360px] overflow-y-auto">
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="py-1">
                  {suggestions.map((suggestion, index) => (
                    <SearchSuggestion
                      key={suggestion.id}
                      suggestion={suggestion}
                      isActive={index === activeIndex}
                      onSelect={handleSuggestionSelect}
                    />
                  ))}
                </div>
              )}

              {/* Search History */}
              {value.length === 0 && (
                <SearchHistory
                  entries={historyEntries}
                  onSelect={(entry) => handleHistorySelect(entry.query, entry.filters)}
                  onRemove={removeSearch}
                  onTogglePin={togglePin}
                  onClear={clearHistory}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recommendations shown when idle */}
      <AnimatePresence>
        {!showDropdownContent && value.length === 0 && recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Smart Recommendations
              </span>
              <span className="h-px flex-1 bg-slate-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {recommendations.map((rec) => (
                <SmartRecommendation
                  key={rec.id}
                  recommendation={rec}
                  onSelect={handleRecommendationSelect}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});