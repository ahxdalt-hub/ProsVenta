// ============================================================================
// Prosventa Prospect Query Types
// Stage 3 — Phase 3: Saved Views & Advanced Filtering
// ============================================================================
// Types for searching, filtering, sorting, and paginating prospects.
// These map to URL search parameters so the UI state is fully shareable.
// ============================================================================

import type {
  BuyingIntent,
  ProspectPriority,
  ProspectSource,
  ProspectStatus,
} from "@/types/database";

/**
 * Sortable fields for the prospect table.
 */
export type ProspectSortField =
  | "name"
  | "company_name"
  | "industry"
  | "location"
  | "website"
  | "status"
  | "priority"
  | "source"
  | "created_at"
  | "updated_at"
  | "lead_score"
  | "ai_fit_score"
  | "icp_score"
  | "revenue"
  | "employee_count";

/**
 * Sort direction.
 */
export type SortOrder = "asc" | "desc";

/**
 * Numeric comparison operators for range filters.
 */
export type NumericOperator = "gt" | "gte" | "lt" | "lte" | "eq";

/**
 * Date range presets for quick filtering.
 */
export type QuickFilterPreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "recently_updated"
  | "high_score"
  | "recently_contacted";

/**
 * A single filter condition in the filter builder.
 * Each condition combines a field, operator, and value.
 */
export interface FilterCondition {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string | number | boolean;
}

/**
 * Filterable fields for the advanced filter builder.
 */
export type FilterField =
  | "company_name"
  | "industry"
  | "country"
  | "status"
  | "priority"
  | "tags"
  | "owner"
  | "created_at"
  | "updated_at"
  | "lead_score"
  | "ai_fit_score"
  | "buying_intent"
  | "revenue"
  | "employee_count"
  | "source";

/**
 * Filter operators per field type.
 */
export type FilterOperator =
  | "is"
  | "is_not"
  | "contains"
  | "does_not_contain"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "eq"
  | "is_one_of"
  | "is_none_of"
  | "has_any_of"
  | "exists"
  | "before"
  | "after";

/**
 * Filter parameters applied to a prospect listing query.
 * All filters are optional and combinable.
 */
export interface ProspectFilters {
  /** Search terms applied across company, industry, location, website */
  search?: string;
  /** Industry exact match */
  industry?: string;
  /** Country exact match */
  country?: string;
  /** Status exact match */
  status?: ProspectStatus;
  /** Source exact match */
  source?: ProspectSource;
  /** Priority exact match */
  priority?: ProspectPriority;
  /** Tag filter (array contains) */
  tags?: string[];
  /** Buying intent */
  buying_intent?: BuyingIntent;
  /** Lead score */
  lead_score?: number;
  /** AI fit score */
  ai_fit_score?: number;
  /** Revenue */
  revenue?: number;
  /** Employee count */
  employee_count?: number;
  /** Owner (user id) */
  owner?: string;
  /** Created before date */
  created_before?: string;
  /** Created after date */
  created_after?: string;
  /** Updated before date */
  updated_before?: string;
  /** Updated after date */
  updated_after?: string;
  /** Favorites only */
  favorites_only?: boolean;
  /** Quick filter preset */
  quick_filter?: QuickFilterPreset;
  /** Advanced filter builder conditions */
  conditions?: FilterCondition[];
}

/**
 * Pagination parameters for a prospect listing query.
 */
export interface PaginationParams {
  /** Zero-based page offset */
  page: number;
  /** Number of prospects per page */
  pageSize: number;
}

/**
 * Full query for listing prospects with optional filters and pagination.
 */
export interface ProspectQuery extends ProspectFilters {
  page?: number;
  pageSize?: number;
  sort?: ProspectSortField;
  order?: SortOrder;
}

/**
 * Result of a paginated prospect listing query.
 */
