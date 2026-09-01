// ============================================================================
// Prosventa Signals — Leadership Change Detector
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================
// Consumes provider-reported executive events (already normalized to the
// Phase 1 ExternalSignal contract) and produces leadership_change candidates.
//
// TRUST RULES:
//   - Person name and role come ONLY from the provider's own text.
//   - Role normalization maps title variants into ONE category (roles.ts).
//   - Missing person or missing role → candidate is NOT produced here as
//     verified; it is emitted with what exists and the validator decides
//     (partial evidence may remain a candidate, never fabricated).
// ============================================================================

import type { ExternalSignal } from "../../external/types";
import type { SignalType } from "../../types";
import type { NormalizedEvidenceInput } from "../../evidence";
import type { CandidateSignal, DetectionContext } from "../types";

const LEADERSHIP_EVENT_TYPES = new Set([
  "executive_appointment",
  "executive_departure",
  "leadership_hiring",
]);

/** Extracts a "Name, Role" / "Name — Role" pattern deterministically. */
export function extractPersonAndRole(text: string): { name: string; title: string } | null {
  const match = text.match(
    /\b([A-Z][a-z]+(?: [A-Z][a-z'.-]+){1,2})\s*(?:,|—|–|-|as|joins? .* as)\s+((?:Chief |Head of |Vice President of |VP[.,\s]?)?[A-Z][A-Za-z ]{2,40})/
  );
  if (!match) return null;
  return { name: match[1].trim(), title: match[2].trim().replace(/\.$/, "") };
}

export class LeadershipSignalDetector {
  readonly id = "leadership-signal";
  readonly supportedTypes: SignalType[] = ["leadership_change"];

  detect(
    events: ExternalSignal[],
    ctx: DetectionContext
  ): CandidateSignal[] {
    const candidates: CandidateSignal[] = [];

    for (const event of events) {
      if (!LEADERSHIP_EVENT_TYPES.has(event.eventTypeRaw.trim().toLowerCase())) {
        continue;
      }

      const extracted =
        extractPersonAndRole(event.title) ??
        extractPersonAndRole(event.description);

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
          ...(extracted
            ? { person: extracted.name, reportedTitle: extracted.title }
            : {}),
        },
        metadata: { detectorId: this.id },
      };

      candidates.push({
        detectorId: this.id,
        signalType: "leadership_change",
        category: "company_change",
        title: event.title.trim(),
        description: event.description.trim(),
        companyKey: null, // resolved by the engine from the detection request
        person: extracted
          ? { name: extracted.name, titleRaw: extracted.title }
          : event.title.trim()
            ? { name: event.title.trim(), titleRaw: null }
            : null,
        previousCompany: null,
        amount: null,
        occurredAt: event.publishedAt,
        detectedAt: ctx.nowIso,
        confidence: event.confidence,
        sourceName: event.sourceName || "unknown-source",
        sourceUrl: event.sourceUrl,
        sourceRecordId: event.providerSignalId,
        // The engine overwrites this with the actual provider id.
        provider: "external-provider-event",
        evidence,
      });
    }

    return candidates;
  }
}
