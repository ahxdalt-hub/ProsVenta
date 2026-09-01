// ============================================================================
// Prosventa External Business Signals — Provider Contract
// Stage 6 — Phase 5: External Business Signal Engine
// ============================================================================
// Provider-agnostic contract for external business signal detection.
//
// A signal-capable provider receives a normalized detection request and
// returns RAW EVIDENCE-BEARING events in its own vocabulary. Prosventa then
// normalizes, validates, deduplicates, and stores them — the rest of the
// application NEVER depends on a provider's response format.
//
// TRUST RULES:
//  - Providers must return only events they can evidence (source + date).
//  - An event with no trustworthy evidence is dropped, never stored.
//  - No provider is configured → controlled unavailable state. Never fake
//    signals to make the product look populated.
// ============================================================================

import type { SignalType } from "../types";
import type { ProviderCapability } from "../../capabilities";

// ============================================================================
// Detection Request
// ============================================================================
export interface ExternalSignalDetectionRequest {
  /** Internal company/prospect identifier (org-scoped; for provider reference) */
  companyId?: string | null;
  /** Normalized company domain (primary matching key) */
  domain: string | null;
  /** Company display name when domain is unavailable */
  companyName?: string | null;
  /**
   * Identifiers already known for this company (from prior enrichment).
   * Providers may use these to improve match accuracy. Optional.
   */
  existingIdentifiers?: {
    providerCompanyIds?: Record<string, string>;
    sourceUrls?: string[];
  };
}

// ============================================================================
// Raw External Signal (provider → Prosventa, before normalization)
// ============================================================================
export interface ExternalSignal {
  /**
   * The provider's own stable event identifier, when available.
   * Used as the strongest deduplication anchor.
   */
  providerSignalId: string | null;
  /**
   * The provider's raw event-type label (e.g. "series_b", "exec_appointment").
   * Must be mappable by normalizeExternalEventType or the signal is dropped.
   */
  eventTypeRaw: string;
  title: string;
  description: string;
  /**
   * Legitimately available source URL pointing to public evidence.
   * Null when the provider does not expose a public source — never invented.
   */
  sourceUrl: string | null;
  /** Human-readable publisher/source name (e.g. "PR Newswire") */
  sourceName: string;
  /** When the event was published/reported by the source */
  publishedAt: string | null;
  /** When the provider retrieved/observed the event */
  retrievedAt: string;
  confidence: "high" | "medium" | "low";
  /** Safe, non-secret subset of the provider payload for provenance */
  raw?: Record<string, unknown> | null;
}

// ============================================================================
// External Signal Provider Interface
// ============================================================================
export interface ExternalSignalProviderConfig {
  id: string;
  name: string;
  description: string;
  /** Phase 1 capability metadata — must include "business_signals" */
  capabilities: ProviderCapability[];
}

export interface ExternalSignalProvider {
  getConfig(): ExternalSignalProviderConfig;

  /**
   * Detects external business signals for ONE company.
   * Returns an empty array when no evidenced events exist — never throws
   * for "no signals"; throws typed IntelligenceErrors for real failures.
   *
   * Batch support: background jobs later reuse this per-company operation;
   * batching is orchestrated server-side by the signal service, never from
   * the browser.
   */
  detectExternalSignals(
    request: ExternalSignalDetectionRequest
  ): Promise<ExternalSignal[]>;
}

// ============================================================================
// Supported external signal categories (Phase 5 scope — deliberately small)
// ============================================================================
export const EXTERNAL_SIGNAL_TYPE_MAP: Record<string, SignalType> = {
  // Hiring / Growth
  hiring_surge: "hiring_activity",
  department_hiring: "hiring_activity",
  leadership_hiring: "leadership_change",
  headcount_growth: "company_growth",
  // Funding / Financial
  funding_round: "funding_event",
  investment_event: "funding_event",
  acquisition: "funding_event",
  merger: "funding_event",
  // Leadership change
  executive_appointment: "leadership_change",
  executive_departure: "leadership_change",
  role_change: "role_change",
  // Company change
  expansion: "company_expansion",
  new_office: "new_location",
  major_announcement: "product_announcement",
  // Technology / Product
  technology_adoption: "product_announcement",
  tech_stack_change: "product_announcement",
};

/**
 * Maps a provider's raw event-type label to Prosventa's internal signal type.
 * Returns null when the label is unknown — unknown event types are DROPPED,
 * never guessed, so we never store an unclassifiable signal.
 */
export function normalizeExternalEventType(eventTypeRaw: string): SignalType | null {
  return EXTERNAL_SIGNAL_TYPE_MAP[eventTypeRaw.trim().toLowerCase()] ?? null;
}

/** Whether an internal signal type can originate from an external provider. */
export function isExternalSignalType(signalType: SignalType): boolean {
  return Object.values(EXTERNAL_SIGNAL_TYPE_MAP).includes(signalType);
}
