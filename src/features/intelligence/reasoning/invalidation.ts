// ============================================================================
// Prosventa Intelligence — Invalidation Rules
// Feature 4 — Phase 1: centralized staleness concept.
// ============================================================================
// Intelligence becomes stale when the evidence it was built on changed in a
// MEANINGFUL way — not for every insignificant database update. All rules live
// here so UI components and services never invent their own.
// ============================================================================

import type { ReasoningInput } from "./context";

export type IntelligenceStaleReason =
  | "icp_changed"
  | "enrichment_updated"
  | "new_verified_signal"
  | "prospect_data_changed"
  | "company_data_changed";

export interface StalenessCheck {
  stale: boolean;
  reasons: IntelligenceStaleReason[];
}

export interface StoredInsightContext {
  /** ICP configuration id the insight was generated against. */
  icpConfigurationId: string | null;
  /** Digest of the reasoning input at generation time. */
  inputDigest: string | null;
  generatedAt: string | null;
}

/**
 * Centralized staleness evaluation. Compares the CURRENT normalized context
 * against the context stored with the existing intelligence.
 *
 * The input digest is the primary signal: any meaningful change to the
 * semantic reasoning content (ICP, facts, enrichment availability, verified
 * signals) produces a different digest. Timestamp-only noise is excluded from
 * the digest by design, so cosmetic updates do not invalidate intelligence.
 */
export function evaluateStaleness(
  stored: StoredInsightContext,
  current: ReasoningInput,
  currentDigest: string
): StalenessCheck {
  const reasons: IntelligenceStaleReason[] = [];

  // No prior intelligence → nothing to invalidate (it is simply missing).
  if (!stored.inputDigest && !stored.generatedAt) {
    return { stale: false, reasons };
  }

  if (stored.inputDigest && stored.inputDigest !== currentDigest) {
    // Digest differs — classify WHY so callers can prioritize regeneration.
    const storedIcp = stored.icpConfigurationId ?? null;
    const currentIcp = current.icp?.configurationId ?? null;
    if (storedIcp !== currentIcp) {
      reasons.push("icp_changed");
    }
    if (
      current.enrichment.lastRetrievedAt &&
      current.historical.enrichmentLastRetrievedAt &&
      current.enrichment.lastRetrievedAt !== current.historical.enrichmentLastRetrievedAt
    ) {
      reasons.push("enrichment_updated");
    }
    if (current.signals.some((s) => s.status === "verified")) {
      reasons.push("new_verified_signal");
    }
    if (current.subject.scope === "prospect") {
      reasons.push("prospect_data_changed");
    } else {
      reasons.push("company_data_changed");
    }
  }

  return { stale: reasons.length > 0, reasons };
}

/**
 * Whether an existing ready insight can be REUSED instead of regenerated.
 * Reuse requires an unchanged digest — same evidence, same interpretation.
 */
export function canReuseIntelligence(
  stored: StoredInsightContext,
  currentDigest: string
): boolean {
  if (!stored.inputDigest) return false;
  return stored.inputDigest === currentDigest;
}
