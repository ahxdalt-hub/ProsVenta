"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  EnrichmentStatus,
  Prospect,
  ProspectInsert,
  ProspectUpdate,
  ProspectNote,
} from "@/types/database";
import type { ProspectScore } from "@/features/intelligence/scoring/types";
import { getProspectScore } from "./icp-scoring";
import type {
  ProspectFilters,
  ProspectPage,
  ProspectSortField,
  SortOrder,
} from "@/features/prospects/types/query";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

// ============================================================================
// Stage 7 Phase 2 — Trigger & Event Engine producer helper
// ============================================================================
// Fire-and-forget event emission. Dynamic import avoids circular dependencies;
// failures are logged and swallowed — prospect CRUD must never break because
// of the workflow trigger engine.
// ============================================================================
type ProspectEventInput = Parameters<
  typeof import("@/features/intelligence/workflows/triggers/emit").safeEmitWorkflowEvent
>[0];

function emitProspectEventSafe(input: ProspectEventInput): void {
  import("@/features/intelligence/workflows/triggers/emit")
    .then(({ safeEmitWorkflowEvent }) => safeEmitWorkflowEvent(input))
    .catch((err) => console.error("[prospects] Event emission failed:", err));
}


/**
 * Retrieves all prospects for the authenticated user's organization.
 * Uses RLS to ensure users can only access their organization's data.
 */
export async function getProspects(): Promise<Prospect[]> {
  const supabase = await createClient();

  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .order("created_at", { ascending: false });

  return prospects ?? [];
}

/**
 * Retrieves a single prospect by ID.
 * RLS ensures users can only access their organization's prospects.
 */
