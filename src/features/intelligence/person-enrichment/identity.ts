// ============================================================================
// Prosventa Person Enrichment — Identity Resolution
// Stage 6 - Phase 3: People & Decision-Maker Intelligence
// ============================================================================
// Wraps the existing prospect-identity resolver (Stage 4) and enforces the
// Phase 3 identification rules:
//
//   - Prefer provider/person IDs and professional email, then LinkedIn URL,
//     then name + company domain.
//   - A name alone is NEVER enough to identify a person ("John Smith" is not
//     unique). Insufficient identity surfaces a controlled INSUFFICIENT_DATA
//     error instead of a risky lookup or merge.
//   - No automatic merging of people with common names.
// ============================================================================

import { IntelligenceError } from "../errors";
import {
  resolveProspectIdentity,
  identityToProviderInput,
} from "../prospect-identity";
import type { ProspectIdentity } from "../types";

export { resolveProspectIdentity, identityToProviderInput };
export type { ProspectIdentity };

/**
 * Resolves the strongest available identifier for a person and refuses to
 * continue when it is too weak. Name alone (without a company domain) is
 * rejected — dangerous lookups are never attempted.
 */
export function requirePersonIdentity(input: {
  contactEmail?: string | null;
  linkedinUrl?: string | null;
  contactName?: string | null;
  domain?: string | null;
  companyName?: string | null;
}): ProspectIdentity {
  const identity = resolveProspectIdentity(input);
  if (identity.strength === "none") {
    throw new IntelligenceError("INSUFFICIENT_DATA", {
      provider: "person-enrichment",
    });
  }
  return identity;
}
