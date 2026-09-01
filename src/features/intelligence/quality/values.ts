// ============================================================================
// Prosventa Data Quality Layer — Value Normalization & Validation
// Stage 6 - Phase 4: Data Normalization, Verification & Quality Engine
// ============================================================================
// Pure, deterministic value-level helpers shared by company/person
// normalization, deduplication, conflict resolution, and validation.
//
// Principles:
//   - Meaningless placeholder strings ("N/A", "-", "None", …) become null.
//   - Values are never invented; invalid values are rejected, not guessed.
//   - No fabricated precision (no fake percentages, no invented counts).
// ============================================================================

/** Placeholder strings that carry no real data and must never be stored. */
const PLACEHOLDER_VALUES = new Set([
  "n/a",
  "na",
  "unknown",
  "none",
  "null",
  "-",
  "--",
  "not available",
  "not_applicable",
  "not applicable",
  "tbd",
  "",
]);

/**
 * Cleans an untrusted string value: trims, strips meaningless placeholders,
 * collapses internal whitespace. Returns null when no usable value remains.
 */
export function cleanValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return null;
  if (PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) return null;
  // A string made only of punctuation/dashes is also a placeholder.
  if (/^[\p{P}\s]+$/u.test(trimmed)) return null;
  return trimmed;
}

/** Basic email format validation. Does NOT claim deliverability. */
export function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Validates http(s) URL format. Other schemes are rejected. */
export function isValidHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Parses an employee count from untrusted input.
 * Accepts numbers and numeric strings ("250", "250 employees").
 * Returns null for anything that is not a plausible positive count.
 */
export function parseEmployeeCount(
  value: unknown
): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 && value <= 100_000_000
      ? value
      : null;
  }
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/[, ]/g, "").replace(/employees?$/i, "");
    if (!/^\d+$/.test(cleaned)) return null;
    const parsed = Number.parseInt(cleaned, 10);
    return parseEmployeeCount(parsed);
  }
  return null;
}

/**
 * Validates/preserves an employee RANGE exactly as provided (e.g. "201-500").
 * Ranges are never collapsed into an invented exact count.
 */
export function normalizeEmployeeRange(value: unknown): string | null {
  const cleaned = cleanValue(value);
  if (!cleaned) return null;
  // Accept forms like "201-500", "201–500", "201 to 500", "1,001-5,000"
  const match = cleaned.match(/^([\d,]+)\s*(?:-|–|to)\s*([\d,]+)$/i);
  if (!match) return null;
  const low = Number.parseInt(match[1].replace(/,/g, ""), 10);
  const high = Number.parseInt(match[2].replace(/,/g, ""), 10);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  if (low < 0 || high < low || low > 100_000_000 || high > 100_000_000) return null;
  return `${low}-${high}`;
}

/**
 * Normalizes a company name for DISPLAY: trimmed whitespace only.
 * Deliberately conservative — legal suffixes (Inc., GmbH, Ltd) are preserved
 * because they are part of the real company identity.
 */
export function normalizeCompanyName(value: unknown): string | null {
  return cleanValue(value);
}

/**
 * Produces a strong normalized identity key for matching/deduplication.
 * Lowercases, strips punctuation and common corporate suffixes so
 * "ACME INC." and "acme inc" collide — while distinct companies do not.
 */
export function companyNameIdentityKey(name: string | null | undefined): string | null {
  const cleaned = cleanValue(name);
  if (!cleaned) return null;
  let key = cleaned.toLowerCase();
  key = key.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  key = key.replace(/\s(inc|llc|ltd|ltda|gmbh|bv|nv|sa|sas|ag|ab|as|oy|plc|pty|co|corp|corporation|company|group|holdings|limited)$/, "");
  key = key.replace(/\s+/g, " ").trim();
  return key.length > 0 ? key : null;
}

/**
 * Validates a founded year: plausible range only, never adjusted.
 */
export function normalizeFoundedYear(value: unknown): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d{4}$/.test(value.trim())
        ? Number.parseInt(value.trim(), 10)
        : NaN;
  if (!Number.isInteger(n)) return null;
  const currentYear = new Date().getFullYear();
  return n >= 1600 && n <= currentYear ? n : null;
}

/**
 * Validates a timestamp string is a parseable date. Returns the ISO string
 * or null. Invalid dates never enter storage through this path.
 */
export function normalizeTimestamp(value: unknown): string | null {
  const cleaned = cleanValue(value);
  if (!cleaned) return null;
  const time = new Date(cleaned).getTime();
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/**
 * Validates a provider identifier: non-empty, sane length, printable.
 * Malformed IDs are rejected rather than stored.
 */
export function isValidProviderId(value: unknown): boolean {
  const cleaned = cleanValue(value);
  if (!cleaned) return false;
  return cleaned.length <= 255 && /^[\w.@:/+-]+$/.test(cleaned);
}
