// ============================================================================
// Prosventa Enrichment — Single-Prospect Server Boundary
// Feature 2: Enrichment - Phase 2 of 4
// ============================================================================
// The ONLY client entry point for single-prospect enrichment. Thin by design:
//
//   - Overview reads reuse the Phase-1 stored records via the existing
//     intelligence getters — NEVER a provider call.
//   - The actual enrichment runs through the Phase-1 `enrichProspect` facade
//     (session-scoped authorization, freshness, idempotency, provider
//     registry). No provider calls ever originate from the browser.
//   - Credits are NOT charged here; usage is recorded by the underlying
//     services (Phase 3 wires deeper credit integration).
//
// Raw errors never reach the UI: failures return concise, safe messages and
// existing prospect data is never modified or destroyed on any outcome.
// ============================================================================

"use server";

import { createClient } from "@/lib/supabase/server";
import { enrichProspect } from "./service";
import { mergeEnrichmentResponses } from "./display";
import { getPersonEnrichmentForProspect } from "@/features/intelligence/person-enrichment/service";
import { getCompanyEnrichmentForProspect } from "@/features/intelligence/company-enrichment/service";
import type { NormalizedEnrichmentResponse } from "./types";

// ----------------------------------------------------------------------------
// Client-safe shapes (plain JSON only)
// ----------------------------------------------------------------------------

/** Stored enrichment provenance for one operation (person or company). */
export interface StoredEnrichmentInfo {
  status: string | null;
  provider: string | null;
  /** ISO timestamp of the last successful retrieval. */
  enrichedAt: string | null;
}

export interface EnrichOverviewTarget {
  id: string;
  name: string | null;
  companyName: string | null;
  location: string | null;
  industry: string | null;
  employeeCount: number | null;
  domain: string | null;
  website: string | null;
}

/**
 * What the window shows BEFORE running anything: current prospect info plus
 * any stored enrichment provenance. Loaded without calling providers.
 */
export interface EnrichProspectOverview {
  ok: boolean;
  message: string | null;
  prospect: EnrichOverviewTarget | null;
  person: StoredEnrichmentInfo | null;
  company: StoredEnrichmentInfo | null;
}

export type SingleEnrichmentOutcomeStatus =
  | "completed"
  | "partial"
  | "empty"
  | "failed"
  | "used_cached"
  | "already_in_progress";

/** Result of one user-initiated "Enrich Prospect" action. */
export interface SingleEnrichmentResult {
  status: SingleEnrichmentOutcomeStatus;
  message: string;
  provider: string | null;
  /** Merged person+company normalized response (plain JSON). */
  response: NormalizedEnrichmentResponse | null;
}

function toStoredInfo(record: {
  status: string | null;
  provider: string | null;
  enriched_at: string | null;
} | null): StoredEnrichmentInfo | null {
  if (!record) return null;
  return {
    status: record.status ?? null,
    provider: record.provider ?? null,
    enrichedAt: record.enriched_at ?? null,
  };
}

/**
 * Loads everything the enrichment window needs before starting: the owned
 * prospect's current information and any EXISTING stored enrichment. This is
 * read-only — opening the window never triggers a provider request.
 */
export async function getEnrichProspectOverview(
  prospectId: string
): Promise<EnrichProspectOverview> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Please sign in to enrich prospects.", prospect: null, person: null, company: null };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();
  if (!membership) {
    return { ok: false, message: "You are not part of an organization.", prospect: null, person: null, company: null };
  }

  // Explicit org filter + RLS — defense in depth, same as the service layer.
  const { data: row } = await supabase
    .from("prospects")
    .select(
      "id, name, contact_name, company_name, location, city, country, industry, employee_count, domain, website"
    )
    .eq("id", prospectId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (!row) {
    return {
      ok: false,
      message: "Prospect not found in your organization.",
      prospect: null,
      person: null,
      company: null,
    };
  }

  const r = row as Record<string, unknown>;
  const str = (v: unknown): string | null => {
    const s = typeof v === "string" ? v.trim() : "";
    return s.length > 0 ? s : null;
  };

  const city = str(r.city);
  const country = str(r.country);
  const location =
    str(r.location) ?? ([city, country].filter(Boolean).join(", ") || null);

  // Existing stored enrichment — read-only getters, no provider calls.
  const [personRecord, companyRecord] = await Promise.all([
    getPersonEnrichmentForProspect(prospectId).then(toStoredInfo).catch(() => null),
    getCompanyEnrichmentForProspect(prospectId).then(toStoredInfo).catch(() => null),
  ]);

  return {
    ok: true,
    message: null,
    prospect: {
      id: r.id as string,
      name: str(r.contact_name) ?? str(r.name),
      companyName: str(r.company_name),
      location,
      industry: str(r.industry),
      employeeCount: typeof r.employee_count === "number" ? r.employee_count : null,
      domain: str(r.domain),
      website: str(r.website),
    },
    person: personRecord,
    company: companyRecord,
  };
}

