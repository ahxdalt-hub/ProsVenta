// ============================================================================
// Prosventa AI Search Parser
// Stage 3 — Phase 4: AI-Powered Prospect Search
// ============================================================================
// Natural language query parser that converts user input into application
// filters. Uses heuristic pattern matching for instant, offline results.
// Provider-agnostic: can be replaced with LLM-backed parsing later.
// ============================================================================

import type {
  ParsedSearchQuery,
  SearchContext,
  SearchSuggestion,
  SmartRecommendation,
} from "./types";
import type { ProspectFilters, QuickFilterPreset } from "@/features/prospects/types/query";
import { COMMON_ALIASES, STATUS_LABELS } from "./types";

// ============================================================================
// Pattern Definitions
// ============================================================================

interface Pattern {
  regex: RegExp;
  apply: (match: RegExpMatchArray, filters: ProspectFilters) => void;
  label: string;
}

const PATTERNS: Pattern[] = [
  // ==========================================================================
  // Employee Count
  // ==========================================================================
  {
    regex: /(?:more than|over|above|at least|greater than|>=\s*|>)\s*(\d+)\s*(?:employees?|people|staff|heads?)/i,
    apply: (match, filters) => {
      const value = parseInt(match[1], 10);
      filters.employee_count = value;
    },
    label: "employee count greater than",
  },
  {
    regex: /(?:less than|under|below|fewer than|<\s*|<=)\s*(\d+)\s*(?:employees?|people|staff|heads?)/i,
    apply: (match, filters) => {
      const value = parseInt(match[1], 10);
      filters.employee_count = value;
    },
    label: "employee count less than",
  },
  {
    regex: /(\d+)\s*[-–]\s*(\d+)\s*(?:employees?|people|staff)/i,
    apply: (match, filters) => {
      const min = parseInt(match[1], 10);
      const max = parseInt(match[2], 10);
      filters.conditions = [
        ...(filters.conditions ?? []),
        { id: `emp-min-${Date.now()}`, field: "employee_count", operator: "gte", value: min },
        { id: `emp-max-${Date.now()}-1`, field: "employee_count", operator: "lte", value: max },
      ];
    },
    label: "employee count range",
  },

  // ==========================================================================
  // Revenue
  // ==========================================================================
  {
    regex: /(?:revenue|annual revenue|sales|income|turnover)\s*(?:above|more than|over|greater than|at least|>)\s*\$?\s*(\d+(?:\.\d+)?)\s*(million|m|billion|b|k)?/i,
    apply: (match, filters) => {
      const num = parseFloat(match[1]);
      const unit = (match[2] ?? "").toLowerCase();
      const multiplier = unit.includes("b") ? 1_000_000_000 : unit.includes("m") ? 1_000_000 : unit.includes("k") ? 1_000 : 1_000_000;
      filters.revenue = num * multiplier;
    },
    label: "revenue above",
  },
  {
    regex: /(?:revenue|annual revenue|sales|income|turnover)\s*(?:below|less than|under|<\s*)\s*\$?\s*(\d+(?:\.\d+)?)\s*(million|m|billion|b|k)?/i,
    apply: (match, filters) => {
      const num = parseFloat(match[1]);
      const unit = (match[2] ?? "").toLowerCase();
      const multiplier = unit.includes("b") ? 1_000_000_000 : unit.includes("m") ? 1_000_000 : unit.includes("k") ? 1_000 : 1_000_000;
      filters.revenue = num * multiplier;
    },
    label: "revenue below",
  },

  // ==========================================================================
  // Lead Score
  // ==========================================================================
  {
    regex: /(?:lead score|score)\s*(?:above|more than|over|at least|>)\s*(\d+)/i,
    apply: (match, filters) => {
      filters.lead_score = parseInt(match[1], 10);
    },
    label: "lead score above",
  },

  // ==========================================================================
  // Status Patterns
  // ==========================================================================
  {
    regex: /(?:warm|high intent|hot|ready to buy|qualified leads?|qualified)/i,
    apply: (_match, filters) => {
      filters.buying_intent = "high";
    },
    label: "high intent",
  },
  {
    regex: /(?:won|closed won|closed-?won)/i,
    apply: (_match, filters) => {
      filters.status = "won";
    },
    label: "won",
  },
  {
    regex: /(?:negotiation|in negotiation|closing)/i,
    apply: (_match, filters) => {
      filters.status = "negotiation";
    },
    label: "negotiation",
  },
  {
    regex: /(?:proposal|proposal sent|sent proposal|pending proposal)/i,
    apply: (_match, filters) => {
      filters.status = "proposal_sent";
    },
    label: "proposal sent",
  },
  {
    regex: /(?:contacted|recently contacted|in touch)/i,
    apply: (_match, filters) => {
      filters.status = "contacted";
    },
    label: "contacted",
  },
  {
    regex: /(?:new prospects|just added|new leads?|brand new)/i,
    apply: (_match, filters) => {
      filters.status = "new";
    },
    label: "new prospects",
  },

  // ==========================================================================
  // Priority Patterns
  // ==========================================================================
  {
    regex: /(?:urgent|critical|asap)/i,
    apply: (_match, filters) => {
      filters.priority = "urgent";
    },
    label: "urgent priority",
  },
  {
    regex: /(?:high priority|important accounts?|key accounts?)/i,
    apply: (_match, filters) => {
      filters.priority = "high";
    },
    label: "high priority",
  },

  // ==========================================================================
  // Buying Intent
  // ==========================================================================
  {
    regex: /(?:buying intent|intent)\s*(?:is|:)?\s*(high|medium|low)/i,
    apply: (match, filters) => {
      filters.buying_intent = match[1].toLowerCase() as ProspectFilters["buying_intent"];
    },
    label: "buying intent",
  },

  // ==========================================================================
  // Favorites / Owned
  // ==========================================================================
  {
    regex: /(?:favorites|favorite|starred|saved as favorite)/i,
    apply: (_match, filters) => {
      filters.favorites_only = true;
    },
    label: "favorites",
  },
  {
    regex: /(?:my prospects|assigned to me|my leads?|owned by me)/i,
    apply: (_match, filters) => {
      filters.owner = "__me__";
    },
    label: "my prospects",
  },

  // ==========================================================================
  // Quick Filter / Recency
  // ==========================================================================
  {
    regex: /(?:today|added today)/i,
    apply: (_match, filters) => {
      filters.quick_filter = "today";
    },
    label: "added today",
  },
  {
    regex: /(?:yesterday|added yesterday)/i,
    apply: (_match, filters) => {
      filters.quick_filter = "yesterday";
    },
    label: "added yesterday",
  },
  {
    regex: /(?:last\s*7\s*days|last\s*week|past\s*week|recently added|recent)/i,
    apply: (_match, filters) => {
      filters.quick_filter = "last_7_days";
    },
    label: "recently added",
  },
  {
    regex: /(?:last\s*30\s*days|last\s*month|past\s*month)/i,
    apply: (_match, filters) => {
      filters.quick_filter = "last_30_days";
    },
    label: "added in last 30 days",
  },
  {
    regex: /(?:recently updated|just updated|updated recently)/i,
    apply: (_match, filters) => {
      filters.quick_filter = "recently_updated";
    },
    label: "recently updated",
  },

  // ==========================================================================
  // Industry
  // ==========================================================================
  {
    regex: /(?:in the|in|within)\s+([a-zA-Z\s&+-]+?)\s*(?:industry|sector|space|market|vertical|segment|business)?\b(?:\s*(?:companies|firms|businesses|organizations|startups))?/i,
    apply: (match, filters) => {
      const raw = match[1].trim().toLowerCase();
      const alias = COMMON_ALIASES[raw] ?? COMMON_ALIASES[raw.replace(/\s+/g, " ")];
      if (alias) filters.industry = alias;
    },
    label: "industry",
  },

  // ==========================================================================
  // Country / Location
  // ==========================================================================
  {
    regex: /(?:in|from|based in|located in|operating in)\s+([a-zA-Z\s&.-]+?)(?:\s*(?:companies|firms|businesses|organizations|startups))?(?:\s*$|\s+(?:with|and|showing|that|which|who|show|find|all))/i,
    apply: (match, filters) => {
      const raw = match[1].trim().toLowerCase();
      const alias = COMMON_ALIASES[raw];
      if (alias) {
        filters.country = alias;
      } else if (raw.length > 2 && raw.length < 40) {
        // Also check if it's a known country by exact match check below
        const country = RAW_COUNTRIES.find((c) => c.toLowerCase() === raw);
        if (country) filters.country = country;
      }
    },
    label: "country",
  },

  // ==========================================================================
  // Tags
  // ==========================================================================
  {
    regex: /(?:tagged|tags?|labeled|marked)\s+(?:with|as|:)?\s+([a-zA-Z0-9_\-\s]+)/i,
    apply: (match, filters) => {
      const tags = match[1].split(",").map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        filters.tags = [...(filters.tags ?? []), ...tags];
      }
    },
    label: "tagged",
  },
];

