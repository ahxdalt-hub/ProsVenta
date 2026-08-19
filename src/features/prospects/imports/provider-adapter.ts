// ============================================================================
// Prosventa External Provider Adapter
// Stage 2 — Phase 8: Prospect Data Processing & Enrichment Foundation
// ============================================================================
// Future-ready abstraction for connecting external prospect data providers
// (Google Places, Apollo, Clearbit, etc.) into the processing pipeline.
// No providers are connected yet — this defines the contract.
// ============================================================================

import type { ProspectInput } from "@/features/prospects/types/prospect";
import type { DiscoveryResult } from "@/features/prospects/types/discovery";

/**
 * Adapter contract for external prospect data providers.
 * Future providers implement this to feed normalized data into the
 * processing pipeline.
 */
export interface ExternalProviderAdapter {
  /** Unique identifier for this adapter's provider. */
  providerId: string;

  /**
   * Converts a provider-specific result into a standardized ProspectInput.
   *
   * @param result - The raw result from the external provider.
   * @returns A ProspectInput ready for the processing pipeline.
   */
  toProspectInput(result: DiscoveryResult | Record<string, unknown>): ProspectInput;

  /**
   * Converts a batch of provider results.
   */
  toProspectInputs(
    results: Array<DiscoveryResult | Record<string, unknown>>
  ): ProspectInput[];
}

/**
 * Base adapter that provides default batch conversion.
 * Future provider adapters can extend this.
 */
export abstract class BaseProviderAdapter implements ExternalProviderAdapter {
  abstract providerId: string;

  abstract toProspectInput(
    result: DiscoveryResult | Record<string, unknown>
  ): ProspectInput;

  toProspectInputs(
    results: Array<DiscoveryResult | Record<string, unknown>>
  ): ProspectInput[] {
    return results.map((result) => this.toProspectInput(result));
  }
}