// ----------------------------------------------------------------------------
// Enrichment run
// ----------------------------------------------------------------------------

function responseHasAnyField(response: NormalizedEnrichmentResponse | null): boolean {
  if (!response) return false;
  const s = response;
  return Boolean(
    s.person.fullName ||
      s.person.jobTitle ||
      s.person.seniority ||
      s.person.profileUrl ||
      s.person.location ||
      s.contact.email ||
      s.contact.phone ||
      s.company.name ||
      s.company.domain ||
      s.company.industry ||
      s.company.employeeCount != null ||
      s.company.location ||
      s.company.description ||
      s.company.website ||
      s.technology.technologies.length > 0
  );
}

/**
 * Runs ONE user-initiated single-prospect enrichment through the Phase-1
 * facade: person/contact and company, both through the existing hardened
 * services (freshness, idempotency, usage recording, provider registry).
 *
 * Data safety: this NEVER modifies or deletes existing prospect fields —
 * persistence happens inside the existing enrichment stores, which are kept
 * separate from the prospects table by design.
 */
export async function runSingleProspectEnrichment(
  prospectId: string
): Promise<SingleEnrichmentResult> {
  const [person, company] = await Promise.all([
    enrichProspect({ prospectId, operation: "prospect_enrichment" }),
    enrichProspect({ prospectId, operation: "company_enrichment" }),
  ]);

  const failed = (message: string): SingleEnrichmentResult => ({
    status: "failed",
    message:
      message || "Enrichment could not be completed. Please try again.",
    provider: null,
    response: null,
  });

  const personHasData = responseHasAnyField(person.response);
  const companyHasData = responseHasAnyField(company.response);

  // Both legs returned nothing usable.
  if (!personHasData && !companyHasData) {
    if (
      person.status === "already_in_progress" ||
      company.status === "already_in_progress"
    ) {
      return {
        status: "already_in_progress",
        message: "An enrichment for this prospect is already running.",
        provider: person.provider ?? company.provider ?? null,
        response: null,
      };
    }
    // A genuine hard failure (auth, rate limit, provider down) vs an honest
    // "the provider simply has nothing on this prospect".
    if (person.status === "failed" && company.status === "failed") {
      return failed(person.message || company.message);
    }
    return {
      status: "empty",
      message: "No additional information was found for this prospect.",
      provider: person.provider ?? company.provider ?? null,
      response: null,
    };
  }

  const response = mergeEnrichmentResponses(person.response, company.response);
  if (!response) {
    return failed("Enrichment could not be completed. Please try again.");
  }

  const anyFailed =
    person.status === "failed" || company.status === "failed";
  const anyCached =
    person.status === "used_cached" || company.status === "used_cached";
  const anyInProgress =
    person.status === "already_in_progress" ||
    company.status === "already_in_progress";

  let status: SingleEnrichmentOutcomeStatus;
  let message: string;
  if (anyFailed) {
    // One leg succeeded — show what was found rather than declaring total loss.
    status = "partial";
    message = "Enrichment completed with limited data.";
  } else if (anyInProgress) {
    status = "already_in_progress";
    message = "An enrichment for this prospect is already running.";
  } else if (anyCached) {
    status = "used_cached";
    message = "Showing recent enrichment data.";
  } else {
    const warnings = [...person.warnings, ...company.warnings];
    const partial =
      person.status === "partial" ||
      company.status === "partial" ||
      warnings.length > 0;
    status = partial ? "partial" : "completed";
    message = partial
      ? "Enrichment completed with limited data."
      : "Prospect enriched.";
  }

  return {
    status,
    message,
    provider: person.provider ?? company.provider ?? null,
    response,
  };
}

