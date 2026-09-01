// ============================================================================
// Prosventa Data Quality Layer — Source Priority & Conflict Resolution
// Stage 6 - Phase 4: Data Normalization, Verification & Quality Engine
// ============================================================================
// Establishes a clear source precedence model:
//
//   Customer-confirmed > Verified provider > Provider-derived
//        > Prosventa-derived > Unknown
//
// Conflicting values are DETECTED and surfaced — never silently destroyed.
// Customer-entered data is protected: a provider value never overwrites it.
// Provenance (source + retrieval time + origin kind) is preserved with the
// winning value. No giant version-control system — one preferred value plus
// its provenance, and an explicit conflict record when sources disagree.
// ============================================================================

/** Origin of a value — how much trust Prosventa places in it. */
export type ValueOrigin =
  | "customer_confirmed" // entered/confirmed by the customer
  | "provider_verified" // returned directly by an enrichment provider
  | "provider_derived" // derived by a provider from other provider data
  | "prosventa_derived" // computed by Prosventa (e.g. title→seniority)
  | "unknown";

const ORIGIN_PRIORITY: Record<ValueOrigin, number> = {
  customer_confirmed: 5,
  provider_verified: 4,
  provider_derived: 3,
  prosventa_derived: 2,
  unknown: 1,
};

export interface SourcedValue<T = string> {
  value: T | null;
  origin: ValueOrigin;
  /** Provider/system that produced the value */
  source: string;
  /** When this specific value was retrieved */
  retrievedAt: string | null;
}

export interface ConflictResolution<T = string> {
  /** The winning value under source-priority rules */
  preferred: SourcedValue<T>;
  /** The losing value — retained, not destroyed */
  alternative: SourcedValue<T> | null;
  /** True when the two values genuinely conflict */
  conflicted: boolean;
  /** True when the customer's value won (protection rule held) */
  customerProtected: boolean;
}

/**
 * Resolves two sourced values for the same field.
 * Higher-trust origin wins. Equal origins → the more recently retrieved
 * value wins (fresh data is preferred within the same trust tier).
 * Ties on both → existing (first) value wins; nothing is silently lost
 * because the alternative is always retained in the result.
 */
export function resolveConflict<T extends string | number>(
  existing: SourcedValue<T>,
  incoming: SourcedValue<T>
): ConflictResolution<T> {
  const bothNull = existing.value === null && incoming.value === null;
  const equalValues =
    !bothNull && existing.value !== null && incoming.value !== null &&
    String(existing.value) === String(incoming.value);

  const existingRank = ORIGIN_PRIORITY[existing.origin];
  const incomingRank = ORIGIN_PRIORITY[incoming.origin];

  let incomingWins = false;
  if (existing.value === null) incomingWins = true;
  else if (incoming.value === null) incomingWins = false;
  else if (incomingRank > existingRank) incomingWins = true;
  else if (incomingRank < existingRank) incomingWins = false;
  else {
    // Same trust tier → fresher wins; exact tie keeps the existing value.
    if (incoming.retrievedAt && existing.retrievedAt) {
      incomingWins =
        new Date(incoming.retrievedAt).getTime() >
        new Date(existing.retrievedAt).getTime();
    } else if (incoming.retrievedAt && !existing.retrievedAt) {
      incomingWins = true;
    }
  }

  return {
    preferred: incomingWins ? incoming : existing,
    alternative: incomingWins ? existing : incoming,
    conflicted: !bothNull && !equalValues,
    customerProtected:
      existing.value !== null &&
      existing.origin === "customer_confirmed" &&
      incomingRank <= existingRank,
  };
}

// ---------------------------------------------------------------------------
// Record-level conflict detection
// ---------------------------------------------------------------------------

export interface FieldConflict {
  field: string;
  customerValue: string | null;
  providerValue: string | null;
}

/**
 * Detects conflicts between customer-entered prospect fields and normalized
 * provider enrichment. Only compares fields that exist on BOTH sides —
 * missing values are not conflicts. Customer-entered values are NEVER
 * overwritten here; conflicts are reported for review instead.
 */
export function detectCustomerProviderConflicts(
  customer: Record<string, unknown>,
  provider: Record<string, unknown>,
  fields: string[] = [
    "companyName",
    "industry",
    "country",
    "city",
    "employeeCount",
    "jobTitle",
    "location",
  ]
): FieldConflict[] {
  const conflicts: FieldConflict[] = [];
  for (const field of fields) {
    const cRaw = customer[field];
    const pRaw = provider[field];
    if (cRaw == null || pRaw == null) continue;

    const cValue = typeof cRaw === "string" ? cRaw.trim() : String(cRaw);
    const pValue = typeof pRaw === "string" ? pRaw.trim() : String(pRaw);
    if (cValue.length === 0 || pValue.length === 0) continue;

    // Numeric comparison tolerance ("250" vs 250 is NOT a conflict).
    const cNum = Number(cValue);
    const pNum = Number(pValue);
    if (!Number.isNaN(cNum) && !Number.isNaN(pNum)) {
      if (cNum === pNum) continue;
      conflicts.push({ field, customerValue: cValue, providerValue: pValue });
      continue;
    }

    if (cValue.toLowerCase() !== pValue.toLowerCase()) {
      conflicts.push({ field, customerValue: cValue, providerValue: pValue });
    }
  }
  return conflicts;
}
