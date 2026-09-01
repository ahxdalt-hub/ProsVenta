// ============================================================================
// Prosventa External Business Signals — Cross-Provider Deduplication
// Stage 6 — Phase 5: External Business Signal Engine
// ============================================================================
// The same real-world event may arrive from multiple providers ("Acme raised
// $20M" / "Acme announces $20M Series B"). These must not become two signals.
//
// Duplicate decision (any ONE anchor match counts):
//   1. providerSignalId equal            → strongest evidence of same event
//   2. normalized source URL equal       → same underlying article/page
//   3. event identity equal within a ±3 day window
//      (same mapped type + overlapping title keywords + near-same date)
//
// Unrelated events are NEVER merged just because they happened close
// together: anchors 1–2 require exact identifier equality and anchor 3
// requires the same normalized event type AND matching title tokens.
// ============================================================================

import type { ExternalSignal } from "./types";
import { tokenizeTitle } from "./normalize";

/** How many days two reports of the "same" event may differ by. */
export const EVENT_IDENTITY_WINDOW_DAYS = 3;

export interface StoredExternalSignalCandidate {
  id: string;
  signal_type: string;
  title: string;
  source_url: string | null;
  provider: string | null;
  provider_signal_id: string | null;
  detected_at: string;
}

function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "").replace(/[?#].*$/, "");
}

function daysBetween(aIso: string, bIso: string): number {
  return Math.abs(new Date(aIso).getTime() - new Date(bIso).getTime()) / 86_400_000;
}

/**
 * Determines whether an incoming external signal represents an already-stored
 * event. Pure function — the service supplies stored candidates from DB.
 */
export function findDuplicateExternalSignal(
  incoming: ExternalSignal & { resolvedType: string },
  stored: StoredExternalSignalCandidate[]
): StoredExternalSignalCandidate | null {
  // Anchor-3 identity: mapped type + title tokens + event date.
  const incomingType = incoming.resolvedType;
  const identityTokens = tokenizeTitle(incoming.title);
  for (const candidate of stored) {
    // Anchor 1: identical provider event id.
    if (
      incoming.providerSignalId &&
      candidate.provider_signal_id &&
      incoming.providerSignalId === candidate.provider_signal_id
    ) {
      return candidate;
    }

    // Anchor 2: identical normalized public source URL.
    if (
      incoming.sourceUrl &&
      candidate.source_url &&
      normalizeUrl(incoming.sourceUrl) === normalizeUrl(candidate.source_url)
    ) {
      return candidate;
    }

    // Anchor 3: same event identity within the date window.
    if (candidate.signal_type === incomingType) {
      const dateOk =
        !incoming.publishedAt ||
        daysBetween(incoming.publishedAt, candidate.detected_at) <= EVENT_IDENTITY_WINDOW_DAYS;
      if (dateOk && titleMatches(identityTokens, candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function titleMatches(tokens: string[], candidate: StoredExternalSignalCandidate): boolean {
  if (!candidate.title || tokens.length === 0) return false;
  const storedTokens = new Set(tokenizeTitle(candidate.title));
  const matched = tokens.filter((t) => storedTokens.has(t)).length;
  // Require a meaningful overlap, not a single incidental word.
  return matched >= Math.min(2, tokens.length);
}
