// ============================================================================
// Prosventa AI Company Research — External Research Provider Adapter
// Stage 4 — Phase 4: AI Company Research
// ============================================================================
// Boundary for future external web/search research providers.
//
// No external research provider is connected yet. This adapter clearly
// reports that external research is unavailable rather than fabricating
// results. When a real web/search provider is configured, it can be
// registered here without changing the UI or service contract.
//
// The UI distinguishes "AI analysis of stored company data" from
// "External web research" based on the ResearchSource type. Since no
// external provider is connected, external_web sources are never produced.
// ============================================================================

import type { CompanyResearchContext } from "./types";

// ============================================================================
// External Research Provider Abstraction
// ============================================================================
// Any future external research provider (e.g. a web search API) must
// implement this interface. The service invokes it through this adapter.
// ============================================================================
export interface ExternalResearchProvider {
  id: string;
  name: string;
  /**
   * Performs external web research on a company and returns traceable
   * source metadata. Must return real, verified sources — never fabricated.
   */
  research(context: CompanyResearchContext): Promise<ExternalResearchPayload>;
}

/**
 * Payload returned by an external research provider.
 * Contains only traceable, verifiable source metadata. No raw secret data.
 */
export interface ExternalResearchPayload {
  /** Traceable source metadata (URL, retrieved date, name) */
  sources: {
    name: string;
    url: string;
    retrievedAt: string;
  }[];
  /** Optional factual claims with source references */
  claims?: {
    value: string;
    sourceIndex: number;
  }[];
}

// ============================================================================
// Configured Provider Resolution
// ============================================================================

export function getConfiguredExternalProviderId(): string | null {
  const configured = process.env.INTELLIGENCE_RESEARCH_PROVIDER;
  return configured && configured.trim() ? configured.trim() : null;
}

/**
 * Checks whether external web research is available.
 * Returns false in this phase — no external provider is connected.
 */
export function isExternalResearchAvailable(): boolean {
  return getConfiguredExternalProviderId() !== null;
}