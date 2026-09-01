// ============================================================================
// Prosventa Data Quality Layer — Deduplication & Safe Merge Planning
// Stage 6 - Phase 4: Data Normalization, Verification & Quality Engine
// ============================================================================
// Duplicate DETECTION for companies and people, plus a SAFE MERGE PLAN that
// never deletes records. When the existing schema cannot safely merge
// automatically, the plan flags the conflict for review instead of merging.
//
// Matching rules:
//   Companies: provider ID > internal id > canonical domain > identity key.
//     Name alone is a WEAK signal — it only ever suggests a candidate.
//   People: provider person ID > internal prospect id > verified work email
//     > name+company-domain combination. Names alone NEVER merge people.
// ============================================================================

import { normalizeDomain } from "../domain";
import { companyNameIdentityKey } from "./values";

export type MatchStrength = "exact" | "strong" | "weak" | "none";

export interface CompanyIdentity {
  providerCompanyId: string | null;
  canonicalDomain: string | null;
  /** Existing internal company/prospect identifier */
  internalId: string | null;
  normalizedName: string | null;
}

/**
 * Compares two company identities. Returns the strongest match found and the
 * evidence used. "weak" matches must never auto-merge — they are review-only.
 */
export function compareCompanyIdentity(
  a: CompanyIdentity,
  b: CompanyIdentity
): { strength: MatchStrength; evidence: string } {
  if (
    a.providerCompanyId && b.providerCompanyId &&
    a.providerCompanyId === b.providerCompanyId
  ) {
    return { strength: "exact", evidence: `provider company id ${a.providerCompanyId}` };
  }
  if (a.internalId && b.internalId && a.internalId === b.internalId) {
    return { strength: "exact", evidence: "existing internal company id" };
  }
  if (a.canonicalDomain && b.canonicalDomain && a.canonicalDomain === b.canonicalDomain) {
    return { strength: "strong", evidence: `canonical domain ${a.canonicalDomain}` };
  }
  if (a.normalizedName && b.normalizedName && a.normalizedName === b.normalizedName) {
    return { strength: "weak", evidence: `normalized name "${a.normalizedName}"` };
  }
  return { strength: "none", evidence: "no matching signals" };
}

/** Convenience: build an identity from loose provider-style fields. */
export function buildCompanyIdentity(input: {
  providerCompanyId?: unknown;
  domain?: unknown;
  website?: unknown;
  companyName?: unknown;
  internalId?: unknown;
}): CompanyIdentity {
  const rawDomain =
    typeof input.domain === "string"
      ? input.domain
      : typeof input.website === "string"
        ? input.website
        : null;
  return {
    providerCompanyId:
      typeof input.providerCompanyId === "string" && input.providerCompanyId.trim()
        ? input.providerCompanyId.trim()
        : null,
    canonicalDomain: normalizeDomain(rawDomain),
    internalId:
      typeof input.internalId === "string" && input.internalId.trim()
        ? input.internalId.trim()
        : null,
    normalizedName: companyNameIdentityKey(
      typeof input.companyName === "string" ? input.companyName : null
    ),
  };
}

// ---------------------------------------------------------------------------
// Person deduplication
// ---------------------------------------------------------------------------

export interface PersonIdentity {
  providerPersonId: string | null;
  internalProspectId: string | null;
  /** Verified work email — format-validated only; verification status separate */
  verifiedEmail: string | null;
  fullNameKey: string | null;
  companyDomain: string | null;
}

function nameKey(name: string | null): string | null {
  if (!name) return null;
  const key = name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return key.length > 0 ? key : null;
}

/**
 * Compares two person identities. People are only matched on STRONG
 * identifiers. Same name + same company domain is "strong"; names across
 * companies NEVER match.
 */