export interface ProspectPage {
  prospects: import("@/types/database").Prospect[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Builds a URL query string from filter parameters.
 * Used for URL-based search state preservation.
 */
export function buildProspectQueryString(filters: ProspectFilters): string {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.industry) params.set("industry", filters.industry);
  if (filters.country) params.set("country", filters.country);
  if (filters.status) params.set("status", filters.status);
  if (filters.source) params.set("source", filters.source);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.tags && filters.tags.length > 0) params.set("tags", filters.tags.join(","));
  if (filters.buying_intent) params.set("buying_intent", filters.buying_intent);
  if (filters.lead_score !== undefined) params.set("lead_score", String(filters.lead_score));
  if (filters.ai_fit_score !== undefined) params.set("ai_fit_score", String(filters.ai_fit_score));
  if (filters.revenue !== undefined) params.set("revenue", String(filters.revenue));
  if (filters.employee_count !== undefined) params.set("employee_count", String(filters.employee_count));
  if (filters.owner) params.set("owner", filters.owner);
  if (filters.created_before) params.set("created_before", filters.created_before);
  if (filters.created_after) params.set("created_after", filters.created_after);
  if (filters.updated_before) params.set("updated_before", filters.updated_before);
  if (filters.updated_after) params.set("updated_after", filters.updated_after);
  if (filters.favorites_only) params.set("favorites_only", "true");
  if (filters.quick_filter) params.set("quick_filter", filters.quick_filter);

  // Advanced filter conditions serialized as JSON
  if (filters.conditions && filters.conditions.length > 0) {
    params.set("conditions", JSON.stringify(filters.conditions));
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Extracts filter values from URL search parameters.
 * This is the inverse of buildProspectQueryString.
 */
export function parseProspectQuery(
  searchParams: URLSearchParams
): ProspectFilters {
  const conditionsRaw = searchParams.get("conditions");
  let conditions: FilterCondition[] | undefined;
  if (conditionsRaw) {
    try {
      const parsed = JSON.parse(conditionsRaw);
      if (Array.isArray(parsed)) {
        conditions = parsed as FilterCondition[];
      }
    } catch {
      // Invalid JSON — ignore
    }
  }

  return {
    search: searchParams.get("search") || undefined,
    industry: searchParams.get("industry") || undefined,
    country: searchParams.get("country") || undefined,
    status: asStatus(searchParams.get("status")),
    source: asSource(searchParams.get("source")),
    priority: asPriority(searchParams.get("priority")),
    tags: searchParams.get("tags")?.split(",").filter(Boolean),
    buying_intent: asBuyingIntent(searchParams.get("buying_intent")),
    lead_score: toNumber(searchParams.get("lead_score")),
    ai_fit_score: toNumber(searchParams.get("ai_fit_score")),
    revenue: toNumber(searchParams.get("revenue")),
    employee_count: toNumber(searchParams.get("employee_count")),
    owner: searchParams.get("owner") || undefined,
    created_before: searchParams.get("created_before") || undefined,
    created_after: searchParams.get("created_after") || undefined,
    updated_before: searchParams.get("updated_before") || undefined,
    updated_after: searchParams.get("updated_after") || undefined,
    favorites_only: searchParams.get("favorites_only") === "true" || undefined,
    quick_filter: asQuickFilter(searchParams.get("quick_filter")),
    conditions,
  };
}

function toNumber(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

function asStatus(value: string | null): ProspectStatus | undefined {
  if (
    value === "new" ||
    value === "contacted" ||
    value === "qualified" ||
    value === "proposal_sent" ||
    value === "negotiation" ||
    value === "won" ||
    value === "lost"
  ) {
    return value;
  }
  return undefined;
}

function asSource(value: string | null): ProspectSource | undefined {
  if (value === "manual" || value === "import" || value === "discovery" || value === "api") {
    return value;
  }
  return undefined;
}

function asPriority(value: string | null): ProspectPriority | undefined {
  if (value === "low" || value === "medium" || value === "high" || value === "urgent") {
    return value;
  }
  return undefined;
}

function asBuyingIntent(value: string | null): BuyingIntent | undefined {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return undefined;
}

function asQuickFilter(value: string | null): QuickFilterPreset | undefined {
  if (
    value === "today" ||
    value === "yesterday" ||
    value === "last_7_days" ||
    value === "last_30_days" ||
    value === "recently_updated" ||
    value === "high_score" ||
    value === "recently_contacted"
  ) {
    return value;
  }
  return undefined;
}

