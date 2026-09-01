// ============================================================================
// Prosventa Data Quality Layer — Person Normalization
// Stage 6 - Phase 4: Data Normalization, Verification & Quality Engine
// ============================================================================
// Normalizes person data (names, titles, seniority) into Prosventa's internal
// vocabulary WITHOUT destroying legitimate naming structures or replacing the
// provider's original title. The original title remains the person's actual
// information; category/seniority are ADDITIONAL normalized views.
//
// Seniority inference from a title is always marked as DERIVED — it never
// overwrites verified provider seniority.
// ============================================================================

import type { ProspectEnrichmentResult } from "../types";
import { cleanValue, isValidEmail, isValidHttpUrl } from "./values";

// ---------------------------------------------------------------------------
// Job-title categories (normalized view; the original title is preserved)
// ---------------------------------------------------------------------------
export type JobTitleCategory =
  | "executive"
  | "engineering"
  | "sales"
  | "marketing"
  | "finance"
  | "operations"
  | "product"
  | "hr"
  | "other"
  | "unknown";

const TITLE_CATEGORY_MARKERS: Array<[JobTitleCategory, string[]]> = [
  ["executive", ["ceo", "cto", "cfo", "coo", "cmo", "cro", "cio", "chief", "president", "founder", "owner", "managing director"]],
  ["engineering", ["engineer", "developer", "architect", "devops", "sre", "engineering", "software", "data scientist", "qa"]],
  ["sales", ["sales", "account executive", "account manager", "business development", "revenue", "sdr", "bdr"]],
  ["marketing", ["marketing", "growth", "brand", "content", "seo", "communications"]],
  ["finance", ["finance", "financial", "controller", "accounting", "treasurer"]],
  ["operations", ["operations", "supply chain", "logistics", "procurement", "facilities"]],
  ["product", ["product manager", "product owner", "product design", "ux", "ui design", "product"]],
  ["hr", ["human resources", " hr", "people operations", "recruiter", "talent", "people partner"]],
];

