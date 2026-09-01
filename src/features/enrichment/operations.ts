// ============================================================================
// Prosventa Enrichment — Operations
// Feature 2: Enrichment - Phase 1 of 4
// ============================================================================
// The enrichment operations Prosventa recognizes. These intentionally mirror
// the existing intelligence operation catalog and credit catalog keys
// ('prospect_enrichment', 'company_enrichment') so ONE operation vocabulary
// spans jobs, usage records, credits, and this feature. Pure module.
// ============================================================================

export type EnrichmentOperation = "prospect_enrichment" | "company_enrichment";

export const ENRICHMENT_OPERATIONS: readonly EnrichmentOperation[] = [
  "prospect_enrichment",
  "company_enrichment",
];

export const ENRICHMENT_OPERATION_LABELS: Readonly<
  Record<EnrichmentOperation, string>
> = {
  prospect_enrichment: "Contact Enrichment",
  company_enrichment: "Company Enrichment",
};

/** Structured failure categories — traceability without raw error dumps. */
export type EnrichmentErrorCategory =
  | "authentication_failed"
  | "provider_not_configured"
  | "unsupported_operation"
  | "rate_limited"
  | "timeout"
  | "provider_unavailable"
  | "upstream_error"
  | "insufficient_data"
  | "not_found"
  | "insufficient_credits"
  | "duplicate_in_progress"
  | "unknown";

export function classifyEnrichmentError(
  code: string | null | undefined
): EnrichmentErrorCategory {
  switch (code) {
    case "AUTHENTICATION_FAILED":
      return "authentication_failed";
    case "PROVIDER_NOT_CONFIGURED":
      return "provider_not_configured";
    case "UNSUPPORTED_OPERATION":
      return "unsupported_operation";
    case "RATE_LIMITED":
      return "rate_limited";
    case "TIMEOUT":
      return "timeout";
    case "PROVIDER_UNAVAILABLE":
      return "provider_unavailable";
    case "UPSTREAM_ERROR":
      return "upstream_error";
    case "INSUFFICIENT_DATA":
      return "insufficient_data";
    case "NOT_FOUND":
      return "not_found";
    case "INSUFFICIENT_CREDITS":
      return "insufficient_credits";
    default:
      return "unknown";
  }
}