// Known countries for country detection (commonly used values)
const RAW_COUNTRIES = [
  "United States", "Germany", "United Kingdom", "India", "Canada", "France",
  "Australia", "Brazil", "China", "Japan", "Singapore", "Netherlands", "Sweden",
  "Norway", "Denmark", "Finland", "Switzerland", "Austria", "Belgium", "Ireland",
  "Italy", "Spain", "Portugal", "Mexico", "South Korea", "Switzerland", "Dubai", "UAE",
];

// ============================================================================
// Query Parsing
// ============================================================================

/**
 * Normalize industry/country phrases to known values.
 */
function normalizePhrase(phrase: string): string | null {
  const lower = phrase.trim().toLowerCase();
  if (COMMON_ALIASES[lower]) return COMMON_ALIASES[lower];

  const country = RAW_COUNTRIES.find(
    (c) => c.toLowerCase() === lower || lower.includes(c.toLowerCase())
  );
  if (country) return country;

  // Capitalize first letter for display purposes
  if (lower.length > 2) {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return null;
}

/**
 * Parse a natural language query into structured filters.
 * Uses deterministic pattern matching, provider-agnostic.
 */
export function parseNaturalLanguage(
  query: string,
  context?: SearchContext
): ParsedSearchQuery | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const filters: ProspectFilters = {};
  const applied: string[] = [];

  // Detect industry
  const industryRegex = /(?:software|saas|technology|tech|manufacturing|healthcare|finance|fintech|hr|marketing|ecommerce|retail|logistics|education|energy|it)\s*(?:companies?|firms?|businesses?|organizations?|startups?)?/i;
  const industryMatch = trimmed.match(industryRegex);
  if (industryMatch) {
    const alias = COMMON_ALIASES[industryMatch[1].toLowerCase()] ?? COMMON_ALIASES[industryMatch[0].toLowerCase()];
    if (alias) {
      filters.industry = alias;
      applied.push(`industry: ${alias}`);
    }
  }

  // Detect country
  for (const country of RAW_COUNTRIES) {
    if (trimmed.toLowerCase().includes(country.toLowerCase())) {
      filters.country = country;
      applied.push(`country: ${country}`);
      break;
    }
  }

  // Apply patterns
  let remaining = trimmed;
  for (const pattern of PATTERNS) {
    const match = remaining.match(pattern.regex);
    if (match) {
      pattern.apply(match, filters);
      applied.push(pattern.label);
      // Remove matched segment to avoid re-matching
      remaining = remaining.replace(pattern.regex, " ").replace(/\s+/g, " ").trim();
    }
  }

  // If nothing was interpreted, fall back to text search
  let confidence = 0;
  if (applied.length > 0) {
    confidence = Math.min(98, 55 + applied.length * 15);
  } else {
    filters.search = trimmed;
    applied.push(`search: "${trimmed}"`);
    confidence = 45;
  }

  // Build a human-readable summary
  const summary = applied
    .map((a) => a)
    .join(" + ");

  // Infer sort from certain phrases
  if (/(most|top|highest|best)\s+(scored|fit|relevant)/i.test(trimmed)) {
    return {
      query: trimmed,
      filters,
      sort: { field: "lead_score", order: "desc" },
      confidence,
      summary,
    };
  }

  return {
    query: trimmed,
    filters,
    confidence,
    summary,
  };
}

