// Prosventa Prospect Identity Resolution
// Stage 4 — Phase 3: Contact & Prospect Intelligence
// Safely determines how a prospect will be identified when calling the
// provider. The strongest available identifier is chosen first:
//   1. Professional email
//   2. LinkedIn profile URL
//   3. Name + company domain
// Name alone is NEVER sufficient to uniquely identify a person.

import { normalizeDomain } from "./domain";
import type { ProspectIdentity } from "./types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_REGEX = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i;

/**
 * Normalizes a LinkedIn profile URL to a canonical form.
 * Returns null if not a plausible LinkedIn profile URL.
 */
export function normalizeLinkedinUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  if (!LINKEDIN_REGEX.test(value)) return null;
  // Ensure https:// prefix
  if (!/^https?:\/\//i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

/**
 * Resolves the strongest available identity for a prospect.
 * Returns an identity with strength "none" when no safe identifier exists.
 */
export function resolveProspectIdentity(input: {
  contactEmail?: string | null;
  linkedinUrl?: string | null;
  contactName?: string | null;
  domain?: string | null;
  companyName?: string | null;
}): ProspectIdentity {
  const email = input.contactEmail?.trim() || null;
  const linkedinUrl = normalizeLinkedinUrl(input.linkedinUrl);
  const contactName = input.contactName?.trim() || null;
  const domain = normalizeDomain(input.domain);
  const companyName = input.companyName?.trim() || null;

  // 1. Strongest: professional email
  if (email && EMAIL_REGEX.test(email)) {
    return {
      strength: "email",
      email,
      linkedinUrl: null,
      contactName,
      domain,
      companyName,
    };
  }

  // 2. Strong: LinkedIn profile URL
  if (linkedinUrl) {
    return {
      strength: "linkedin",
      email: null,
      linkedinUrl,
      contactName,
      domain,
      companyName,
    };
  }

  // 3. Acceptable: name + company domain (never name alone)
  if (contactName && domain) {
    return {
      strength: "name_company",
      email: null,
      linkedinUrl: null,
      contactName,
      domain,
      companyName,
    };
  }

  // 4. No safe identifier
  return {
    strength: "none",
    email: null,
    linkedinUrl: null,
    contactName,
    domain,
    companyName,
  };
}

/**
 * Builds the provider input from a resolved identity.
 */
export function identityToProviderInput(identity: ProspectIdentity): {
  contactEmail?: string | null;
  linkedinUrl?: string | null;
  contactName?: string | null;
  domain?: string | null;
  companyName?: string | null;
} {
  return {
    contactEmail: identity.email,
    linkedinUrl: identity.linkedinUrl,
    contactName: identity.contactName,
    domain: identity.domain,
    companyName: identity.companyName,
  };
}