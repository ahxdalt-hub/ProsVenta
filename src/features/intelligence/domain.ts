// Prosventa Company Domain Normalization
// Stage 4 — Phase 2: Company Enrichment
// Safely normalizes user-supplied company domains to canonical form.
// https://www.example.com → example.com
// http://example.com/     → example.com
// www.example.com         → example.com
// sub.example.com         → sub.example.com (preserved)

const PROTOCOL_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Normalizes a user-supplied domain string to canonical form.
 * Returns null if not a plausible domain.
 */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;

  let value = input.trim().toLowerCase();
  value = value.replace(PROTOCOL_REGEX, "");

  // Strip path/query/fragment
  const slashIndex = value.search(/[/?#]/);
  if (slashIndex !== -1) value = value.slice(0, slashIndex);

  // Strip trailing slashes
  value = value.replace(/\/+$/, "");

  // Strip leading www.
  if (/^www\./i.test(value)) value = value.replace(/^www\./i, "");

  // Reject ports (invalid for company domains)
  if (value.includes(":")) return null;

  return isValidDomain(value) ? value : null;
}

/**
 * Validates a plausible hostname domain.
 */
export function isValidDomain(domain: string | null | undefined): boolean {
  if (!domain || domain.length === 0) return false;
  if (/\s/.test(domain)) return false;
  if (PROTOCOL_REGEX.test(domain)) return false;
  if (domain.includes("/")) return false;

  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  return domainRegex.test(domain);
}