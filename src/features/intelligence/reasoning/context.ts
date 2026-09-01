// ============================================================================
// Prosventa Intelligence — Reasoning Input Model
// Feature 4 — Phase 1: normalized, compact context for the reasoning engine.
// ============================================================================
// The Phase 2 engine consumes this structure — it must NEVER query dozens of
// unrelated tables directly, and never receives raw provider payloads or whole
// database records. FACT data is separated from INTERPRETATION data: an
// interpretation ("may indicate increased hiring") is never stored as fact.
// ============================================================================

import { createHash } from "node:crypto";
import type { IcpCriteria } from "../scoring/types";
import type {
  EvidenceRefInput,
  IntelligenceScope,
} from "./types";

/** A single normalized fact. Facts are observations only — no conclusions. */
export interface ReasoningFact {
  /** Machine-stable key, e.g. "company.employee_count". */
  key: string;
  value: string | number | boolean | null;
  /** Where this fact came from (existing table). */
  sourceTable: string | null;
  sourceRecordId: string | null;
  observedAt: string | null;
}

/**
 * A signal included in reasoning context. Only identity + normalized summary —
 * never the provider payload.
 */
export interface ReasoningSignal {
  signalId: string;
  signalType: string;
  title: string;
  summary: string | null;
  status: string;
  /** Canonical importance from the Signals system ('critical'|'high'|'medium'|'low'). */
  importance?: string | null;
  /** Canonical provider confidence from the Signals system ('high'|'medium'|'low'). */
  confidence?: string | null;
  occurredAt: string | null;
  detectedAt: string;
  freshness: "recent" | "aging" | "historical";
  source: string | null;
  sourceUrl: string | null;
}

/**
 * Historical context: what Prosventa already knows happened before now.
 * Compact counts + most recent items only — never full histories.
 */
export interface ReasoningHistoricalContext {
  priorInsightVersion: number | null;
  priorGeneratedAt: string | null;
  enrichmentLastRetrievedAt: string | null;
  activityCounts: Record<string, number>;
}

export interface ReasoningSubject {
  scope: IntelligenceScope;
  prospectId: string | null;
  companyKey: string | null;
  companyName: string | null;
}

/**
 * The complete, compact reasoning input. Every field is either a normalized
 * fact with provenance or an explicit unknown — missing data is represented,
 * not guessed.
 */
export interface ReasoningInput {
  organizationId: string;
  subject: ReasoningSubject;
  /** Workspace ICP criteria snapshot, or null when no ICP exists. */
  icp: { configurationId: string; name: string; criteria: IcpCriteria } | null;
  prospectFacts: ReasoningFact[];
  companyFacts: ReasoningFact[];
  /** Enrichment availability flags — presence matters for confidence later. */
  enrichment: {
    hasCompanyEnrichment: boolean;
    hasProspectEnrichment: boolean;
    lastRetrievedAt: string | null;
    availableFields: string[];
  };
  signals: ReasoningSignal[];
  historical: ReasoningHistoricalContext;
  evidenceRefs: EvidenceRefInput[];
  generatedAt: string;
}

// ============================================================================
// Fact helpers
// ============================================================================

/** Creates a fact from a known value. */
export function knownFact(
  key: string,
  value: string | number | boolean | null,
  sourceTable: string | null,
  sourceRecordId: string | null,
  observedAt?: string | null
): ReasoningFact {
  return { key, value, sourceTable, sourceRecordId, observedAt: observedAt ?? null };
}

/** Creates an explicit UNKNOWN fact — critical distinction vs mismatch. */
export function unknownFact(key: string): ReasoningFact {
  return { key, value: null, sourceTable: null, sourceRecordId: null, observedAt: null };
}

/** True when a fact's value is present (not null/empty). */
export function isFactKnown(fact: ReasoningFact): boolean {
  return (
    fact.value !== null &&
    fact.value !== undefined &&
    !(typeof fact.value === "string" && fact.value.trim() === "")
  );
}

// ============================================================================
// Digest (caching / invalidation foundation)
// ============================================================================
// Stable hash over the semantic content of the reasoning input. Same evidence
// → same digest → existing intelligence can be reused instead of regenerated.
// Timestamps that change on every build are excluded from the digest so that
// identical evidence does not invalidate cached intelligence.
// ============================================================================

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

export function computeReasoningInputDigest(input: ReasoningInput): string {
  const material = {
    organizationId: input.organizationId,
    subject: input.subject,
    icp: input.icp,
    prospectFacts: input.prospectFacts.map((f) => [f.key, f.value]),
    companyFacts: input.companyFacts.map((f) => [f.key, f.value]),
    enrichment: input.enrichment,
    signals: input.signals.map((s) => [
      s.signalId,
      s.signalType,
      s.status,
      s.importance,
      s.summary,
      s.freshness,
    ]),
    historical: {
      priorInsightVersion: input.historical.priorInsightVersion,
      enrichmentLastRetrievedAt: input.historical.enrichmentLastRetrievedAt,
    },
  };
  return createHash("sha256").update(stableStringify(material)).digest("hex");
}
