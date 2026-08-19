// ============================================================================
// Prosventa AI Search Suggestion
// Stage 3 — Phase 4: AI-Powered Prospect Search
// ============================================================================
// Individual suggestion row shown in the search dropdown.
// ============================================================================

"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { SearchSuggestion as SearchSuggestionType } from "../types";
import {
  BriefcaseIcon,
  BuildingIcon,
  CheckIcon,
  ClockIcon,
  CodeIcon,
  DollarIcon,
  FlameIcon,
  GlobeIcon,
  MapIcon,
  SearchIcon,
  StarIcon,
  TrendingUpIcon,
  UserIcon,
  ZapIcon,
} from "./icons";

interface SearchSuggestionProps {
  suggestion: SearchSuggestionType;
  isActive: boolean;
  onSelect: (suggestion: SearchSuggestionType) => void;
}

function getIcon(icon?: string) {
  switch (icon) {
    case "code": return <CodeIcon className="w-4 h-4" />;
    case "zap": return <ZapIcon className="w-4 h-4" />;
    case "building": return <BuildingIcon className="w-4 h-4" />;
    case "clock": return <ClockIcon className="w-4 h-4" />;
    case "flame": return <FlameIcon className="w-4 h-4" />;
    case "star": return <StarIcon className="w-4 h-4" />;
    case "dollar": return <DollarIcon className="w-4 h-4" />;
    case "globe": return <GlobeIcon className="w-4 h-4" />;
    case "briefcase": return <BriefcaseIcon className="w-4 h-4" />;
    case "trending-up": return <TrendingUpIcon className="w-4 h-4" />;
    case "map": return <MapIcon className="w-4 h-4" />;
    case "user": return <UserIcon className="w-4 h-4" />;
    case "check": return <CheckIcon className="w-4 h-4" />;
    default: return <SearchIcon className="w-4 h-4" />;
  }
}

export const SearchSuggestion = memo(function SearchSuggestion({
  suggestion,
  isActive,
  onSelect,
}: SearchSuggestionProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect(suggestion);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-100",
        isActive ? "bg-blue-50/70" : "hover:bg-slate-50"
      )}
      role="option"
      aria-selected={isActive}
    >
      <span
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors duration-100",
          isActive ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
        )}
      >
        {getIcon(suggestion.icon)}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-slate-800 truncate">
          {suggestion.label}
        </span>
        {suggestion.description && (
          <span className="block text-xs text-slate-400 truncate">
            {suggestion.description}
          </span>
        )}
      </span>
      <span className="text-slate-300 shrink-0">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </span>
    </button>
  );
});