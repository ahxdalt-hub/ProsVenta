"use server";

import { createClient } from "@/lib/supabase/server";
import type { Prospect, SavedList } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

/** Lightweight prospect record for analytics computation. */
export interface AnalyticsProspect {
  id: string;
  name: string;
  company_name: string;
  industry: string | null;
  country: string | null;
  city: string | null;
  status: Prospect["status"];
  source: Prospect["source"];
  priority: Prospect["priority"];
  lead_score: number | null;
  ai_fit_score: number | null;
  buying_intent: Prospect["buying_intent"];
  revenue: number | null;
  created_at: string;
  updated_at: string;
}

/** Saved list with its prospect count. */
export interface AnalyticsSavedList {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  prospectCount: number;
}

/** Organization summary for analytics. */
export interface AnalyticsOrganization {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
}

/** Complete analytics dataset fetched from the database. */
export interface AnalyticsData {
  prospects: AnalyticsProspect[];
  savedLists: AnalyticsSavedList[];
  organization: AnalyticsOrganization | null;
  /** Distinct industries available for filtering. */
  industries: string[];
  /** Distinct countries available for filtering. */
  countries: string[];
  /** Whether the user has any prospects at all. */
  hasProspects: boolean;
}

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetches all raw data needed for the Analytics workspace in a single
 * coordinated round-trip. RLS ensures users only see their organization's data.
 *
 * Computation (counts, distributions, time series) is performed client-side
 * with memoization so filters update instantly without server round-trips.
 */
export async function getAnalyticsData(): Promise<AnalyticsData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return emptyAnalyticsData();
  }

  // Fetch prospects (only analytics-relevant fields to minimize payload),
  // saved lists, and organization membership in parallel.
  const [prospectsResult, listsResult, membershipResult] = await Promise.all([
    supabase
      .from("prospects")
      .select(
        "id, name, company_name, industry, country, city, status, source, priority, lead_score, ai_fit_score, buying_intent, revenue, created_at, updated_at"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_lists")
      .select("id, name, description, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single(),
  ]);

  const prospects = (prospectsResult.data ?? []) as AnalyticsProspect[];
  const savedLists = (listsResult.data ?? []) as SavedList[];

  // Fetch organization details and member count if the user has a membership.
  let organization: AnalyticsOrganization | null = null;
  const orgId = membershipResult.data?.organization_id;

  if (orgId) {
    const [orgResult, memberCountResult] = await Promise.all([
      supabase.from("organizations").select("id, name, created_at").eq("id", orgId).single(),
      supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId),
    ]);

    if (orgResult.data) {
      organization = {
        id: orgResult.data.id,
        name: orgResult.data.name,
        memberCount: memberCountResult.count ?? 0,
        createdAt: orgResult.data.created_at,
      };
    }
  }

  // Fetch saved list item counts.
  // We fetch all saved_list_items (just list_id) and count client-side.
  // This is a single query regardless of list count.
  let analyticsSavedLists: AnalyticsSavedList[] = [];
  if (savedLists.length > 0) {
    const { data: items } = await supabase.from("saved_list_items").select("list_id");

    const countMap = new Map<string, number>();
    for (const item of items ?? []) {
      const id = item.list_id as string;
      countMap.set(id, (countMap.get(id) ?? 0) + 1);
    }

    analyticsSavedLists = savedLists.map((list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      created_at: list.created_at,
      updated_at: list.updated_at,
      prospectCount: countMap.get(list.id) ?? 0,
    }));
  }

  // Extract distinct industries and countries for filter dropdowns.
  const industries = distinctValues(prospects, "industry");
  const countries = distinctValues(prospects, "country");

  return {
    prospects,
    savedLists: analyticsSavedLists,
    organization,
    industries,
    countries,
    hasProspects: prospects.length > 0,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function emptyAnalyticsData(): AnalyticsData {
  return {
    prospects: [],
    savedLists: [],
    organization: null,
    industries: [],
    countries: [],
    hasProspects: false,
  };
}

function distinctValues(
  prospects: AnalyticsProspect[],
  field: "industry" | "country"
): string[] {
  const set = new Set<string>();
  for (const p of prospects) {
    const value = p[field];
    if (value && value.trim()) {
      set.add(value.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}