export function comparePersonIdentity(
  a: PersonIdentity,
  b: PersonIdentity
): { strength: MatchStrength; evidence: string } {
  if (
    a.providerPersonId && b.providerPersonId &&
    a.providerPersonId === b.providerPersonId
  ) {
    return { strength: "exact", evidence: `provider person id ${a.providerPersonId}` };
  }
  if (
    a.internalProspectId && b.internalProspectId &&
    a.internalProspectId === b.internalProspectId
  ) {
    return { strength: "exact", evidence: "internal prospect id" };
  }
  if (
    a.verifiedEmail && b.verifiedEmail &&
    a.verifiedEmail.toLowerCase() === b.verifiedEmail.toLowerCase()
  ) {
    return { strength: "strong", evidence: "matching verified work email" };
  }
  const aName = nameKey(a.fullNameKey);
  const bName = nameKey(b.fullNameKey);
  if (
    aName && bName && aName === bName &&
    a.companyDomain && b.companyDomain &&
    a.companyDomain === b.companyDomain
  ) {
    return {
      strength: "strong",
      evidence: `same name at same company domain ${a.companyDomain}`,
    };
  }
  return { strength: "none", evidence: "no qualifying matching signals" };
}

// ---------------------------------------------------------------------------
// Safe merge planning
// ---------------------------------------------------------------------------

/** A single field-level merge decision inside a safe merge plan. */
export interface FieldMergeDecision {
  field: string;
  winner: "primary" | "duplicate" | "conflict";
  value: string | number | boolean | null;
  reason: string;
}

export interface SafeMergePlan<TRecord> {
  /** Whether an automatic merge is SAFE under the current schema rules */
  canAutoMerge: boolean;
  /** Human-readable reasons when automatic merge is not safe */
  blockers: string[];
  /** Field-level decisions (customer values always outrank provider values) */
  decisions: FieldMergeDecision[];
  /** The surviving record reference — never deleted, only updated in place */
  primaryRef: TRecord;
  /** The duplicate record reference — flagged, NEVER deleted automatically */
  duplicateRef: TRecord;
}

/**
 * Builds a safe merge plan between a PRIMARY record and a detected DUPLICATE.
 *
 * Safety rules:
 *   - Customer-entered fields always win over provider fields.
 *   - Provider provenance/timestamps on the primary are preserved.
 *   - Weak ("name-only") matches are never auto-merged.
 *   - Conflicting customer-entered values block auto-merge entirely.
 */
export function buildSafeMergePlan<TRecord>(
  primary: TRecord,
  duplicate: TRecord,
  match: { strength: MatchStrength; evidence: string },
  fields: Array<{
    field: string;
    primaryValue: unknown;
    duplicateValue: unknown;
    primaryIsCustomer: boolean;
    duplicateIsCustomer: boolean;
  }>
): SafeMergePlan<TRecord> {
  const blockers: string[] = [];
  if (match.strength === "none" || match.strength === "weak") {
    blockers.push(`Match too weak to auto-merge (${match.evidence}).`);
  }

  const decisions: FieldMergeDecision[] = [];
  let hasCustomerConflict = false;

  for (const f of fields) {
    if (f.primaryValue != null && f.duplicateValue != null) {
      const same =
        String(f.primaryValue).toLowerCase() === String(f.duplicateValue).toLowerCase();
      if (same) {
        decisions.push({ field: f.field, winner: "primary", value: f.primaryValue as string, reason: "Values identical." });
      } else if (f.primaryIsCustomer && f.duplicateIsCustomer) {
        hasCustomerConflict = true;
        decisions.push({ field: f.field, winner: "conflict", value: null, reason: "Conflicting customer-entered values require review." });
      } else {
        decisions.push({ field: f.field, winner: "primary", value: f.primaryValue as string, reason: "Primary value retained under source priority; alternative preserved in plan." });
      }
      continue;
    }
    // Only one side has a value → fill the gap from whichever exists.
    decisions.push({
      field: f.field,
      winner: f.primaryValue == null ? "duplicate" : "primary",
      value: (f.primaryValue ?? f.duplicateValue) as string,
      reason: "Gap filled from the non-null side.",
    });
  }

  if (hasCustomerConflict) {
    blockers.push("Conflicting customer-entered values detected — manual review required.");
  }

  return { canAutoMerge: blockers.length === 0, blockers, decisions, primaryRef: primary, duplicateRef: duplicate };
}

