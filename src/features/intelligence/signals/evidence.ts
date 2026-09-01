// ============================================================================
// Prosventa Signals — Evidence Model (normalized)
// Feature 3 — Phase 1: Signal Foundation & Data Architecture
// ============================================================================
// Signals must be evidence-based. This module normalizes provider evidence into
// a consistent structure and enforces MINIMUM evidence requirements — a signal
// without trustworthy evidence is never created.
//
// Evidence is normalized provenance, NOT raw provider responses. The user must
// eventually be able to understand: "Why did Prosventa show me this signal?"
// ============================================================================

import type {
  SignalEvidenceInsert,
  SignalEvidenceType,
} from "./types";

export interface NormalizedEvidenceInput {
  provider: string;
  evidenceType?: SignalEvidenceType;
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceRecordId?: string | null;
  /** When the evidenced event happened per the source */
  occurredAt?: string | null;
  /** When Prosventa captured the evidence */
  capturedAt?: string | null;
  /** Non-secret normalized subset of the provider payload */
  normalizedData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface EvidenceValidationIssue {
  field: string;
  message: string;
}

/** Only public http(s) URLs may be stored as evidence sources. */
export function sanitizeEvidenceUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function dayKey(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * Builds a deterministic dedupe key for a piece of evidence. The same source
 * record captured repeatedly for one signal collapses to a single evidence row:
 *   provider | evidence_type | source_record_id | source_url | occurred_day
 */
export function buildEvidenceDedupeKey(input: NormalizedEvidenceInput): string {
  return [
    input.provider || "unknown-provider",
    input.evidenceType ?? "provider_record",
    input.sourceRecordId ?? "no-record-id",
    sanitizeEvidenceUrl(input.sourceUrl) ?? "no-url",
    (input.occurredAt && dayKey(input.occurredAt)) ?? "undated",
  ].join("|");
}

/**
 * Validates MINIMUM evidence requirements. A signal whose evidence fails these
 * checks must NOT be created — we do not store unevidenced events.
 *
 * Requirements:
 *   - a named provider/source
 *   - at least ONE anchor: source_record_id OR a public source_url
 *   - a parseable event date when claimed (never invent dates)
 */
export function validateEvidence(
  input: NormalizedEvidenceInput
): EvidenceValidationIssue[] {
  const issues: EvidenceValidationIssue[] = [];

  if (!input.provider || !input.provider.trim()) {
    issues.push({ field: "provider", message: "A provider/source name is required." });
  }

  if (!input.sourceRecordId?.trim() && !sanitizeEvidenceUrl(input.sourceUrl)) {
    issues.push({
      field: "source",
      message:
        "At least one anchor (source record id or public source URL) is required.",
    });
  }

  if (
    input.occurredAt &&
    Number.isNaN(new Date(input.occurredAt).getTime())
  ) {
    issues.push({
      field: "occurred_at",
      message: "An invalid event date cannot be stored — never invent dates.",
    });
  }

  return issues;
}

/**
 * Normalizes raw evidence into the DB insert shape. Returns null when minimum
 * evidence requirements are not met (caller must drop the event entirely).
 */
export function toEvidenceInsert(
  input: NormalizedEvidenceInput,
  organizationId: string,
  signalId: string
): SignalEvidenceInsert | null {
  if (validateEvidence(input).length > 0) return null;

  return {
    organization_id: organizationId,
    signal_id: signalId,
    provider: input.provider.trim(),
    evidence_type: input.evidenceType ?? "provider_record",
    source_name: input.sourceName?.trim() ?? null,
    source_url: sanitizeEvidenceUrl(input.sourceUrl),
    source_record_id: input.sourceRecordId?.trim() ?? null,
    occurred_at: input.occurredAt ? new Date(input.occurredAt).toISOString() : null,
    captured_at: input.capturedAt ? new Date(input.capturedAt).toISOString() : undefined,
    normalized_data: input.normalizedData ?? {},
    metadata: input.metadata ?? {},
    dedupe_key: buildEvidenceDedupeKey(input),
  };
}