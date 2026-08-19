// ============================================================================
// Prosventa AI Smart Recommendation
// Stage 3 — Phase 4: AI-Powered Prospect Search
// ============================================================================
// Displays curated search patterns users can click to apply instantly.
// ============================================================================

"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { SmartRecommendation as SmartRecommendationType } from "../types";
import {
  BriefcaseIcon,
  BuildingIcon,
  ClockIcon,
  CodeIcon,
  GlobeIcon,
  MapIcon,
  TrendingUpIcon,
  ZapIcon,
} from "./icons";

interface SmartRecommendationProps {
  recommendation: SmartRecommendationType;
  onSelect: (recommendation: SmartRecommendationType) => void;
}

function getIcon(icon: string) {
  switch (icon) {
    case "globe": return <GlobeIcon className="w-5 h-5" />;
    case "zap": return <ZapIcon className="w-5 h-5" />;
    case "trending-up": return <TrendingUpIcon className="w-5 h-5" />;
    case "building": return <BuildingIcon className="w-5 h-5" />;
    case "clock": return <ClockIcon className="w-5 h-5" />;
    case "map": return <MapIcon className="w-5 h-5" />;
    case "code": return <CodeIcon className="w-5 h-5" />;
    case "briefcase": return <BriefcaseIcon className="w-5 h-5" />;
    default: return <GlobeIcon className="w-5 h-5" />;
  }
}

export const SmartRecommendation = memo(function SmartRecommendation({
  recommendation,
  onSelect,
}: SmartRecommendationProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(recommendation)}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all duration-150 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
    >
      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors duration-150">
        {getIcon(recommendation.icon)}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 truncate">
            {recommendation.label}
          </span>
          {recommendation.badge && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
              {recommendation.badge}
            </span>
          )}
        </span>
        <span className="block text-xs text-slate-500 mt-0.5 truncate">
          {recommendation.description}
        </span>
      </span>
      <svg
        className={cn(
          "w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors duration-150 shrink-0"
        )}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
});