// ============================================================================
// Suggestions Engine
// ============================================================================

/**
 * Generate smart suggestions based on the current query prefix.
 * Matches against available industries, countries, and common search intents.
 */
export function generateSuggestions(
  input: string,
  context: SearchContext
): SearchSuggestion[] {
  const query = input.trim().toLowerCase();
  const suggestions: SearchSuggestion[] = [];
  const seen = new Set<string>();

  if (!query) {
    // Show popular suggestions on empty input
    return getPopularSuggestions(context).slice(0, 5);
  }

  // ==========================================================================
  // Common search intents
  // ==========================================================================
  const INTENT_SUGGESTIONS: SearchSuggestion[] = [
    {
      id: "intent-software",
      kind: "industry",
      label: "Software companies",
      description: "Filter by industry: Software",
      icon: "code",
      filters: { industry: "Software" },
      query: "software companies",
    },
    {
      id: "intent-high-intent",
      kind: "intent",
      label: "High intent prospects",
      description: "Prospects with strong buying signals",
      icon: "zap",
      filters: { buying_intent: "high" },
      query: "high intent",
    },
    {
      id: "intent-enterprise",
      kind: "employees",
      label: "Enterprise companies",
      description: "Companies with 100+ employees",
      icon: "building",
      filters: { employee_count: 100 },
      query: "enterprise",
    },
    {
      id: "intent-recently-added",
      kind: "quick-filter",
      label: "Recently added prospects",
      description: "Added in the last 7 days",
      icon: "clock",
      filters: { quick_filter: "last_7_days" as QuickFilterPreset },
      query: "recently added",
    },
    {
      id: "intent-warm-leads",
      kind: "intent",
      label: "Warm leads",
      description: "High buying intent prospects",
      icon: "flame",
      filters: { buying_intent: "high" },
      query: "warm leads",
    },
    {
      id: "intent-my-prospects",
      kind: "owner",
      label: "My prospects",
      description: "Prospects assigned to you",
      icon: "user",
      filters: { owner: "__me__" },
      query: "my prospects",
    },
    {
      id: "intent-favorites",
      kind: "favorites",
      label: "Favorites",
      description: "Your starred prospects",
      icon: "star",
      filters: { favorites_only: true },
      query: "favorites",
    },
    {
      id: "intent-high-revenue",
      kind: "revenue",
      label: "High revenue companies",
      description: "Revenue above $10M",
      icon: "dollar",
      filters: { revenue: 10_000_000 },
      query: "revenue above 10 million",
    },
  ];

  for (const s of INTENT_SUGGESTIONS) {
    if (s.label.toLowerCase().includes(query) || s.query?.toLowerCase().includes(query)) {
      if (!seen.has(s.id)) {
        suggestions.push(s);
        seen.add(s.id);
      }
    }
  }

  // ==========================================================================
  // Industry suggestions from context
  // ==========================================================================
  for (const industry of context.industries) {
    if (industry.toLowerCase().includes(query) || query.includes("industry") || query.includes("companies")) {
      const id = `industry-${industry.toLowerCase()}`;
      if (!seen.has(id)) {
        suggestions.push({
          id,
          kind: "industry",
          label: industry,
          description: `Filter by industry: ${industry}`,
          icon: "briefcase",
          filters: { industry },
        });
        seen.add(id);
      }
    }
  }

  // ==========================================================================
  // Country suggestions from context
  // ==========================================================================
  for (const country of context.countries) {
    if (country.toLowerCase().includes(query)) {
      const id = `country-${country.toLowerCase()}`;
      if (!seen.has(id)) {
        suggestions.push({
          id,
          kind: "country",
          label: country,
          description: `Filter by country: ${country}`,
          icon: "globe",
          filters: { country },
        });
        seen.add(id);
      }
    }
  }

  // ==========================================================================
  // Status suggestions
  // ==========================================================================
  for (const [key, label] of Object.entries(STATUS_LABELS)) {
    if (label.toLowerCase().includes(query) || key.includes(query)) {
      const id = `status-${key}`;
      if (!seen.has(id)) {
        suggestions.push({
          id,
          kind: "status",
          label,
          description: `Filter by status: ${label}`,
          icon: "check",
          filters: { status: key as ProspectFilters["status"] },
        });
        seen.add(id);
      }
    }
  }

  return suggestions.slice(0, 6);
}