function includesMarker(haystack: string, marker: string): boolean {
  // Word-boundary match so "director" doesn't match "cto"/"cio"-style
  // substrings while multi-word phrases still work.
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}])${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`,
    "u"
  );
  return pattern.test(haystack);
}

/** Categorizes a job title deterministically. "unknown" when no title exists. */
export function categorizeJobTitle(title: string | null | undefined): JobTitleCategory {
  const cleaned = cleanValue(title);
  if (!cleaned) return "unknown";
  const t = cleaned.toLowerCase();
  for (const [category, markers] of TITLE_CATEGORY_MARKERS) {
    for (const marker of markers) {
      if (includesMarker(t, marker.toLowerCase())) return category;
    }
  }
  return "other";
}

// ---------------------------------------------------------------------------
// Seniority vocabulary (consistent internal representation)
// ---------------------------------------------------------------------------
export type SeniorityLevel =
  | "founder_owner"
  | "c_level"
  | "vp"
  | "director"
  | "manager"
  | "individual_contributor"
  | "unknown";

const SENIORITY_ALIASES: Array<[SeniorityLevel, string[]]> = [
  ["founder_owner", ["founder", "owner", "co-founder", "cofounder", "proprietor"]],
  // VP checked BEFORE c_level: "vice president" contains the whole word
  // "president" and must resolve to vp, not c_level.
  ["vp", ["vp", "vice president", "svp", "evp"]],
  ["c_level", ["c-level", "c level", "cxo", "chief", "ceo", "cto", "cfo", "coo", "cmo", "cro", "cio", "president", "executive"]],
  ["director", ["director", "head of"]],
  ["manager", ["manager", "team lead", "lead", "supervisor"]],
  ["individual_contributor", ["individual contributor", "ic", "specialist", "associate", "analyst", "engineer", "coordinator", "representative", "intern"]],
];

/**
 * Maps a provider-supplied seniority value into the internal vocabulary.
 * Returns "unknown" when the value cannot be mapped. The ORIGINAL provider
 * value must still be stored alongside this normalization.
 */
export function normalizeSeniority(value: string | null | undefined): SeniorityLevel {
  const cleaned = cleanValue(value);
  if (!cleaned) return "unknown";
  const v = cleaned.toLowerCase().replace(/[_-]/g, " ").trim();
  // Word-boundary matching: "director" must not match "cto"/"cio"-style
  // markers, and "vice president" must not match "president" loosely.
  const matches = (alias: string): boolean => {
    const pattern = new RegExp(
      `(^|[^\\p{L}\\p{N}])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`,
      "u"
    );
    return pattern.test(v);
  };
  for (const [level, aliases] of SENIORITY_ALIASES) {
    if (aliases.some(matches)) return level;
  }
  return "unknown";
}

/**
 * Derives seniority FROM a job title. Always marked derived:true — callers
 * must not present this as verified provider data.
 */
export function deriveSeniorityFromTitle(
  title: string | null | undefined
): { level: SeniorityLevel; derived: boolean } {
  const cleaned = cleanValue(title);
  if (!cleaned) return { level: "unknown", derived: true };
  return { level: normalizeSeniority(cleaned), derived: true };
}

// ---------------------------------------------------------------------------
// Name handling — no assumption of "First Middle Last"
// ---------------------------------------------------------------------------
export interface NormalizedPersonName {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
}

/**
 * Normalizes person names conservatively:
 *   - If first/last are provided explicitly, they are used as-is.
 *   - If only a full name is provided, it is preserved intact. A split into
 *     first/last is only performed when the name has exactly two simple
 *     tokens — multi-token names are NEVER destructively split (protects
 *     "Mohammed van der Berg", "Dr. Li Wei", etc.).
 */
export function normalizePersonName(input: {
  firstName?: unknown;
  lastName?: unknown;
  fullName?: unknown;
  contactName?: unknown;
}): NormalizedPersonName {
  const first = cleanValue(input.firstName);
  const last = cleanValue(input.lastName);
  const full = cleanValue(input.fullName ?? input.contactName);

  if (first && last) {
    return { fullName: full ?? `${first} ${last}`, firstName: first, lastName: last };
  }
  if (first) return { fullName: full ?? first, firstName: first, lastName: last };
  if (last) return { fullName: full ?? last, firstName: first, lastName: last };
  if (!full) return { fullName: null, firstName: null, lastName: null };

  // Exactly two simple tokens → safe deterministic split.
  const tokens = full.split(" ");
  if (tokens.length === 2 && tokens.every((t) => /^[\p{L}][\p{L}'’.-]*$/u.test(t))) {
    return { fullName: full, firstName: tokens[0], lastName: tokens[1] };
  }

  // Otherwise keep the full name intact — do not guess.
  return { fullName: full, firstName: null, lastName: null };
}

// ---------------------------------------------------------------------------
// Full person payload normalization
// ---------------------------------------------------------------------------
export interface NormalizedPerson {
  data: ProspectEnrichmentResult;
  /** Provider person identifier when supplied and well-formed */
  providerPersonId: string | null;
  /** Title category (derived view; jobTitle itself is untouched) */
  titleCategory: JobTitleCategory;
  /** Internal seniority vocabulary value */
  seniorityNormalized: SeniorityLevel;
  /** True when seniority came from the PROVIDER; false when derived from title */
  seniorityFromProvider: boolean;
  /** Human-readable validation issues detected during normalization */
  validationIssues: string[];
}

function s(d: Record<string, unknown>, key: string): string | null {
  return cleanValue(d[key]);
}

/**
 * Normalizes an untrusted provider person payload into ProspectEnrichmentResult.
 * Placeholders are removed; malformed emails/URLs are rejected; the original
 * job title and provider seniority are preserved verbatim (cleaned only).
 */
export function normalizePersonPayload(raw: unknown): NormalizedPerson {
  const d =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const validationIssues: string[] = [];

  const name = normalizePersonName({
    firstName: d.firstName,
    lastName: d.lastName,
    fullName: d.contactName ?? d.fullName ?? d.name,
  });

  // Email: format-validated. Deliverability is NEVER claimed here.
  const emailRaw = s(d, "contactEmail") ?? s(d, "email");
  let contactEmail: string | null = null;
  if (emailRaw) {
    if (isValidEmail(emailRaw)) contactEmail = emailRaw.toLowerCase();
    else validationIssues.push(`Email "${emailRaw}" was malformed and was rejected.`);
  }

  // LinkedIn / profile URLs must be well-formed when supplied.
  const linkedinRaw = s(d, "linkedin") ?? s(d, "linkedinUrl");
  let linkedin: string | null = null;
  if (linkedinRaw) {
    linkedin = isValidHttpUrl(linkedinRaw)
      ? linkedinRaw
      : /^linkedin\.com\//i.test(linkedinRaw)
        ? `https://${linkedinRaw}`
        : null;
    if (!linkedin) validationIssues.push("LinkedIn URL was malformed and was rejected.");
  }

  const profileRaw = s(d, "profileUrl");
  const profileUrl = profileRaw ? (isValidHttpUrl(profileRaw) ? profileRaw : null) : null;

  const jobTitle = s(d, "jobTitle") ?? s(d, "title");

  // Seniority: prefer the provider's explicit value (verified). Only fall
  // back to title-derived classification when none was returned — marked
  // via seniorityFromProvider=false so consumers know it is derived.
  const providerSeniority = s(d, "seniority");
  const seniorityFromProvider = providerSeniority !== null;
  const seniorityNormalized = seniorityFromProvider
    ? normalizeSeniority(providerSeniority)
    : deriveSeniorityFromTitle(jobTitle).level;
  const department = s(d, "department");

  const domainRaw = (s(d, "companyDomain") ?? s(d, "domain"))?.toLowerCase() ?? null;

  const confidence =
    typeof d.confidence === "number" && Number.isFinite(d.confidence)
      ? Math.max(0, Math.min(100, Math.round(d.confidence)))
      : null;

  const idRaw = s(d, "providerPersonId") ?? s(d, "personId") ?? s(d, "id");

  const data: ProspectEnrichmentResult = {
    contactName: name.fullName,
    firstName: name.firstName,
    lastName: name.lastName,
    contactEmail,
    contactPhone: s(d, "contactPhone") ?? s(d, "phone"),
    jobTitle,
    seniority: providerSeniority,
    department,
    companyName: s(d, "companyName"),
    companyDomain: domainRaw,
    linkedin,
    profileUrl,
    location: s(d, "location"),
    country: s(d, "country"),
    city: s(d, "city"),
    summary: s(d, "summary"),
    confidence,
  };

  return {
    data,
    providerPersonId: idRaw,
    titleCategory: categorizeJobTitle(jobTitle),
    seniorityNormalized,
    seniorityFromProvider,
    validationIssues,
  };
}

