// ============================================================================
// Prosventa Enrichment — Public Surface
// Feature 2: Enrichment - Phase 1 of 4
// ============================================================================
// The ONLY import surface for the enrichment foundation. Pure modules are
// client-safe; anything touching providers or the database lives behind the
// server-only service module.
// ============================================================================

// Canonical status model (pure)
export {
  ENRICHMENT_OPERATION_STATUSES,
  ENRICHMENT_STATUS_LABELS,
  ENRICHMENT_STATUS_TRANSITIONS,
  isValidEnrichmentTransition,
  mapDbEnrichmentStatus,
  mapDbJobStatus,
  isDisplayableEnrichmentStatus,
} from "./status";
export type { EnrichmentOperationStatus } from "./status";

// Operations + error categories (pure)
export {
  ENRICHMENT_OPERATIONS,
  ENRICHMENT_OPERATION_LABELS,
  classifyEnrichmentError,
} from "./operations";
export type { EnrichmentOperation, EnrichmentErrorCategory } from "./operations";

// Normalized contract (pure)
export type {
  EnrichableField,
  NormalizedPersonSection,
  NormalizedContactSection,
  NormalizedCompanySection,
  NormalizedTechnologySection,
  NormalizedEnrichmentMetadata,
  NormalizedEnrichmentResponse,
  EnrichmentRequest,
  EnrichmentResult,
  EnrichmentResultStatus,
} from "./types";
export { ENRICHABLE_FIELDS } from "./types";

// Normalization (pure)
export {
  cleanString,
  cleanDomain,
  normalizeEnrichmentPayload,
  collectReturnedFields,
  isPartialResponse,
} from "./normalize";

// Idempotency (pure)
export {
  ENRICHMENT_IDEMPOTENCY_WINDOW_MS,
  buildEnrichmentIdempotencyKey,
} from "./idempotency";

// Provider interface (server-only — do not import from client components)
export type {
  EnrichmentProvider,
  EnrichmentProviderConfig,
  EnrichmentProviderInput,
} from "./provider";

// Display model (pure) — Phase 2 single-prospect window helpers
export {
  mergeEnrichmentResponses,
  detectEnrichmentCategories,
  hasUsefulEnrichmentData,
  formatFreshnessLabel,
  countEnrichedFields,
} from "./display";

// Server facade ("use server" — call from server components/actions only)
export { enrichProspect, getEnrichmentIdempotencyKey } from "./service";

// Bulk model (pure) — Phase 3 bulk enrichment
export {
  BULK_ENRICHMENT_CONCURRENCY,
  BULK_ENRICHMENT_MAX_PROSPECTS,
  TERMINAL_OPERATION_STATUSES,
  buildBulkOperationKey,
  computeBulkEstimate,
  computeFinalOperationStatus,
  computeProgressView,
  getProspectEnrichmentUnitCost,
  isRetryableBulkJob,
  isStaleBulkOperation,
  isTerminalOperationStatus,
} from "./bulk";
export type {
  BulkOperationStatus,
  BulkJobStatus,
  BulkEstimate,
  BulkCounters,
  BulkProgressView,
} from "./bulk";
