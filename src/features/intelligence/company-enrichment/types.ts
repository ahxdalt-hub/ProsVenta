// ============================================================================
// Prosventa Company Enrichment — Types
// Stage 5 — Phase 2: Company Enrichment
// ============================================================================
// Strongly-typed contract for the company enrichment operation. The UI only
// ever consumes the safe `CompanyEnrichmentOperationResult` — provider
// secrets and stack traces are never exposed.
// ============================================================================

import type {
  CompanyEnrichmentResult,
  CompanyEnrichmentStatus,
} from "../types";

// ============================================================================
// Enrichment Operation Result (server → UI)
// ============================================================================
// Safe result returned to the UI. Never exposes provider secrets/stack traces.
//
// `usedCached` tells the UI that fresh stored data was reused (no provider
// call was made). `alreadyInProgress` tells the UI that a duplicate request
// was blocked because an identical enrichment is already running.
// ============================================================================
export interface CompanyEnrichmentOperationResult {
  status: CompanyEnrichmentStatus;
  /** User-facing message (never raw provider errors) */
  message: string;
  /** Only present when status === "completed" */
  data: CompanyEnrichmentResult | null;
  /** Provider that produced the result */
  provider: string;
  /** When the enrichment was stored */
  enrichedAt: string | null;
  /** Confidence 0-100 (null when unknown) */
  confidence: number | null;
  /** Whether the provider returned incomplete data */
  partial: boolean;
  /** Data-quality warnings surfaced to the user */
  warnings: string[];
  /** True when a duplicate request was blocked (job already in progress) */
  alreadyInProgress: boolean;
  /** True when fresh stored data was reused without a provider call */
  usedCached: boolean;
}

// ============================================================================
// Enrichment Display Model (UI)
// ============================================================================
// Combines the stored enrichment record with derived display metadata so the
// UI can render a trustworthy company intelligence profile.
// ============================================================================
export interface CompanyEnrichmentDisplay {
  /** Stored enrichment data (null when none exists) */
  data: CompanyEnrichmentResult | null;
  /** Provider that produced the data */
  provider: string | null;
  /** When the data was last enriched */
  enrichedAt: string | null;
  /** Confidence 0-100 (null when unknown) */
  confidence: number | null;
  /** Whether the stored result is partial */
  partial: boolean;
  /** Data-quality warnings */
  warnings: string[];
  /** Whether the stored result is fresh enough to reuse */
  isFresh: boolean;
  /** Human-readable freshness label (e.g. "2 hours old") */
  freshnessLabel: string;
}