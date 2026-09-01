// ============================================================================
// Prosventa Signals — Central Detection Engine
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================
// Pipeline:
//   Provider data → modular detectors → candidates → evidence validation
//   → normalization → deduplication → persistence
//
// Guarantees:
//   - Server-side only; callable from manual trigger, background job, or a
//     future scheduler — never dependent on a browser being open.
//   - A candidate NEVER becomes verified without passing its type's minimum
//     evidence requirements.
//   - Duplicate events (re-runs AND second providers) never become duplicate
//     user-visible signals; the second provider's EVIDENCE is aggregated
//     onto the existing signal.
//   - DB uniqueness constraints back application-level dedupe, so concurrent
//     jobs cannot produce two logical signals for one event.
//   - Freshness/importance come from the centralized Phase 1 services.
//   - Usage is recorded per provider operation via the EXISTING usage layer
//     (signals are recorded, not charged, during development).
// ============================================================================

import { IntelligenceError } from "../../errors";
import type { CandidateSignal } from "./types";
import type { GatherOptions } from "./engine-gather";
import { validateCandidate } from "./validate";
import { computeExternalImportance } from "../external/relevance";
import { findDuplicateExternalSignal } from "../external/dedupe";
import { buildDetectionDedupeKey } from "./engine-helpers";
import {
  createDbDetectionStore,
  type DetectionStore,
  type StoredSignalCandidate,
} from "./detection-store";
import { gatherCandidates } from "./engine-gather";

export interface CandidateDecision {
  candidate: CandidateSignal;
  verdict: "verified" | "candidate" | "rejected";
  issues: Array<{ field: string; message: string }>;
}

/** Pure validation step — every detector output passes through here. */
export function decideCandidate(candidate: CandidateSignal): CandidateDecision {
  const result = validateCandidate(candidate);
  return {
    candidate,
    verdict: result.verdict,
    issues: result.issues,
  };
}

export interface PersistOutcome {
  outcome: "created" | "duplicate" | "evidence-aggregated" | "rejected";
  signalId?: string;
}

/**
 * Normalizes, deduplicates and persists ONE validated candidate.
 * Duplicate handling:
 *   1. Phase-1 anchor match (provider id / source URL / identity window)
 *      → aggregate this provider's evidence onto the existing signal.
 *   2. Exact dedupe-key insert conflict (concurrent job) → same treatment.
 */
export async function persistCandidate(
  orgId: string,
  prospectId: string | null,
  decision: CandidateDecision,
  stored: StoredSignalCandidate[],
  store: DetectionStore
): Promise<PersistOutcome> {
  const { candidate } = decision;

  // Cross-provider / re-run duplicate detection via the Phase 1 anchors.
  // Identity matching compares EVENT days, so stored candidates are viewed
  // through their occurred_at when available.
  const duplicate = findDuplicateExternalSignal(
    {
      providerSignalId: candidate.sourceRecordId,
      eventTypeRaw: candidate.signalType,
      resolvedType: candidate.signalType,
      title: candidate.title,
      description: candidate.description,
      sourceUrl: candidate.sourceUrl,
      sourceName: candidate.sourceName,
      publishedAt: candidate.occurredAt,
      retrievedAt: candidate.detectedAt,
      confidence: candidate.confidence,
    },
    stored.map((s) => ({
      ...s,
      detected_at: s.occurred_at ?? s.detected_at,
    }))
  );

  if (duplicate) {
    await attachEvidence(store, orgId, duplicate.id, candidate);
    return { outcome: "duplicate", signalId: duplicate.id };
  }

  const importance = computeExternalImportance({
    signalType: candidate.signalType,
    publishedAt: candidate.occurredAt ?? candidate.detectedAt,
    confidence: candidate.confidence,
  }).importance;

  const dedupeKey = buildDetectionDedupeKey({
    signalType: candidate.signalType,
    companyKey: candidate.companyKey,
    sourceRecordId: candidate.sourceRecordId,
    sourceUrl: candidate.sourceUrl,
    occurredAt: candidate.occurredAt,
  });

  const inserted = await store.insertSignal({
    organization_id: orgId,
    prospect_id: prospectId,
    signal_type: candidate.signalType,
    category: candidate.category,
    signal_origin: "external",
    title: candidate.title,
    description: candidate.description,
    summary: candidate.description.slice(0, 240),
    evidence: `Source: ${candidate.sourceName}${candidate.occurredAt ? ` · Event date: ${candidate.occurredAt.slice(0, 10)}` : ""}`,
    source: candidate.provider,
    source_url: candidate.sourceUrl,
    source_record_id: candidate.sourceRecordId,
    detected_at: candidate.detectedAt,
    occurred_at: candidate.occurredAt,
    confidence: candidate.confidence,
    // Only verified candidates are trusted; partial evidence stays unverified.
    status: decision.verdict === "verified" ? "verified" : "unverified",
    importance: importance ?? "medium",
    dedupe_key: dedupeKey,
    interpretation:
      "Prosventa interpretation: this observed event MAY indicate increased business activity or sales relevance. It is not proof of intent to buy.",
    provider: candidate.provider,
    provider_signal_id: candidate.sourceRecordId,
    company_key: candidate.companyKey,
  });

  if (!inserted) {
    // Lost a race against a concurrent job — the DB constraint protected us.
    const existing = await store.findSignalByDedupeKey(orgId, dedupeKey);
    if (existing) {
      await attachEvidence(store, orgId, existing.id, candidate);
      return { outcome: "evidence-aggregated", signalId: existing.id };
    }
    return { outcome: "duplicate" };
  }

  await attachEvidence(store, orgId, inserted.id, candidate);
  return { outcome: "created", signalId: inserted.id };
}

