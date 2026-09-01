// ============================================================================
// Prosventa Intelligence Provider Capabilities
// Stage 6 - Phase 1: Data Provider & Enrichment Foundation
// ============================================================================
// Granular capability model. Providers declare what they support; services
// must check capabilities before invoking an operation instead of assuming
// every provider supports everything. Unsupported operations surface a
// controlled PROVIDER_UNSUPPORTED error — never a generic "no data".
// ============================================================================

import { IntelligenceError } from "./errors";
import type { IntelligenceOperation, IntelligenceProvider } from "./types";

export type ProviderCapability =
  | "company_enrichment"
  | "person_enrichment"
  | "company_research"
  | "person_research"
  | "technology_data"
  | "contact_data"
  | "business_signals";

export const PROVIDER_CAPABILITIES: ProviderCapability[] = [
  "company_enrichment",
  "person_enrichment",
  "company_research",
  "person_research",
  "technology_data",
  "contact_data",
  "business_signals",
];

export const PROVIDER_CAPABILITY_LABELS: Record<ProviderCapability, string> = {
  company_enrichment: "Company Enrichment",
  person_enrichment: "Person Enrichment",
  company_research: "Company Research",
  person_research: "Person Research",
  technology_data: "Technology Data",
  contact_data: "Contact Data",
  business_signals: "Business Signals",
};

/**
 * Maps each capability to the base operation(s) required to serve it.
 * A provider must support at least one of these operations for the
 * capability to be considered available.
 */
export const CAPABILITY_REQUIRED_OPERATIONS: Record<
  ProviderCapability,
  IntelligenceOperation[]
> = {
  company_enrichment: ["company_enrichment"],
  person_enrichment: ["prospect_enrichment"],
  company_research: ["company_research"],
  person_research: ["prospect_research"],
  technology_data: ["company_enrichment"],
  contact_data: ["prospect_enrichment"],
  business_signals: ["signals"],
};

/** Derives the capabilities a provider offers from its supported operations. */
export function capabilitiesFromOperations(
  supportedOperations: IntelligenceOperation[]
): ProviderCapability[] {
  return PROVIDER_CAPABILITIES.filter((capability) =>
    CAPABILITY_REQUIRED_OPERATIONS[capability].some((op) =>
      supportedOperations.includes(op)
    )
  );
}

/** Checks whether a provider declares support for a capability. */
export function providerSupportsCapability(
  provider: IntelligenceProvider,
  capability: ProviderCapability
): boolean {
  const declared = provider.getConfig().capabilities;
  const effective =
    declared && declared.length > 0
      ? declared
      : capabilitiesFromOperations(provider.getConfig().supportedOperations);
  return effective.includes(capability);
}

/**
 * Throws a controlled PROVIDER_UNSUPPORTED error when the provider does not
 * support the requested capability. Call before dispatching work.
 */
export function assertProviderCapability(
  provider: IntelligenceProvider,
  capability: ProviderCapability
): void {
  if (!providerSupportsCapability(provider, capability)) {
    throw new IntelligenceError("PROVIDER_UNSUPPORTED", {
      provider: provider.getConfig().id,
    });
  }
}