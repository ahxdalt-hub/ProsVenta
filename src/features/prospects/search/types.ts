// ============================================================================
// Prosventa AI Search Types
// Stage 3 — Phase 4: AI-Powered Prospect Search
// ============================================================================
// Types for natural language search, suggestions, history, and recommendations.
// Provider-agnostic: parser can be swapped for an LLM-backed engine later.
// ============================================================================

import type { ProspectFilters, FilterCondition } from "@/features/prospects/types/query";
import type { ProspectStatus, ProspectPriority, BuyingIntent, ProspectSource } from "@/types/database";

/**
 * A parsed search intent derived from natural language input.
 * This is the output of the query parser and can be fed into
 * the existing ProspectFilters URL contract.
 */
export interface ParsedSearchQuery {
  /** Original user query */
  query: string;
  /** Extracted filters */
  filters: ProspectFilters;
  /** Any advanced filter conditions */
  conditions?: FilterCondition[];
  /** Sort preference if inferred from language */
  sort?: { field: string; order: "asc" | "desc" };
  /** Confidence of the parsed interpretation (0–100) */
  confidence: number;
  /** Human-readable summary of what was interpreted */
  summary: string;
}

/**
 * Kind of suggestion shown while typing.
 */
export type SuggestionKind =
  | "query"
  | "industry"
  | "country"
  | "status"
  | "priority"
  | "intent"
  | "revenue"
  | "employees"
  | "quick-filter"
  | "favorites"
  | "owner";

/**
 * A smart suggestion shown while typing.
 */
export interface SearchSuggestion {
  id: string;
  kind: SuggestionKind;
  /** Main display text */
  label: string;
  /** Short contextual description */
  description?: string;
  /** Icon identifier */
  icon?: string;
  /** Pre-built filters this suggestion would apply */
  filters: Partial<ProspectFilters>;
  /** Natural language query this suggestion maps to */
  query?: string;
}

/**
 * A saved search history entry.
 */
export interface SearchHistoryEntry {
  id: string;
  query: string;
  filters: ProspectFilters;
  timestamp: number;
  /** Whether this search has been pinned/favorited */
  pinned: boolean;
  /** Number of results found */
  resultCount?: number;
}

/**
 * A smart recommendation shown on idle/empty state.
 * Represents common patterns users search for.
 */
export interface SmartRecommendation {
  id: string;
  label: string;
  description: string;
  icon: string;
  filters: Partial<ProspectFilters>;
  /** Example query shown in the search bar */
  exampleQuery: string;
  /** Optional badge */
  badge?: string;
}

/**
 * Context passed to the search engine for enrichment.
 * Includes available options so suggestions can match real data.
 */
export interface SearchContext {
  industries: string[];
  countries: string[];
  tags: string[];
  owners: { id: string; full_name: string | null }[];
  sources: string[];
}

/**
 * Result of running natural language through the query parser.
 */
export interface NaturalLanguageResult {
  parsed: ParsedSearchQuery | null;
  error?: string;
}

/**
 * Search state persisted to localStorage.
 */
export interface SearchHistoryState {
  entries: SearchHistoryEntry[];
}

// ============================================================================
// Domain Value Helpers
// ============================================================================

/**
 * Normalized label maps for filter values.
 */
export const STATUS_LABELS: Record<ProspectStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const PRIORITY_LABELS: Record<ProspectPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const INTENT_LABELS: Record<BuyingIntent, string> = {
  low: "Low Intent",
  medium: "Medium Intent",
  high: "High Intent",
};

export const SOURCE_LABELS: Record<ProspectSource, string> = {
  manual: "Manual",
  import: "Import",
  discovery: "Discovery",
  api: "API",
};

/**
 * Common aliases for values mentioned in natural language.
 */
export const COMMON_ALIASES: Record<string, string> = {
  saas: "Software",
  software: "Software",
  tech: "Technology",
  technology: "Technology",
  "software company": "Software",
  "software companies": "Software",
  startup: "Software",
  it: "Information Technology",
  "information technology": "Information Technology",
  manufacturing: "Manufacturing",
  healthcare: "Healthcare",
  health: "Healthcare",
  finance: "Financial Services",
  "financial services": "Financial Services",
  fintech: "Financial Technology",
  hr: "Human Resources",
  "human resources": "Human Resources",
  marketing: "Marketing",
  ecommerce: "E-Commerce",
  "e-commerce": "E-Commerce",
  retail: "Retail",
  logistics: "Logistics",
  education: "Education",
  energy: "Energy",
  germany: "Germany",
  usa: "United States",
  "united states": "United States",
  america: "United States",
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  india: "India",
  canada: "Canada",
  france: "France",
  australia: "Australia",
  brazil: "Brazil",
  china: "China",
  japan: "Japan",
  singapore: "Singapore",
};