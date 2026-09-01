// ============================================================================
// Prosventa Enrichment — Response Normalization
// Feature 2: Enrichment - Phase 1 of 4
// ============================================================================
// Transforms an untrusted provider payload into the canonical
// NormalizedEnrichmentResponse. Rules:
//
//   - ONLY fields the provider legitimately returns are populated. Missing
//     information is null — never guessed, never fabricated.
//   - Unknown keys are dropped. Values are type-checked and trimmed.
//   - Emails must be email-shaped; domains are lowercased and stripped of
//     protocol/path; employee counts must be non-negative finite numbers.
// Pure module — unit-tested, no server dependencies.
// ============================================================================

import type {
  EnrichableField,
  NormalizedCompanySection,
  NormalizedContactSection,
  NormalizedEnrichmentMetadata,
  NormalizedEnrichmentResponse,
  NormalizedPersonSection,
  NormalizedTechnologySection,
} from "./types";
import { clampConfidence } from "@/features/intelligence/normalized";

// ----------------------------------------------------------------------------
// Safe scalar extraction
// ----------------------------------------------------------------------------

export function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanEmail(value: unknown): string | null {
  const raw = cleanString(value);
  if (!raw) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : null;
}

/** Lowercased domain with protocol / path / www stripped. Null when invalid. */
export function cleanDomain(value: unknown): string | null {
  const raw = cleanString(value);
  if (!raw) return null;
  let d = raw.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (d.startsWith("www.")) d = d.slice(4);
  // Must look like a hostname: at least one dot, no spaces.
  if (!d.includes(".") || /\s/.test(d)) return null;
  return d;
}

function cleanUrl(value: unknown): string | null {
  const raw = cleanString(value);
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : null;
}

function cleanCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value >= 0 ? Math.round(value) : null;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => cleanString(v))
    .filter((v): v is string => v !== null)
    .slice(0, 100); // bounded — never store unbounded provider payloads
}

// ----------------------------------------------------------------------------
// Payload → sections
// ----------------------------------------------------------------------------

export function normalizePersonSection(raw: Record<string, unknown>): NormalizedPersonSection {
  return {
    fullName: cleanString(raw.fullName) ?? cleanString(raw.contactName),
    jobTitle: cleanString(raw.jobTitle),
    seniority: cleanString(raw.seniority),
    profileUrl: cleanUrl(raw.profileUrl) ?? cleanUrl(raw.linkedin),
    location:
      cleanString(raw.location) ??
      ([cleanString(raw.city), cleanString(raw.country)].filter(Boolean).join(", ") || null),
  };
}

export function normalizeContactSection(raw: Record<string, unknown>): NormalizedContactSection {
  return {
    email: cleanEmail(raw.email ?? raw.contactEmail),
    phone: cleanString(raw.phone ?? raw.contactPhone),
  };
}

export function normalizeCompanySection(raw: Record<string, unknown>): NormalizedCompanySection {
  const domain = cleanDomain(raw.domain ?? raw.companyDomain);
  return {
    name: cleanString(raw.name) ?? cleanString(raw.companyName),
    domain,
    industry: cleanString(raw.industry),
    employeeCount: cleanCount(raw.employeeCount),
    location: cleanString(raw.location),
    description: cleanString(raw.description),
    website: cleanUrl(raw.website) ?? (domain ? `https://${domain}` : null),
  };
}

export function normalizeTechnologySection(
  raw: Record<string, unknown>
): NormalizedTechnologySection {
  return {
    technologies: cleanStringArray(raw.technologies ?? raw.tech),
  };
}

/**
 * Normalizes an untrusted provider payload into the canonical response.
 * Accepts either an already-sectioned payload ({ person: {...}, company: … })
 * or a flat payload mixing person/company/contact keys — both handled safely.
 */
export function normalizeEnrichmentPayload(
  raw: unknown,
  meta?: Partial<NormalizedEnrichmentMetadata>
): NormalizedEnrichmentResponse {
  const d = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const personSrc =
    typeof d.person === "object" && d.person !== null
      ? (d.person as Record<string, unknown>)
      : d;
  const contactSrc =
    typeof d.contact === "object" && d.contact !== null
      ? (d.contact as Record<string, unknown>)
      : d;
  const companySrc =
    typeof d.company === "object" && d.company !== null
      ? (d.company as Record<string, unknown>)
      : d;

  return {
    person: normalizePersonSection(personSrc),
    contact: normalizeContactSection(contactSrc),
    company: normalizeCompanySection(companySrc),
    technology: normalizeTechnologySection(d),
    metadata: {
      provider: meta?.provider ?? cleanString(d.provider) ?? "unknown",
      providerRecordId: cleanString(d.providerRecordId ?? d.providerPersonId),
      retrievedAt: meta?.retrievedAt ?? new Date().toISOString(),
      confidence:
        typeof d.confidence === "number" && Number.isFinite(d.confidence)
          ? clampConfidence(d.confidence)
          : (meta?.confidence ?? null),
      warnings: meta?.warnings ?? [],
    },
  };
}

// ----------------------------------------------------------------------------
// Field accounting — which requested fields were actually returned
// ----------------------------------------------------------------------------

const FIELD_PROBES: Readonly<
  Record<EnrichableField, (r: NormalizedEnrichmentResponse) => boolean>
> = {
  "person.fullName": (r) => r.person.fullName !== null,
  "person.jobTitle": (r) => r.person.jobTitle !== null,
  "person.seniority": (r) => r.person.seniority !== null,
  "person.profileUrl": (r) => r.person.profileUrl !== null,
  "person.location": (r) => r.person.location !== null,
  "contact.email": (r) => r.contact.email !== null,
  "contact.phone": (r) => r.contact.phone !== null,
  "company.name": (r) => r.company.name !== null,
  "company.domain": (r) => r.company.domain !== null,
  "company.industry": (r) => r.company.industry !== null,
  "company.employeeCount": (r) => r.company.employeeCount !== null,
  "company.location": (r) => r.company.location !== null,
  "company.description": (r) => r.company.description !== null,
  "company.website": (r) => r.company.website !== null,
};

/** Fields present in the normalized response (bounded to what was requested). */
export function collectReturnedFields(
  response: NormalizedEnrichmentResponse,
  requested?: EnrichableField[]
): EnrichableField[] {
  const scope =
    requested && requested.length > 0
      ? requested
      : (Object.keys(FIELD_PROBES) as EnrichableField[]);
  return scope.filter((field) => FIELD_PROBES[field](response));
}

/** True when at least one meaningful field was returned but gaps remain. */
export function isPartialResponse(response: NormalizedEnrichmentResponse): boolean {
  const returned = collectReturnedFields(response);
  return returned.length > 0 && returned.length < Object.keys(FIELD_PROBES).length;
}