async function attachEvidence(
  store: DetectionStore,
  orgId: string,
  signalId: string,
  candidate: CandidateSignal
): Promise<void> {
  try {
    await store.insertEvidence({
      organization_id: orgId,
      signal_id: signalId,
      provider: candidate.evidence.provider || candidate.provider,
      evidence_type: candidate.evidence.evidenceType ?? "provider_record",
      source_name: candidate.sourceName,
      source_url: candidate.sourceUrl,
      source_record_id: candidate.sourceRecordId,
      occurred_at: candidate.occurredAt,
      normalized_data: candidate.evidence.normalizedData ?? {},
      metadata: candidate.evidence.metadata ?? {},
    });
  } catch (err) {
    console.error("[signals:detection] Evidence persistence failed:", err);
  }
}

// ============================================================================
// Full Run — one company
// ============================================================================

export interface CompanyRunSummary {
  created: number;
  duplicatesSkipped: number;
  evidenceAggregated: number;
  rejected: number;
  providersUsed: string[];
  errors: Array<{ provider: string; code: string }>;
  durationMs: number;
}

export async function runDetectionForCompany(
  target: {
    orgId: string;
    prospectId: string | null;
    domain: string | null;
    companyName: string | null;
  },
  options: {
    store?: DetectionStore;
    atsFetchers?: GatherOptions["atsFetchers"];
  } = {}
): Promise<CompanyRunSummary> {
  const store = options.store ?? createDbDetectionStore();
  const startedAt = Date.now();
  const ctxValue = { orgId: target.orgId, runId: crypto.randomUUID(), nowIso: new Date().toISOString() };

  const gathered = await gatherCandidates(target, ctxValue, {
    atsFetchers: options.atsFetchers,
  });
  const companyKey =
    gathered.candidates[0]?.companyKey ?? normalizeDomainSafe(target.domain);
  const stored = await store.getStoredCandidates(target.orgId, companyKey);

  const summary: CompanyRunSummary = {
    created: 0,
    duplicatesSkipped: 0,
    evidenceAggregated: 0,
    rejected: 0,
    providersUsed: gathered.providersUsed,
    errors: gathered.errors,
    durationMs: 0,
  };

  for (const candidate of gathered.candidates) {
    const decision = decideCandidate(candidate);
    if (decision.verdict === "rejected") {
      summary.rejected++;
      logDetection("rejected", { orgId: target.orgId, runId: ctxValue.runId, provider: candidate.provider, signalType: candidate.signalType, issues: decision.issues.map((i) => i.field).join(",") });
      continue;
    }
    try {
      const outcome = await persistCandidate(
        target.orgId,
        target.prospectId,
        decision,
        stored,
        store
      );
      if (outcome.outcome === "created") summary.created++;
      else if (outcome.outcome === "evidence-aggregated") summary.evidenceAggregated++;
      else summary.duplicatesSkipped++;
      logDetection(outcome.outcome, {
        orgId: target.orgId,
        runId: ctxValue.runId,
        provider: candidate.provider,
        signalType: candidate.signalType,
      });
    } catch (error) {
      const code = error instanceof IntelligenceError ? error.code : "UNKNOWN_PROVIDER_ERROR";
      summary.errors.push({ provider: candidate.provider, code });
      logDetection("failed", { orgId: target.orgId, runId: ctxValue.runId, provider: candidate.provider, signalType: candidate.signalType, errorCode: code });
    }
  }

  summary.durationMs = Date.now() - startedAt;
  return summary;
}

function normalizeDomainSafe(domain: string | null): string | null {
  if (!domain) return null;
  return domain.trim().toLowerCase().replace(/^www\./, "") || null;
}

/** Org-safe structured logging — never secrets, never API keys. */
function logDetection(
  result: string,
  details: Record<string, string | number | undefined>
): void {
  console.info("[signals:detection]", JSON.stringify({ result, ...details }));
}

