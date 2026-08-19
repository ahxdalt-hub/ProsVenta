// ============================================================================
// Prosventa Normalized Intelligence Result Model
// Stage 5 — Phase 1: Intelligence Foundation
// ============================================================================
// Shared normalized result envelope for ALL intelligence operations.
//
// Future phases (enrichment, research, scoring, intent, recommendations)
// must return these shapes so the UI and service layer consume a consistent
// contract regardless of provider.
//
// Key principles:
//   - Never pretend information is accurate when it isn't.
//   - Partial results are preserved, not hidden.
//   - Confidence reflects the provider's actual confidence, not optimism.
//   - Warnings surface data-quality concerns to the user.
// ============================================================================

// ============================================================================
// Source Attribution
// ============================================================================
export type IntelligenceSourceType =
  | "prosventa_data" // User-provided data stored in Prosventa
  | "enrichment" // Company / prospect enrichment provider
  | "research" // Company / prospect research provider
  | "external_web" // External web research (not yet connected)
  | "ai_analysis" // AI synthesis of other sources (not a factual source)
  | "internal"; // Internal Prosventa computation (scoring, signals, etc.)

export interface IntelligenceSource {
  /** Provider or system that produced the data */
  provider: string;
  /** Human-readable source name (e.g. "Clearbit", "Prosventa Grounded Engine") */
  name: string;
  /** Source type — distinguishes user data from external research */
  type: IntelligenceSourceType;
  /** Source URL where available */
  url: string | null;
  /** When the source data was retrieved */
  retrievedAt: string | null;
  /** Model identifier where appropriate (research/AI providers) */
  model: string | null;
}

// ============================================================================
// Normalized Result Envelope
// ============================================================================
// Generic envelope that wraps every provider result. The `data` field holds
// the typed operation payload (e.g. CompanyEnrichmentResult).
// ============================================================================
export interface NormalizedIntelligenceResult<TData = unknown> {
  /** The normalized operation payload */
  data: TData;
  /** Provider that produced the result */
  provider: string;
  /** Model identifier where appropriate */
  model: string | null;
  /** Provider confidence 0-100 — null when the provider didn't report one */
  confidence: number | null;
  /** When the result was produced */
  timestamp: string;
  /** Whether this result is partial (provider returned incomplete data) */
  partial: boolean;
  /** Data-quality warnings surfaced to the user (empty when none) */
  warnings: string[];
  /** Traceable sources for the result */
  sources: IntelligenceSource[];
  /** Safe raw provider response subset (never secrets) */
  raw: Record<string, unknown> | null;
}

// ============================================================================
// Normalized Result Builders
// ============================================================================

export interface NormalizedResultOptions {
  provider: string;
  model?: string | null;
  confidence?: number | null;
  timestamp?: string;
  partial?: boolean;
  warnings?: string[];
  sources?: IntelligenceSource[];
  raw?: Record<string, unknown> | null;
}

/**
 * Wraps a provider payload into the normalized envelope.
 * All metadata is optional — unknown values are preserved as null/empty.
 */
export function normalizeIntelligenceResult<TData>(
  data: TData,
  options: NormalizedResultOptions
): NormalizedIntelligenceResult<TData> {
  return {
    data,
    provider: options.provider,
    model: options.model ?? null,
    confidence: clampConfidence(options.confidence),
    timestamp: options.timestamp ?? new Date().toISOString(),
    partial: options.partial ?? false,
    warnings: options.warnings ?? [],
    sources: options.sources ?? [],
    raw: options.raw ?? null,
  };
}

// ============================================================================
// Confidence Helpers
// ============================================================================

/**
 * Clamps a confidence value to the valid 0-100 range.
 * Returns null when the input is not a finite number.
 */
export function clampConfidence(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

// ============================================================================
// Freshness / Caching Foundation
// ============================================================================

/**
 * Describes how fresh a stored intelligence result is and whether a refresh
 * should be triggered. Used by caching/duplicate-prevention layers so future
 * phases can state "use existing enrichment if fresh" or "force refresh".
 */
export interface IntelligenceFreshness {
  /** Whether existing data is fresh enough to use without a provider call */
  isFresh: boolean;
  /** Whether the existing data is stale and should be refreshed */
  isStale: boolean;
  /** Age of the stored result in milliseconds (null when no stored result) */
  ageMs: number | null;
  /** Maximum tolerated age in milliseconds before data becomes stale */
  maxAgeMs: number;
  /** Human-readable freshness label (e.g. "2 days old") */
  label: string;
}

export interface FreshnessCheckOptions {
  /** Stored result timestamp (ISO) — null when no stored result exists */
  retrievedAt: string | null;
  /** Maximum tolerated age in milliseconds (default: 24 hours) */
  maxAgeMs?: number;
  /** Now — injectable for tests */
  now?: number;
}

export const DEFAULT_INTELLIGENCE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Determines whether stored intelligence is fresh enough to reuse.
 * This is the foundation for "use existing enrichment if it is fresh"
 * without implementing aggressive caching that makes data stale.
 */
export function checkFreshness(options: FreshnessCheckOptions): IntelligenceFreshness {
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_INTELLIGENCE_MAX_AGE_MS;
  const now = options.now ?? Date.now();

  if (!options.retrievedAt) {
    return {
      isFresh: false,
      isStale: false,
      ageMs: null,
      maxAgeMs,
      label: "No data",
    };
  }

  const retrievedTime = new Date(options.retrievedAt).getTime();
  if (Number.isNaN(retrievedTime)) {
    return {
      isFresh: false,
      isStale: true,
      ageMs: null,
      maxAgeMs,
      label: "Unknown age",
    };
  }

  const ageMs = Math.max(0, now - retrievedTime);
  const isFresh = ageMs <= maxAgeMs;

  return {
    isFresh,
    isStale: !isFresh,
    ageMs,
    maxAgeMs,
    label: formatAgeLabel(ageMs),
  };
}

function formatAgeLabel(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} old`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} old`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} old`;
}

// ============================================================================
// Partial Result Helpers
// ============================================================================

/**
 * Marks a result as partial with human-readable warnings describing what is
 * missing. Providers must call this when they return incomplete data so the
 * UI never presents partial enrichment as complete.
 */
export function markPartial<TData>(
  data: TData,
  provider: string,
  warnings: string[],
  options?: Omit<NormalizedResultOptions, "provider" | "warnings">
): NormalizedIntelligenceResult<TData> {
  return normalizeIntelligenceResult(data, {
    provider,
    partial: true,
    warnings,
    ...options,
  });
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Checks whether an unknown value looks like a normalized intelligence result.
 */
export function isNormalizedIntelligenceResult(
  value: unknown
): value is NormalizedIntelligenceResult<unknown> {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.provider === "string" &&
    "data" in candidate &&
    typeof candidate.partial === "boolean" &&
    Array.isArray(candidate.warnings) &&
    Array.isArray(candidate.sources)
  );
}