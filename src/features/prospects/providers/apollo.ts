// ============================================================================
// Prosventa Apollo-compatible Lead Provider (server-only)
// Stage 2 — Phase 8: Real Lead Discovery
// ============================================================================
// Concrete LeadDiscoveryProvider implementation for Apollo.io-compatible
// people search APIs. Runs exclusively on the server:
//
//   - API key read from LEAD_PROVIDER_APOLLO_API_KEY (never NEXT_PUBLIC_*)
//   - Normalized request → provider request translation happens here
//   - Raw provider records → NormalizedLead normalization happens here
//   - Errors mapped to structured DiscoveryError codes (no raw leaks)
//
// When no API key is configured the provider reports PROVIDER_NOT_CONFIGURED
// so the UI can show a clear setup state — no fake lead data is ever used.
// ============================================================================

import {
  DiscoveryError,
  type LeadSearchPage,
  type LeadSearchRequest,
  type NormalizedLead,
} from "@/features/prospects/types/discovery";
import type { LeadDiscoveryProvider, ProviderConfig } from "./types";

export const APOLLO_PROVIDER_ID = "apollo";

const API_URL = "https://api.apollo.io/v1/mixed_people/search";
const REQUEST_TIMEOUT_MS = 15_000;
/** Provider caps page_size at 100; we stay conservative. */
const MAX_PAGE_SIZE = 25;

const APOLLO_CONFIG: ProviderConfig = {
  id: APOLLO_PROVIDER_ID,
  name: "Apollo",
  description: "B2B contact and company database for lead discovery.",
  requiresApiKey: true,
  enabled: true,
};

function getApiKey(): string | null {
  const key = process.env.LEAD_PROVIDER_APOLLO_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

/** "201-500" → [200, 500] in the provider's inclusive employee-range format. */
function parseCompanySizeRange(size: string): [number, number] | null {
  const match = /^(\d+)\s*[-–+]?\s*(\d*)$/.exec(size.trim());
  if (!match) return null;
  const min = Math.max(1, parseInt(match[1], 10) - 1);
  const max = match[2] ? parseInt(match[2], 10) : 100_000;
  return [min, max];
}

interface ApolloPersonShape {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  email?: string | null;
  email_status?: string | null;
  linkedin_url?: string | null;
  organization?: {
    id?: string;
    name?: string | null;
    website_url?: string | null;
    primary_domain?: string | null;
    industry?: string | null;
    estimated_num_employees?: number | null;
    country?: string | null;
    city?: string | null;
    locality?: string | null;
  } | null;
}

/** Builds a location string from available pieces, skipping empty parts. */
function buildLocation(
  city: string | null | undefined,
  country: string | null | undefined
): string | null {
  const parts = [city, country]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function normalizePerson(raw: ApolloPersonShape): NormalizedLead | null {
  const org = raw.organization ?? {};
  const personName =
    (typeof raw.name === "string" && raw.name.trim()) ||
    [raw.first_name, raw.last_name]
      .filter((p) => typeof p === "string" && p.trim().length > 0)
      .join(" ")
      .trim() ||
    null;
  const companyName = typeof org.name === "string" && org.name.trim() ? org.name.trim() : null;

  // A result must reference at least a company or a person to be useful.
  if (!personName && !companyName) return null;

  // Contact details are only surfaced when the provider contractually
  // exposes them; otherwise the field stays null and the UI falls back
  // gracefully instead of rendering raw provider values.
  const emailExposed =
    typeof raw.email === "string" &&
    raw.email.includes("@") &&
    (raw.email_status == null ||
      ["verified", "guessed", "unverified"].includes(raw.email_status));

  const domainFromWebsite =
    typeof org.website_url === "string" && org.website_url.trim()
      ? org.website_url.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
      : "";

  return {
    providerLeadId:
      (typeof raw.id === "string" && raw.id) ||
      (typeof org.id === "string" ? `org:${org.id}` : null),
    personName,
    jobTitle: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : null,
    companyName,
    companyDomain:
      (typeof org.primary_domain === "string" && org.primary_domain.trim()) || domainFromWebsite || null,
    location: buildLocation(org.locality ?? org.city, org.country),
    industry: typeof org.industry === "string" && org.industry.trim() ? org.industry.trim() : null,
    companySize: null,
    employeeCount:
      typeof org.estimated_num_employees === "number" &&
      Number.isFinite(org.estimated_num_employees)
        ? org.estimated_num_employees
        : null,
    profileUrl: null,
    linkedinUrl:
      typeof raw.linkedin_url === "string" && raw.linkedin_url.startsWith("http")
        ? raw.linkedin_url
        : null,
    contactEmail: emailExposed ? raw.email! : null,
    source: APOLLO_PROVIDER_ID,
  };
}

export class ApolloLeadProvider implements LeadDiscoveryProvider {
  getConfig(): ProviderConfig {
    return { ...APOLLO_CONFIG };
  }

  async searchLeads(request: LeadSearchRequest): Promise<LeadSearchPage> {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new DiscoveryError("PROVIDER_NOT_CONFIGURED");
    }

    // ---- Translate normalized request → provider format --------------------
    const body: Record<string, unknown> = {
      api_key: apiKey,
      page: this.cursorToPage(request.cursor),
      per_page: Math.min(Math.max(request.limit ?? MAX_PAGE_SIZE, 1), MAX_PAGE_SIZE),
    };

    if (request.query?.trim()) body.q_keywords = request.query.trim();
    if (request.jobTitles?.length) body.person_titles = request.jobTitles.slice(0, 5);
    if (request.locations?.length) body.person_locations = request.locations.slice(0, 10);

    const ranges = (request.companySize ? [parseCompanySizeRange(request.companySize)] : []).filter(
      (r): r is [number, number] => r !== null
    );
    if (ranges.length > 0) {
      body.organization_num_employees_ranges = ranges.map(([min, max]) => [min, max]);
    }

    // ---- Execute with timeout -----------------------------------------------
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new DiscoveryError("TIMEOUT");
      }
      throw new DiscoveryError("PROVIDER_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }

    // ---- Map status codes to structured errors ------------------------------
    if (response.status === 401 || response.status === 403) {
      throw new DiscoveryError("AUTH_FAILED");
    }
    if (response.status === 429) {
      throw new DiscoveryError("RATE_LIMITED");
    }
    if (!response.ok) {
      throw new DiscoveryError("UPSTREAM_ERROR");
    }

    let payload: {
      people?: ApolloPersonShape[];
      pagination?: { page?: number; per_page?: number; total_entries?: number };
      transaction_id?: string;
    };
    try {
      payload = await response.json();
    } catch {
      throw new DiscoveryError("UPSTREAM_ERROR");
    }

    const leads: NormalizedLead[] = [];
    for (const raw of payload.people ?? []) {
      const normalized = normalizePerson(raw);
      if (normalized) leads.push(normalized);
    }

    const page = payload.pagination?.page ?? 1;
    const totalEntries =
      typeof payload.pagination?.total_entries === "number" ? payload.pagination.total_entries : null;
    const perPage = payload.pagination?.per_page ?? MAX_PAGE_SIZE;
    const hasMore =
      totalEntries != null ? page * perPage < totalEntries : leads.length >= MAX_PAGE_SIZE;

    return {
      leads,
      nextCursor: hasMore ? String(page + 1) : null,
      total: totalEntries,
      providerRequestId: typeof payload.transaction_id === "string" ? payload.transaction_id : null,
    };
  }

  private cursorToPage(cursor: string | null | undefined): number {
    if (!cursor) return 1;
    const parsed = parseInt(cursor, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }
}