export async function getProspect(id: string): Promise<Prospect | null> {
  const supabase = await createClient();

  const { data: prospect, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .single();

  // DEV-ONLY diagnostics (Phase 2 recovery): surface WHY a detail lookup came
  // back empty instead of collapsing every failure into "not found".
  //   no error + row       → Case A (normal)
  //   PGRST116 "no rows"   → Case B (genuinely absent) OR Case C (RLS hid it)
  //   any other code       → Case D (query failed)
  // Never logs tokens or credentials.
  if (process.env.NODE_ENV === "development") {
    console.log(
      "[DB-PROSPECT] detail lookup:",
      JSON.stringify({
        prospectId: id,
        found: Boolean(prospect),
        errorCode: error?.code ?? null,
        errorMessage: error?.message ?? null,
      })
    );
  }

  return prospect;
}

/**
 * Queries prospects with optional filters, search, sorting, and pagination.
 *
 * URL mapping:
 *   /dashboard/prospects?search=software&industry=SaaS&country=US&sort=company_name&order=asc
 *
 * @param query - Search, filter, sort, and pagination parameters.
 * @returns A paginated page of prospects.
 */
export async function queryProspects(
  query: ProspectFilters & {
    page?: number;
    pageSize?: number;
    sort?: ProspectSortField;
    order?: SortOrder;
  } = {}
): Promise<ProspectPage> {
  const supabase = await createClient();

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const sortField = query.sort ?? "created_at";
  const sortOrder = query.order ?? "desc";

  // ICP Score lives in prospect_scores (one-to-one via unique prospect_id).
  // Embed it in the same request so there is no N+1 pattern, and sort on the
  // stored numeric score. Unscored prospects always group after scored ones.
  const isIcpSort = sortField === ("icp_score" as ProspectSortField);
  let dbQuery = supabase
    .from("prospects")
    .select("*, prospect_scores(score, category)", { count: "exact" });

  if (isIcpSort) {
    dbQuery = dbQuery
      .order("prospect_scores(score)", { ascending: sortOrder === "asc", nullsFirst: false })
      .order("created_at", { ascending: false });
  } else {
    dbQuery = dbQuery.order(sortField, { ascending: sortOrder === "asc" });
  }
  dbQuery = dbQuery.range(from, to);

  // Apply filters
  if (query.status) {
    dbQuery = dbQuery.eq("status", query.status);
  }
  if (query.industry) {
    dbQuery = dbQuery.eq("industry", query.industry);
  }
  if (query.country) {
    dbQuery = dbQuery.eq("country", query.country);
  }
  if (query.source) {
    dbQuery = dbQuery.eq("source", query.source);
  }
  if (query.priority) {
    dbQuery = dbQuery.eq("priority", query.priority);
  }
  if (query.tags && query.tags.length > 0) {
    dbQuery = dbQuery.contains("tags", query.tags);
  }
  if (query.buying_intent) {
    dbQuery = dbQuery.eq("buying_intent", query.buying_intent);
  }
  if (query.lead_score !== undefined) {
    dbQuery = dbQuery.gte("lead_score", query.lead_score);
  }
  if (query.ai_fit_score !== undefined) {
    dbQuery = dbQuery.gte("ai_fit_score", query.ai_fit_score);
  }
  if (query.revenue !== undefined) {
    dbQuery = dbQuery.gte("revenue", query.revenue);
  }
  if (query.employee_count !== undefined) {
    dbQuery = dbQuery.gte("employee_count", query.employee_count);
  }
  if (query.owner && query.owner !== "__me__") {
    dbQuery = dbQuery.eq("owner_id", query.owner);
  }
  if (query.owner === "__me__") {
    const supabase2 = await createClient();
    const { data: { user } } = await supabase2.auth.getUser();
    if (user) {
      dbQuery = dbQuery.eq("owner_id", user.id);
    }
  }
  if (query.created_before) {
    dbQuery = dbQuery.lte("created_at", query.created_before);
  }
  if (query.created_after) {
    dbQuery = dbQuery.gte("created_at", query.created_after);
  }
  if (query.updated_before) {
    dbQuery = dbQuery.lte("updated_at", query.updated_before);
  }
  if (query.updated_after) {
    dbQuery = dbQuery.gte("updated_at", query.updated_after);
  }
  if (query.favorites_only) {
    dbQuery = dbQuery.eq("is_favorite", true);
  }

  // Apply quick filters
  if (query.quick_filter) {
    const now = new Date();
    switch (query.quick_filter) {
      case "today": {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        dbQuery = dbQuery.gte("created_at", start.toISOString());
        break;
      }
      case "yesterday": {
        const start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        dbQuery = dbQuery.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
        break;
      }
      case "last_7_days": {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        dbQuery = dbQuery.gte("created_at", start.toISOString());
        break;
      }
      case "last_30_days": {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        dbQuery = dbQuery.gte("created_at", start.toISOString());
        break;
      }
      case "recently_updated": {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        dbQuery = dbQuery.gte("updated_at", start.toISOString());
        break;
      }
      case "high_score": {
        dbQuery = dbQuery.gte("lead_score", 80);
        break;
      }
      case "recently_contacted": {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        dbQuery = dbQuery.gte("last_contacted_at", start.toISOString());
        break;
      }
    }
  }

  // Apply search across name, company, industry, location, website, tags
  if (query.search && query.search.trim()) {
    const raw = query.search.trim();
    // PostgREST's .or() uses a comma-delimited grammar — a search term
    // containing , ( ) " would corrupt the filter string and make the whole
    // query fail. Strip those characters from the ilike patterns.
    const term = `%${raw.replace(/[,()"]/g, " ").trim()}%`;
    const tagTerm = raw.replace(/[,()"]/g, "");
    dbQuery = dbQuery.or(
      `name.ilike.${term},company_name.ilike.${term},industry.ilike.${term},location.ilike.${term},website.ilike.${term},domain.ilike.${term},city.ilike.${term},country.ilike.${term},contact_name.ilike.${term},contact_email.ilike.${term}${tagTerm ? `,tags.cs.${tagTerm}` : ""}`
    );
  }

  // Apply advanced filter builder conditions
  if (query.conditions && query.conditions.length > 0) {
    for (const condition of query.conditions) {
      applyFilterCondition(dbQuery, condition);
    }
  }

  const { data: prospects, count, error: prospectsError } = await dbQuery;

  // Surface real query failures (RLS issues, bad filters, outages) to the page
  // shell so the user sees an explicit error state instead of an empty table.
  if (prospectsError) {
    throw new Error(prospectsError.message);
  }

  // Normalize the embedded prospect_scores relationship: PostgREST may return
  // an object (one-to-one) or a single-element array depending on how the
  // unique constraint is detected. The UI expects an object.
  const normalized = (prospects ?? []).map((p: Record<string, unknown>) => {
    const embedded = p.prospect_scores;
    if (Array.isArray(embedded)) {
      return { ...p, prospect_scores: embedded[0] ?? null };
    }
    return p;
  });

  // Attach active-recommendation hints for the current page in ONE batched
  // query (RLS-scoped). This is a per-page query, never a per-row N+1 loop,
  // and a failure here must not break the prospects listing itself.
  const pageIds = normalized.map((p) => (p as Record<string, unknown>).id as string).filter(Boolean);
  let recsByProspect = new Map<string, { recommendation_type: string; priority: "high" | "medium" | "low" }[]>();
  if (pageIds.length > 0) {
    try {
      const supabaseForRecs = await createClient();
      const { data: recs } = await supabaseForRecs
        .from("recommendations")
        .select("prospect_id, recommendation_type, priority")
        .in("prospect_id", pageIds)
        .neq("status", "dismissed")
        .order("created_at", { ascending: false });
      for (const rec of (recs ?? []) as { prospect_id: string; recommendation_type: string; priority: "high" | "medium" | "low" }[]) {
        const list = recsByProspect.get(rec.prospect_id) ?? [];
        if (list.length < 5) {
          list.push({ recommendation_type: rec.recommendation_type, priority: rec.priority });
          recsByProspect.set(rec.prospect_id, list);
        }
      }
    } catch {
      // Recommendations are an enhancement — absence must not fail the table.
      recsByProspect = new Map();
    }
  }

  const withRecommendations = normalized.map((p) => {
    const id = (p as Record<string, unknown>).id as string;
    return { ...p, active_recommendations: recsByProspect.get(id) ?? [] };
  });

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    prospects: withRecommendations as never[],
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Structural view of the subset of the Supabase PostgREST filter builder used
 * by the advanced filter engine. Filter methods mutate the builder in place
 * (they return `this`), so callers never need the return value.
 */
interface FilterableProspectQuery {
  contains(column: string, value: unknown): unknown;
  eq(column: string, value: unknown): unknown;
  neq(column: string, value: unknown): unknown;
  not(column: string, operator: string, value: unknown): unknown;
  ilike(column: string, value: string): unknown;
  gt(column: string, value: unknown): unknown;
  gte(column: string, value: unknown): unknown;
  lt(column: string, value: unknown): unknown;
  lte(column: string, value: unknown): unknown;
  in(column: string, values: unknown[]): unknown;
  overlaps(column: string, values: unknown[]): unknown;
}

/**
 * Applies a single filter builder condition to the Supabase query.
 */
function applyFilterCondition(
  dbQuery: FilterableProspectQuery,
  condition: { field: string; operator: string; value: string | number | boolean }
): void {
  const { field, operator, value } = condition;

  // Map filter field names to database column names
  const columnMap: Record<string, string> = {
    company_name: "company_name",
    industry: "industry",
    country: "country",
    status: "status",
    priority: "priority",
    tags: "tags",
    owner: "owner_id",
    created_at: "created_at",
    updated_at: "updated_at",
    lead_score: "lead_score",
    ai_fit_score: "ai_fit_score",
    buying_intent: "buying_intent",
    revenue: "revenue",
    employee_count: "employee_count",
    source: "source",
  };

  const column = columnMap[field];
  if (!column) return;

  switch (operator) {
    case "is":
      if (column === "tags") {
        dbQuery.contains(column, [value]);
      } else {
        dbQuery.eq(column, value);
      }
      break;
    case "is_not":
      if (column === "tags") {
        dbQuery.not(column, "cs", `{${value}}`);
      } else {
        dbQuery.neq(column, value);
      }
      break;
    case "contains":
      dbQuery.ilike(column, `%${value}%`);
      break;
    case "does_not_contain":
      dbQuery.not(column, "ilike", `%${value}%`);
      break;
    case "gt":
      dbQuery.gt(column, value);
      break;
    case "gte":
      dbQuery.gte(column, value);
      break;
    case "lt":
      dbQuery.lt(column, value);
      break;
    case "lte":
      dbQuery.lte(column, value);
      break;
    case "eq":
      dbQuery.eq(column, value);
      break;
    case "is_one_of":
      if (typeof value === "string" && value.includes(",")) {
        const values = value.split(",").filter(Boolean);
        if (values.length > 0) {
          dbQuery.in(column, values);
        }
      }
      break;
    case "is_none_of":
      if (typeof value === "string" && value.includes(",")) {
        const values = value.split(",").filter(Boolean);
        if (values.length > 0) {
          dbQuery.not(column, "in", `(${values.join(",")})`);
        }
      }
      break;
    case "has_any_of":
      if (typeof value === "string" && value.includes(",")) {
        const values = value.split(",").filter(Boolean);
        if (values.length > 0) {
          dbQuery.overlaps(column, values);
        }
      }
      break;
    case "exists":
      dbQuery.not(column, "is", null);
      break;
    case "before":
      dbQuery.lte(column, String(value));
      break;
    case "after":
      dbQuery.gte(column, String(value));
      break;
  }
}

/**
 * Retrieves a list of distinct industries for the organization.
 * Used to populate the Industry filter dropdown.
 */
export async function getDistinctIndustries(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("prospects")
    .select("industry")
    .not("industry", "is", null)
    .order("industry");

  return Array.from(new Set((data ?? []).map((r) => r.industry as string)));
}

/**
 * Retrieves a list of distinct countries for the organization.
 * Used to populate the Country filter dropdown.
 */
export async function getDistinctCountries(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("prospects")
    .select("country")
    .not("country", "is", null)
    .order("country");

  return Array.from(new Set((data ?? []).map((r) => r.country as string)));
}

/**
 * Retrieves a list of distinct tags for the organization.
 * Used to populate the Tag filter dropdown.
 */
export async function getDistinctTags(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("prospects")
    .select("tags")
    .not("tags", "is", null);

  const tagSet = new Set<string>();
  (data ?? []).forEach((row) => {
    const tags = row.tags as string[];
    if (Array.isArray(tags)) {
      tags.forEach((tag) => tagSet.add(tag));
    }
  });

  return Array.from(tagSet).sort();
}

/**
 * Retrieves all organization members for the Owner filter dropdown.
 */
export async function getOrganizationMembers(): Promise<{ id: string; full_name: string | null }[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return [];

  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", membership.organization_id);

  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  return (profiles ?? []).map((p) => ({ id: p.id as string, full_name: p.full_name as string | null }));
}

/**
 * Retrieves a list of distinct sources for the organization.
 * Used to populate the Source filter dropdown.
 */
export async function getDistinctSources(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("prospects")
    .select("source")
    .not("source", "is", null)
    .order("source");

  return Array.from(new Set((data ?? []).map((r) => r.source as string)));
}

/**
 * Creates a new prospect record.
 * Derives the `name` field from `company_name` when `name` is not provided
 * (compatibility with Phase 6 onboarding data).
 */
export async function createProspect(
  input: ProspectInsert
): Promise<Prospect | null> {
  const supabase = await createClient();

  const insertData: ProspectInsert = {
    ...input,
    name: input.name ?? input.company_name ?? "",
  };

  const { data: prospect } = await supabase
    .from("prospects")
    .insert(insertData)
    .select()
    .single();

  // Stage 7 Phase 2: prospect.created → trigger engine. Fire-and-forget —
  // prospect creation must never block or fail because of workflow triggers.
  if (prospect) {
    emitProspectEventSafe({
      eventType: "prospect.created",
      organizationId: prospect.organization_id,
      targetType: "prospect",
      targetId: prospect.id,
      payload: {
        prospect_id: prospect.id,
        source: prospect.source ?? null,
        created_at: prospect.created_at ?? new Date().toISOString(),
      },
      dedupeKey: `prospect.created:${prospect.id}`,
    });
  }

  return prospect;
}

/**
 * Creates multiple prospect records in a single operation.
 * Used by the prospect processing pipeline to persist normalized batches.
 */
export async function createProspects(
  inputs: ProspectInsert[]
): Promise<Prospect[]> {
  if (inputs.length === 0) return [];

  const supabase = await createClient();

  const insertData: ProspectInsert[] = inputs.map((input) => ({
    ...input,
    name: input.name ?? input.company_name ?? "",
  }));

  const { data: prospects } = await supabase
    .from("prospects")
    .insert(insertData)
    .select();

  return prospects ?? [];
}

/**
 * Updates an existing prospect record.
 */
export async function updateProspect(
  id: string,
  updates: ProspectUpdate
): Promise<Prospect | null> {
  const supabase = await createClient();

  const { data: prospect } = await supabase
    .from("prospects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  // Stage 7 Phase 2: prospect.updated → trigger engine.
  if (prospect) {
    emitProspectEventSafe({
      eventType: "prospect.updated",
      organizationId: prospect.organization_id,
      targetType: "prospect",
      targetId: prospect.id,
      payload: {
        prospect_id: prospect.id,
        updated_fields: Object.keys(updates),
        updated_at: new Date().toISOString(),
      },
      dedupeKey: `prospect.updated:${prospect.id}:${new Date().toISOString().slice(0, 19)}`,
    });
  }

  return prospect;
}

/**
 * Updates the status of a prospect.
 * Used by the prospect management actions.
 */
export async function updateProspectStatus(
  id: string,
  status: Prospect["status"]
): Promise<Prospect | null> {
  return updateProspect(id, { status });
}

/**
 * Updates the enrichment status of a prospect.
 * Used by future enrichment workers (Phase 10+) to track pipeline progress.
 */
export async function updateProspectEnrichmentStatus(
  id: string,
  enrichmentStatus: EnrichmentStatus
): Promise<Prospect | null> {
  return updateProspect(id, { enrichment_status: enrichmentStatus });
}

/**
 * Deletes a prospect record.
 */
export async function deleteProspect(id: string): Promise<boolean> {
  const supabase = await createClient();

  // Capture ownership before deletion so the event can be org-scoped.
  const { data: existing } = await supabase
    .from("prospects")
    .select("organization_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("prospects")
    .delete()
    .eq("id", id);

  if (!error && existing) {
    emitProspectEventSafe({
      eventType: "prospect.deleted",
      organizationId: existing.organization_id,
      targetType: "prospect",
      targetId: id,
      payload: {
        prospect_id: id,
        deleted_at: new Date().toISOString(),
      },
      dedupeKey: `prospect.deleted:${id}`,
    });
  }

  return !error;
}

/**
 * Retrieves the total count of prospects for the organization.
 */
export async function getProspectCount(): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("prospects")
    .select("*", { count: "exact", head: true });

  return count ?? 0;
}

/**
 * Retrieves a prospect with its notes and saved-list memberships.
 * Used by the prospect detail panel to render everything in one round-trip.
 */
export async function getProspectWithDetails(id: string): Promise<{
  prospect: Prospect | null;
  notes: ProspectNote[];
  listIds: string[];
  score: ProspectScore | null;
}> {
  const supabase = await createClient();

  const prospect = await getProspect(id);
  if (!prospect) {
    return { prospect: null, notes: [], listIds: [], score: null };
  }

  // Fetch notes, list memberships, and the stored ICP score in parallel
  const [notesResult, itemsResult, scoreResult] = await Promise.all([
    supabase
      .from("prospect_notes")
      .select("*")
      .eq("prospect_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_list_items")
      .select("list_id")
      .eq("prospect_id", id),
    getProspectScore(id),
  ]);

  const notes = (notesResult.data ?? []) as ProspectNote[];
  const listIds = (itemsResult.data ?? []).map((item) => item.list_id as string);

  return { prospect, notes, listIds, score: scoreResult };
}