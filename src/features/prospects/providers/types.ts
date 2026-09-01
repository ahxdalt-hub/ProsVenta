// ============================================================================
// Prosventa Prospect Provider Abstraction
// Stage 2 — Phase 7: Prospect Discovery Engine Foundation
// ============================================================================
// Defines the contract for all future prospect data providers.
// Each provider (Google Places, Apollo, Clearbit, etc.) implements this
// interface to integrate with the discovery engine.
// ============================================================================
// IMPORTANT: No external providers are connected yet.
// This is the architecture only — ready for Stage 2 — Phase 8.
// ============================================================================

import type {
  DiscoveryCriteria,
  DiscoveryResponse,
  LeadSearchPage,
  LeadSearchRequest,
} from "@/features/prospects/types/discovery";

// ============================================================================
// Provider Configuration
// ============================================================================
// Static metadata about a provider for display and routing purposes.
export interface ProviderConfig {
  /** Unique identifier for the provider (e.g. "google-places", "apollo") */
  id: string;
  /** Human-readable name (e.g. "Google Places", "Apollo.io") */
  name: string;
  /** Short description of what the provider offers */
  description: string;
  /** Whether the provider requires API key configuration */
  requiresApiKey: boolean;
  /** Whether the provider is currently enabled */
  enabled: boolean;
}

// ============================================================================
// Prospect Provider Interface
// ============================================================================
// All future prospect data providers must implement this interface.
// This ensures a consistent contract for discovery across all sources.
export interface ProspectProvider {
  /** Returns the provider's configuration/metadata */
  getConfig(): ProviderConfig;

  /**
   * Execute a prospect search against this provider.
   *
   * @param criteria - Normalized search criteria from the user's discovery request.
   * @returns A DiscoveryResponse containing normalized results or an error.
   *
   * Implementations should:
   * - Map DiscoveryCriteria to the provider's API format
   * - Handle authentication (API keys, tokens, etc.)
   * - Handle rate limiting and errors gracefully
   * - Return results normalized to DiscoveryResult shape
   * - Return error instead of throwing for expected failures
   */
  search(criteria: DiscoveryCriteria): Promise<DiscoveryResponse>;
}

// ============================================================================
// Provider Registry
// ============================================================================
// Registry of all available providers. In the future, providers will be
// registered here and can be selected by users during discovery.
export interface ProviderRegistry {
  /** Get a provider by its unique ID */
  getProvider(id: string): ProspectProvider | undefined;
  /** Get all registered providers */
  getAllProviders(): ProspectProvider[];
  /** Register a new provider */
  register(provider: ProspectProvider): void;
}

// ============================================================================
// Lead Discovery Provider (Phase 8 — real provider-backed search)
// ============================================================================
// Extended contract for providers that support paginated, person-level lead
// search. Implementations run SERVER-SIDE ONLY: API keys are read from
// server environment variables and must never reach the browser.
// ============================================================================

export interface LeadDiscoveryProvider {
  getConfig(): ProviderConfig;

  /**
   * Execute a normalized lead search. The adapter is responsible for:
   * - Translating the normalized request into the provider's API format
   * - Reading its credentials from server-side environment variables
   * - Mapping provider errors onto structured DiscoveryError codes
   * - Normalizing raw records into the NormalizedLead shape
   * - Cursor-based pagination (never loading unbounded result sets)
   */
  searchLeads(request: LeadSearchRequest): Promise<LeadSearchPage>;
}