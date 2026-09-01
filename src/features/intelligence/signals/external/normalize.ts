// ============================================================================
// Prosventa External Business Signals — Normalization
// Stage 6 — Phase 5: External Business Signal Engine
// ============================================================================
// Converts provider-returned raw events into Prosventa's internal normalized
// SignalInput model. Provider-specific terminology never leaves this module;
// the original source/provider information is preserved for provenance.
// ============================================================================

import { normalizeDomain } from "../../domain";
import type { ExternalSignal, ExternalSignalDetectionRequest } from "./types";
import { normalizeExternalEventType } from "./types";
import type { SignalInput } from "../types";
import { computeExternalImportance } from "./relevance";
import { getExternalSignalFreshness } from "./freshness";

/**
 * Builds a NORMALIZED EVENT IDENTITY for cross-provider deduplication.
 *
 * The same real-world event described differently by two providers
 * ("Raised Series B" vs "Series B financing announced") should collapse to
 * one signal. Identity = event type + normalized title keywords + event date.
 * Unrelated events close together are NOT merged — the event type and date
 * must also align.
 */
export function buildEventIdentity(signal: ExternalSignal): string | null {
  const signalType = normalizeExternalEventType(signal.eventTypeRaw);
  if (!signalType) return null;

  const tokens = tokenizeTitle(signal.title);
  const date = signal.publishedAt ? dayKey(signal.publishedAt) : null;

  return [signalType, ...tokens, date ?? "undated"].join("|");
}

/** Tokenizes a title into a small set of significant lowercase keywords. */
export function tokenizeTitle(title: string): string[] {
  const stopWords = new Set([
    "a", "an", "the", "announced", "announces", "announce", "raised",
    "raises", "raise", "round", "completed", "completes", "has", "have",
    "its", "for", "with", "from", "new", "in", "of", "and", "to", "at",
  ]);
  return Array.from(
    new Set(
      title
        .toLowerCase()
        .replace(/[^a-z0-9$\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2 && !stopWords.has(t))
    )
  ).sort();
}

/** Day-level date key used in identities/dedupe keys. */
export function dayKey(isoDate: string): string | null {
  const d = new Date(isoDate);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * Converts an evidenced external event into Prosventa's internal SignalInput.
 * Returns null when the event cannot be honestly represented:
 *  - unknown/unmappable event type
 *  - missing or unparseable event date (a signal without WHEN is not usable)
 *
 * Evidence rules:
 *  - sourceUrl kept only when it looks like a public http(s) URL
 *  - interpretation is ALWAYS prefixed as Prosventa's own interpretation,
 *    clearly separated from the factual event description
 */
export function toSignalInput(
  signal: ExternalSignal,
  request: ExternalSignalDetectionRequest,
  providerId: string
): Omit<SignalInput, "importance"> | null {
  const signalType = normalizeExternalEventType(signal.eventTypeRaw);
  if (!signalType) return null;

  const detectedAt = signal.publishedAt ?? signal.retrievedAt;
  if (!detectedAt || Number.isNaN(new Date(detectedAt).getTime())) return null;

  const safeSourceUrl =
    signal.sourceUrl && /^https?:\/\//i.test(signal.sourceUrl.trim())
      ? signal.sourceUrl.trim()
      : null;

  return {
    signal_type: signalType,
    category: "external_event",
    title: signal.title.trim(),
    description: signal.description.trim(),
    evidence: [
      `Source: ${signal.sourceName || providerId}`,
      `Published: ${signal.publishedAt ? dayKey(signal.publishedAt) : "unknown"}`,
      `Retrieved by ${providerId}: ${dayKey(signal.retrievedAt)}`,
    ]
      .join(" · "),
    source: providerId,
    source_url: safeSourceUrl,
    detected_at: new Date(detectedAt).toISOString(),
    confidence: signal.confidence,
    interpretation:
      "Prosventa interpretation: this observed event MAY indicate increased business activity or sales relevance. It is not proof of intent to buy.",
    event_id: signal.providerSignalId,
  };
}

/**
 * Full conversion including the documented importance methodology and
 * freshness classification. This is the primary entry point used by the
 * signal service.
 */
export function toNormalizedSignalInput(
  signal: ExternalSignal,
  request: ExternalSignalDetectionRequest,
  providerId: string
): (SignalInput & { company_key: string | null; published_at: string | null; freshness: ReturnType<typeof getExternalSignalFreshness> }) | null {
  const base = toSignalInput(signal, request, providerId);
  if (!base) return null;

  const relevance = computeExternalImportance({
    signalType: base.signal_type,
    publishedAt: base.detected_at,
    confidence: base.confidence,
  });

  return {
    ...base,
    importance: relevance.importance,
    company_key: normalizeDomain(request.domain),
    published_at: signal.publishedAt ? new Date(signal.publishedAt).toISOString() : null,
    freshness: getExternalSignalFreshness(base.detected_at),
  };
}
