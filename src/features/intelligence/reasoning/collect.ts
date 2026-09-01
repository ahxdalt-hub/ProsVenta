// ============================================================================
// Prosventa Intelligence — Context Collection (server)
// Feature 4 — Phase 1: gathers existing data into the normalized ReasoningInput.
// ============================================================================
// Reuses EXISTING systems only: icp_configurations, prospects,
// company_enrichments / prospect_enrichments, signals (+ their freshness
// architecture). No duplication of those records — facts are compact
// projections with provenance; evidence refs point at source rows.
// ============================================================================

import type {
  EvidenceRefInput,
  IntelligenceScope,
} from "./types";
import {
  computeReasoningInputDigest,
  isFactKnown,
  knownFact,
  unknownFact,
  type ReasoningFact,
  type ReasoningHistoricalContext,
  type ReasoningInput,
  type ReasoningSignal,
  type ReasoningSubject,
} from "./context";
import { getExternalSignalFreshness } from "../signals/external/freshness";
import type { IcpConfiguration } from "../scoring/types";

/** Minimal shapes of existing rows consumed here (no provider payloads). */
interface ProspectRow {
  id: string;
  organization_id: string;
  company_name: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  employee_count: number | null;
  updated_at: string | null;
}

interface SignalRow {
  id: string;
  signal_type: string;
  title: string;
  summary: string | null;
  status: string;
  importance?: string | null;
  confidence?: string | null;
  occurred_at: string | null;
  detected_at: string;
  source: string | null;
  source_url: string | null;
}

export interface CollectedContext {
  input: ReasoningInput;
  digest: string;
  /** True when at least some subject facts exist (never all-unknown). */
  hasAnyEvidence: boolean;
}

function factToRef(fact: ReasoningFact): EvidenceRefInput | null {
  if (!isFactKnown(fact) || !fact.sourceTable || !fact.sourceRecordId) return null;
  return {
    refType:
      fact.sourceTable === "prospects"
        ? "prospect"
        : fact.sourceTable.endsWith("enrichments")
          ? "enrichment"
          : "company",
    tableName: fact.sourceTable,
    recordId: fact.sourceRecordId,
    capturedAt: fact.observedAt,
  };
}

export function buildSubjectFacts(
  scope: IntelligenceScope,
  prospect: ProspectRow | null
): { prospectFacts: ReasoningFact[]; companyFacts: ReasoningFact[] } {
  const prospectFacts: ReasoningFact[] = prospect
    ? [
        knownFact("prospect.name", prospect.contact_name, "prospects", prospect.id, prospect.updated_at),
        knownFact("prospect.email", prospect.contact_email, "prospects", prospect.id, prospect.updated_at),
      ]
    : [];
  const companyFacts: ReasoningFact[] = [
    knownFact("company.name", prospect?.company_name ?? null, prospect ? "prospects" : null, prospect?.id ?? null),
    knownFact("company.industry", prospect?.industry ?? null, prospect ? "prospects" : null, prospect?.id ?? null),
    knownFact("company.location", prospect?.location ?? null, prospect ? "prospects" : null, prospect?.id ?? null),
    knownFact("company.employee_count", prospect?.employee_count ?? null, prospect ? "prospects" : null, prospect?.id ?? null),
    unknownFact("company.technologies"),
  ];
  void scope;
  return { prospectFacts, companyFacts };
}

export function toReasoningSignals(rows: SignalRow[]): ReasoningSignal[] {
  return rows.map((s) => ({
    signalId: s.id,
    signalType: s.signal_type,
    title: s.title,
    summary: s.summary ?? null,
    status: s.status,
    importance: s.importance ?? null,
    confidence: s.confidence ?? null,
    occurredAt: s.occurred_at ?? null,
    detectedAt: s.detected_at,
    freshness: getExternalSignalFreshness(s.occurred_at ?? s.detected_at),
    source: s.source ?? null,
    sourceUrl: s.source_url ?? null,
  }));
}

export function signalRefs(signals: ReasoningSignal[]): EvidenceRefInput[] {
  return signals.map((s) => ({
    refType: "signal" as const,
    tableName: "signals",
    recordId: s.signalId,
    source: s.source,
    occurredAt: s.occurredAt,
    freshness: s.freshness,
  }));
}

export function icpRef(icp: IcpConfiguration | null): EvidenceRefInput[] {
  return icp
    ? [{ refType: "icp" as const, tableName: "icp_configurations", recordId: icp.id }]
    : [];
}

export function finalizeContext(
  organizationId: string,
  subject: ReasoningSubject,
  icp: IcpConfiguration | null,
  prospectFacts: ReasoningFact[],
  companyFacts: ReasoningFact[],
  enrichment: ReasoningInput["enrichment"],
  signals: ReasoningSignal[],
  historical: ReasoningHistoricalContext
): CollectedContext {
  const refs = [
    ...icpRef(icp),
    ...prospectFacts.map(factToRef),
    ...companyFacts.map(factToRef),
    ...signalRefs(signals),
  ].filter((r): r is EvidenceRefInput => r !== null);

  const input: ReasoningInput = {
    organizationId,
    subject,
    icp: icp
      ? { configurationId: icp.id, name: icp.name, criteria: icp.criteria }
      : null,
    prospectFacts,
    companyFacts,
    enrichment,
    // Compact context: most recent verified/live signals only.
    signals: signals.slice(0, 20),
    historical,
    evidenceRefs: refs,
    generatedAt: new Date().toISOString(),
  };

  const hasAnyEvidence =
    [...prospectFacts, ...companyFacts].some(isFactKnown) || signals.length > 0;

  return { input, digest: computeReasoningInputDigest(input), hasAnyEvidence };
}
