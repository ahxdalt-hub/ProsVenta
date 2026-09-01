// ============================================================================
// Prosventa Enrichment — Provider Interface
// Feature 2: Enrichment - Phase 1 of 4
// ============================================================================
// THE provider-independent contract for enrichment providers.
//
//   Prosventa Enrichment Service (features/enrichment/service.ts)
//        ↓
//   EnrichmentProvider interface (this file)
//        ↓
//   External Provider adapter (server-side only)
//
// The UI NEVER calls a provider directly and provider-specific logic never
// leaves its adapter. Credentials are read from server-side environment
// variables inside adapters — never from NEXT_PUBLIC_* values, never passed
// through arguments.
//
// This interface ALIGNS with the existing IntelligenceProvider registry
// (src/features/intelligence/providers/) rather than replacing it: existing
// enrichment providers satisfy this contract through thin adapters, so there
// remains exactly ONE provider abstraction per concern in Prosventa.
// ============================================================================

import "server-only";

import type { EnrichmentOperation } from "./operations";
import type {
  EnrichableField,
  NormalizedEnrichmentResponse,
} from "./types";

export interface EnrichmentProviderConfig {
  /** Unique provider identifier (e.g. "clearbit", "apollo", "mock"). */
  id: string;
  name: string;
  /** Operations this provider can perform. */
  supportedOperations: readonly EnrichmentOperation[];
  /** Fields this provider can legitimately supply (never invented). */
  fieldsSupported: readonly EnrichableField[];
}

export interface EnrichmentProviderInput {
  /** Provider-agnostic lookup identifiers — all optional, all nullable. */
  prospectId: string;
  fullName?: string | null;
  email?: string | null;
  companyName?: string | null;
  companyDomain?: string | null;
  operation: EnrichmentOperation;
  fields?: EnrichableField[];
}

export interface EnrichmentProvider {
  getConfig(): EnrichmentProviderConfig;

  /**
   * Executes one enrichment against this provider. Implementations must:
   * - Read credentials from server-side environment variables only
   * - Translate the input into the provider's own API shape
   * - Map provider errors onto structured error categories (see operations.ts)
   * - Return a NormalizedEnrichmentResponse via normalizeEnrichmentPayload()
   * - Return null-valued fields honestly when the provider has no data
   */
  enrich(input: EnrichmentProviderInput): Promise<NormalizedEnrichmentResponse>;
}
