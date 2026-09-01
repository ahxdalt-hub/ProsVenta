"use server";

import { createClient } from "@/lib/supabase/server";
// ============================================================================
// Find Matching Leads — Server Actions (Phase 4 hardened)
// ============================================================================
// Server-authoritative entry points for the Find Matching Leads workspace.
// Organization context is ALWAYS resolved from the authenticated session —
// never from client input. Provider credentials never leave the server.
// ============================================================================

import { runLeadSearch, type LeadSearchResult } from "@/features/prospects/services/discovery";
import {
  DiscoveryError,
  type DiscoveryErrorCode,
  type LeadSearchRequest,
  type NormalizedLead,
} from "@/features/prospects/types/discovery";
import { getIcpConfiguration } from "@/lib/db/icp-scoring";
import { createProspectSearch, updateProspectSearch } from "@/lib/db/prospect-searches";
import { createProspect } from "@/lib/db/prospects";

/** Client-safe error shape — structured code, no internals. */
export interface DiscoveryActionError {
  code: DiscoveryErrorCode | "UNKNOWN" | "UNAUTHORIZED" | "NO_ORGANIZATION";
  message: string;
}

async function resolveSession(): Promise<
  { ok: true; userId: string; organizationId: string } | { ok: false; error: DiscoveryActionError }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Please sign in to continue." },
    };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return {
      ok: false,
      error: {
        code: "NO_ORGANIZATION",
        message: "You must belong to an organization to search for leads.",
      },
    };
  }

  return { ok: true, userId: user.id, organizationId: membership.organization_id };
}

/**
 * Runs a provider-backed lead search for the authenticated user's organization.
 * The active ICP influences defaults automatically but is never modified.
 */
export async function searchMatchingLeadsAction(
  request: LeadSearchRequest
): Promise<{ error: DiscoveryActionError | null; result: LeadSearchResult | null }> {
  const session = await resolveSession();
  if (!session.ok) return { error: session.error, result: null };

  const { organizationId, userId } = session;

  // Read (never mutate) the organization's active ICP configuration.
  const icpConfig = await getIcpConfiguration(organizationId);

  // Persist the search request for the organization's history (best-effort).
  let searchId: string | null = null;
  try {
    const search = await createProspectSearch({
      organization_id: organizationId,
      created_by: userId,
      industry: (request.industries ?? []).join(", ") || null,
      location: (request.locations ?? []).join(", ") || null,
      company_size: request.companySize ?? null,
      keywords:
        [request.query, ...(request.jobTitles ?? [])].filter(Boolean).join(" ").trim() || null,
      status: "processing",
    });
    searchId = search?.id ?? null;
  } catch {
    // History persistence must not block discovery.
  }

  try {
    const result = await runLeadSearch({
      organizationId,
      userId,
      request,
      icpCriteria: icpConfig?.criteria ?? null,
    });

    if (searchId) void updateProspectSearch(searchId, { status: "completed" });
    return { error: null, result };
  } catch (err) {
    if (searchId) void updateProspectSearch(searchId, { status: "failed" });

    if (err instanceof DiscoveryError) {
      // Structured code → user-facing message. Provider internals never leak.
      const code: DiscoveryErrorCode | "UPSTREAM_ERROR" = err.code;
      return {
        error: {
          code,
          message:
            code === "RATE_LIMITED"
              ? "The lead provider is temporarily limiting requests. Please wait a moment and try again."
              : code === "PROVIDER_NOT_CONFIGURED"
                ? "Lead discovery is not configured yet. Please contact your administrator."
                : code === "AUTH_FAILED"
                  ? "The lead provider rejected access. Please contact your administrator."
                  : code === "INVALID_REQUEST"
                    ? err.message
                    : "Lead search is temporarily unavailable. Please try again shortly.",
        },
        result: null,
      };
    }

    console.error("[discovery] search failed:", err);
    return {
      error: { code: "UNKNOWN", message: "Something went wrong while searching. Please try again." },
      result: null,
    };
  }
}

/**
 * Saves a discovered lead into the existing Prospects system without leaving
 * the Find Matching Leads page. Organization ownership comes from the session;
 * duplicates are prevented via domain or normalized company name.
 */
export async function saveDiscoveredProspectAction(
  input: { lead: NormalizedLead }
): Promise<{
  error: string | null;
  status: "saved" | "already-saved" | "failed";
  prospectId?: string;
}> {
  const session = await resolveSession();
  if (!session.ok) return { error: session.error.message, status: "failed" };

  const { organizationId } = session;
  const supabase = await createClient();
  const lead = input.lead;

  const companyName = lead.companyName?.trim() || lead.personName?.trim() || "";
  if (!companyName) {
    return { error: "This lead has no company or person name to save.", status: "failed" };
  }

  // Normalize the domain once — lowercase, no protocol/path — so application
  // checks and the database unique index always agree on identity.
  const domain = lead.companyDomain
    ? lead.companyDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    : null;

  // ---- Duplicate prevention --------------------------------------------------
  // Prefer a stable provider ID, then domain, then exact company-name match.
  // The database ALSO enforces (organization_id, lower(domain)) and
  // (organization_id, provider_lead_id) uniqueness, so races between repeated
  // Save clicks can never create duplicates even if these checks pass.
  if (lead.providerLeadId) {
    const { data: byProviderId } = await supabase
      .from("prospects")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("provider_lead_id", lead.providerLeadId)
      .limit(1);
    if (byProviderId && byProviderId.length > 0) {
      return { error: null, status: "already-saved", prospectId: byProviderId[0].id as string };
    }
  }

  if (domain) {
    const { data: byDomain } = await supabase
      .from("prospects")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("domain", domain)
      .limit(1);
    if (byDomain && byDomain.length > 0) {
      return { error: null, status: "already-saved", prospectId: byDomain[0].id as string };
    }
  }

  const escaped = companyName.replace(/[%_\\]/g, "");
  if (escaped) {
    const { data: byName } = await supabase
      .from("prospects")
      .select("id")
      .eq("organization_id", organizationId)
      .ilike("company_name", escaped)
      .limit(1);
    if (byName && byName.length > 0) {
      return { error: null, status: "already-saved", prospectId: byName[0].id as string };
    }
  }

  // ---- Insert through the existing prospects architecture ----------------------
  try {
    const prospect = await createProspect({
      organization_id: organizationId,
      name: lead.personName?.trim() || companyName,
      company_name: companyName,
      website: domain ? `https://${domain}` : null,
      domain,
      industry: lead.industry,
      description: null,
      country: lead.location,
      city: null,
      employee_count: lead.employeeCount,
      source: "discovery",
      provider_lead_id: lead.providerLeadId,
    });

    if (!prospect) {
      // The insert may have lost a race against a concurrent save of the same
      // lead (unique index). Re-check before reporting a failure so repeated
      // Save clicks stay idempotent.
      const existing = domain
        ? await supabase
            .from("prospects")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("domain", domain)
            .limit(1)
        : null;
      if (existing && existing.data && existing.data.length > 0) {
        return { error: null, status: "already-saved", prospectId: existing.data[0].id as string };
      }
      return { error: "Could not save this prospect. Please try again.", status: "failed" };
    }

    return { error: null, status: "saved", prospectId: prospect.id };
  } catch (err) {
    console.error(
      "[discovery] save prospect failed:",
      err instanceof Error ? err.message : "unknown error"
    );
    return { error: "Could not save this prospect. Please try again.", status: "failed" };
  }
}
