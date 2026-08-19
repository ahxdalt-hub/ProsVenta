// ============================================================================
// Prosventa Buying & Intent Signals — Internal Activity Engine
// Stage 4 — Phase 7: Buying & Intent Signals
// ============================================================================
// Deterministic, grounded engine that detects PROSVENTA ACTIVITY signals
// from existing Prosventa data. These are PRODUCT ACTIVITY signals, NOT
// buying intent signals. They are kept in a distinct category.
//
// This engine NEVER fabricates external events. It only reports observable
// Prosventa activity that already exists in the system.
// ============================================================================

import type { SignalDetectionInput, SignalInput } from "./types";

// ============================================================================
// Internal Activity Detection
// ============================================================================

/**
 * Detects Prosventa activity signals from existing prospect data.
 * Returns an empty array when no activity is present.
 *
 * These are PRODUCT ACTIVITY signals (e.g. "prospect imported",
 * "company enriched") — NOT buying intent signals. The category is
 * always "prosventa_activity" to keep the distinction clear.
 */
export function detectInternalActivitySignals(
  input: SignalDetectionInput
): SignalInput[] {
  const signals: SignalInput[] = [];
  const now = new Date().toISOString();
  const companyName = input.companyName || input.domain || "This prospect";

  // Prospect imported — always present since the prospect exists in Prosventa.
  signals.push({
    signal_type: "prospect_imported",
    category: "prosventa_activity",
    title: "Prospect added to Prosventa",
    description: `${companyName} was added as a prospect in this workspace.`,
    evidence: "Record exists in the Prosventa prospects table.",
    source: "prosventa-activity",
    detected_at: now,
    confidence: "high",
    importance: "low",
    interpretation:
      "This is a Prosventa activity record. It does not indicate buying intent.",
    event_id: `prospect-imported-${input.prospectId}`,
  });

  // Company enriched — only when enrichment data exists.
  // (The service layer passes this flag based on actual enrichment records.)
  if (input.externalResearchPerformed) {
    signals.push({
      signal_type: "company_enriched",
      category: "prosventa_activity",
      title: "Company intelligence enriched",
      description: `Company information for ${companyName} was enriched in Prosventa.`,
      evidence: "Company enrichment data is available for this prospect.",
      source: "prosventa-activity",
      detected_at: now,
      confidence: "high",
      importance: "low",
      interpretation:
        "This is a Prosventa activity record. It does not indicate buying intent.",
      event_id: `company-enriched-${input.prospectId}`,
    });
  }

  return signals;
}