/**
 * Get curated popular suggestions shown when search bar is idle.
 */
export function getPopularSuggestions(context: SearchContext): SearchSuggestion[] {
  const suggestions: SearchSuggestion[] = [
    {
      id: "sug-software",
      kind: "industry",
      label: "Software Companies",
      description: "Find software companies in your pipeline",
      icon: "code",
      filters: { industry: "Software" },
    },
    {
      id: "sug-high-intent",
      kind: "intent",
      label: "High Intent",
      description: "Prospects showing strong buying signals",
      icon: "zap",
      filters: { buying_intent: "high" },
    },
    {
      id: "sug-recently-added",
      kind: "quick-filter",
      label: "Recently Added",
      description: "Newest additions to your workspace",
      icon: "clock",
      filters: { quick_filter: "last_7_days" as QuickFilterPreset },
    },
    {
      id: "sug-enterprise",
      kind: "employees",
      label: "Enterprise",
      description: "Companies with 100+ employees",
      icon: "building",
      filters: { employee_count: 100 },
    },
    {
      id: "sug-warm-leads",
      kind: "intent",
      label: "Warm Leads",
      description: "Qualified prospects ready to engage",
      icon: "flame",
      filters: { buying_intent: "high" },
    },
    {
      id: "sug-favorites",
      kind: "favorites",
      label: "Favorites",
      description: "Prospects you've starred",
      icon: "star",
      filters: { favorites_only: true },
    },
  ];

  // Add industries if available
  for (const industry of context.industries.slice(0, 3)) {
    suggestions.push({
      id: `sug-ind-${industry.toLowerCase()}`,
      kind: "industry",
      label: industry,
      description: `All ${industry} companies`,
      icon: "briefcase",
      filters: { industry },
    });
  }

  return suggestions.slice(0, 6);
}

