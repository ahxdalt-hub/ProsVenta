// ============================================================================
// Prosventa Signals — Funding Event Detector
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================
// Consumes provider-reported funding/acquisition events (Phase 1
// ExternalSignal contract) and produces funding_event candidates.
//
// TRUST RULES:
//   - Amounts are carried through VERBATIM only when the provider returned
//     one. A missing amount never blocks the signal and is NEVER invented.
//   - Event date comes from publishedAt when available.
// ============================================================================

import type { ExternalSignal } from "../../external/types";
import type { SignalType } from "../../types";
import type { NormalizedEvidenceInput } from "../../evidence";
import type { CandidateSignal, DetectionContext } from "../types";
import { dayKey } from "../engine-helpers";

const FUNDING_EVENT_TYPES = new Set([
  "funding_round",
  "investment_event",
  "acquisition",
  "merger",
]);

/**
 * Extracts an amount ONLY when the provider text explicitly states one.
 * Returns null otherwise — Prosventa never manufactures financial data.
 */
export function extractReportedAmount(text: string): string | null {
  const match = text.match(/([$€£])\s?([\d,.]+)\s?(million|billion|m\b|bn\b|k\b)?/i);
  if (!match) return null;
  return match[0].trim();
}

export class FundingSignalDetector {
  readonly id = "funding-signal";
  readonly supportedTypes: SignalType[] = ["funding_event"];

  detect(events: ExternalSignal[], ctx: DetectionContext): CandidateSignal[] {
    const candidates: CandidateSignal[] = [];

    for (const event of events) {
      if (!FUNDING_EVENT_TYPES.has(event.eventTypeRaw.trim().toLowerCase())) {
        continue;
      }

      const haystack = `${event.title} ${event.description}`;
      const amount = extractReportedAmount(haystack);

      const evidence: NormalizedEvidenceInput = {
        provider: "external-provider-event",
        evidenceType: "article",
        sourceName: event.sourceName || null,
        sourceUrl: event.sourceUrl,
        sourceRecordId: event.providerSignalId,
        occurredAt: event.publishedAt,
        normalizedData: {
          eventTypeRaw: event.eventTypeRaw,
          confidence: event.confidence,
          eventDay: event.publishedAt ? dayKey(event.publishedAt) : null,
          ...(amount ? { reportedAmount: amount } : {}),
        },
        metadata: { detectorId: this.id },
      };

      candidates.push({
        detectorId: this.id,
        signalType: "funding_event",
        category: "company_change",
        title: event.title.trim(),
        description: event.description.trim(),
        companyKey: null, // resolved by the engine from the detection request
        person: null,
        previousCompany: null,
        amount,
        occurredAt: event.publishedAt,
        detectedAt: ctx.nowIso,
        confidence: event.confidence,
        sourceName: event.sourceName || "unknown-source",
        sourceUrl: event.sourceUrl,
        sourceRecordId: event.providerSignalId,
        provider: "external-provider-event", // overwritten by the engine
        evidence,
      });
    }

    return candidates;
  }
}
