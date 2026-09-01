// ============================================================================
// Prosventa Signals — Hiring Signal Detector
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================
// Turns NORMALIZED ATS job-board postings into AT MOST ONE hiring_activity
// candidate per board snapshot. A single random posting is NOT hiring
// activity (spec §6) — the detector requires either:
//   - ≥ 2 relevant open roles (sales/marketing/growth/CS/engineering), OR
//   - ≥ 5 total open roles on the board
//
// Evidence carries the actual counts and detected roles so the future UI can
// answer: what happened, where, when, and why should I care.
// ============================================================================

import type { SignalType } from "../../types";
import type { NormalizedEvidenceInput } from "../../evidence";
import type { CandidateSignal, DetectionContext } from "../types";

/** One normalized job posting (provider-shape already stripped by adapters). */
export interface AtsJobPosting {
  id: string;
  title: string;
  location?: string | null;
  url?: string | null;
  /** When the posting was last updated per the provider (may be null). */
  updatedAt: string | null;
}

const RELEVANT_ROLE_PATTERN =
  /\b(sales|account executive|business development|marketing|growth|customer success|partnerships|engineer|engineering)\b/i;

export function classifyRelevantPosting(posting: AtsJobPosting): boolean {
  return RELEVANT_ROLE_PATTERN.test(posting.title);
}

const MIN_RELEVANT_ROLES = 2;
const MIN_TOTAL_ROLES = 5;

function dayKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export interface HiringDetectorInput {
  providerId: string;
  /** ATS board slug actually used for the request. */
  boardSlug: string;
  companyName: string | null;
  domain: string | null;
  postings: AtsJobPosting[];
  /** Public board URL (provenance anchor when no per-job URL is used). */
  boardUrl: string;
}

export class HiringSignalDetector {
  readonly id = "hiring-signal";
  readonly supportedTypes: SignalType[] = ["hiring_activity"];

  detect(
    input: HiringDetectorInput,
    ctx: DetectionContext
  ): CandidateSignal[] {
    const relevant = input.postings.filter(classifyRelevantPosting);
    const total = input.postings.length;

    // Not enough activity to honestly call this a hiring signal.
    if (relevant.length < MIN_RELEVANT_ROLES && total < MIN_TOTAL_ROLES) {
      return [];
    }

    const latestUpdate = input.postings
      .map((p) => p.updatedAt)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;

    const occurredAt = latestUpdate;
    const detectedAt = ctx.nowIso;
    const detectedRoles = Array.from(
      new Set(relevant.slice(0, 10).map((p) => p.title.trim()))
    );

    const evidence: NormalizedEvidenceInput = {
      provider: input.providerId,
      evidenceType: "provider_record",
      sourceName: `${input.providerId} job board (${input.boardSlug})`,
      sourceUrl: input.boardUrl,
      sourceRecordId: `${input.providerId}:${input.boardSlug}:${dayKey(latestUpdate) ?? "undated"}`,
      occurredAt,
      normalizedData: {
        openJobCount: total,
        relevantJobCount: relevant.length,
        detectedRoles,
        boardSlug: input.boardSlug,
      },
      metadata: { detectorId: this.id },
    };

    const companyLabel = input.companyName ?? input.domain ?? input.boardSlug;

    return [
      {
        detectorId: this.id,
        signalType: "hiring_activity",
        category: "company_change",
        title: `${companyLabel} shows active hiring (${total} open roles, ${relevant.length} in relevant functions)`,
        description: `Public job board data shows ${total} open positions, including ${relevant.length} in sales/marketing/growth/engineering functions. Roles observed: ${detectedRoles.slice(0, 5).join("; ")}.`,
        companyKey: input.domain,
        person: null,
        previousCompany: null,
        amount: null,
        occurredAt,
        detectedAt,
        confidence: "medium",
        sourceName: `${input.providerId} job board (${input.boardSlug})`,
        sourceUrl: input.boardUrl,
        sourceRecordId: evidence.sourceRecordId ?? null,
        provider: input.providerId,
        evidence,
      },
    ];
  }
}