// ============================================================================
// Smart Recommendations
// ============================================================================

/**
 * Get smart recommendations shown on idle/empty state.
 * These represent common search patterns users explore.
 */
export function getSmartRecommendations(
  context?: SearchContext
): SmartRecommendation[] {
  const recommendations: SmartRecommendation[] = [
    {
      id: "rec-software-germany",
      label: "Software + Germany",
      description: "Software companies based in Germany",
      icon: "globe",
      filters: { industry: "Software", country: "Germany" },
      exampleQuery: "Find software companies in Germany",
      badge: "Popular",
    },
    {
      id: "rec-warm-leads",
      label: "Warm Leads",
      description: "Prospects showing strong buying intent",
      icon: "zap",
      filters: { buying_intent: "high" },
      exampleQuery: "Show warm leads",
      badge: "Recommended",
    },
    {
      id: "rec-high-revenue",
      label: "High Revenue",
      description: "Companies with revenue above $10M",
      icon: "trending-up",
      filters: { revenue: 10_000_000 },
      exampleQuery: "Find companies with revenue above $10M",
    },
    {
      id: "rec-enterprise",
      label: "Enterprise",
      description: "Large companies with 100+ employees",
      icon: "building",
      filters: { employee_count: 100 },
      exampleQuery: "Find enterprise companies",
    },
    {
      id: "rec-mobile-dev",
      label: "Recently Added",
      description: "New prospects added this week",
      icon: "clock",
      filters: { quick_filter: "last_7_days" as QuickFilterPreset },
      exampleQuery: "Show recently added prospects",
    },
    {
      id: "rec-tech-india",
      label: "Tech + India",
      description: "Technology companies based in India",
      icon: "map",
      filters: { industry: "Technology", country: "India" },
      exampleQuery: "Find technology companies in India",
    },
  ];

  return recommendations;
}