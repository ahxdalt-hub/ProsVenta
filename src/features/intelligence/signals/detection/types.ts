// ============================================================================
// Prosventa Signals — Detection Engine Types
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================
// A CANDIDATE SIGNAL is produced by a detector from real provider data. It is
// NOT yet trusted. Only after passing per-type evidence validation does it
// become a VERIFIED signal. Anything else stays a candidate ('unverified')
// or is rejected outright — never silently upgraded.
//
// Detectors are pure-ish server-side units: they receive already-fetched,
// provider-normalized data and return candidates. They NEVER call React,
// NEVER invent data, and never depend on a specific provider response shape.
// ============================================================================

import type {
  SignalCategory,
  SignalConfidence,
  SignalType,
} from "../types";
import type { NormalizedEvidenceInput } from "../evidence";

/** A person referenced by an event (leadership change / job change). */
export interface CandidatePerson {
  /** Real name exactly as reported by the source — never guessed. */
  name: string;
  /** Raw role/title as reported (may be null when the provider omits it). */
  titleRaw: string | null;
}

/**
 * A candidate signal produced by a detector. Everything here must be
 * traceable to the attached evidence — no field may be fabricated to make
 * validation pass.
 */
export interface CandidateSignal {
  /** Which detector produced this candidate (debugging/provenance). */
  detectorId: string;
  signalType: SignalType;
  category: SignalCategory;
  title: string;
  description: string;
  /** Normalized company domain (company-level association key). */
  companyKey: string | null;
  /** Person involved, when the signal type is about a person. */
  person: CandidatePerson | null;
  /** Previous company for job changes — only when actually reported. */
  previousCompany: string | null;
  /**
   * Reported amount (funding etc.) — ONLY when the provider actually
   * returned one. Never formatted/invented by Prosventa.
   */
  amount: string | null;
  /** When the event happened per the source (null when unknown). */
  occurredAt: string | null;
  /** When Prosventa observed the event. */
  detectedAt: string;
  confidence: SignalConfidence;
  sourceName: string;
  sourceUrl: string | null;
  sourceRecordId: string | null;
  provider: string;
  /** Normalized provenance backing this candidate. */
  evidence: NormalizedEvidenceInput;
}

export type CandidateVerdict = "verified" | "candidate" | "rejected";

export interface CandidateValidationResult {
  verdict: CandidateVerdict;
  issues: Array<{ field: string; message: string }>;
}

/**
 * Detector contract. One detector per meaningful interpretation of data —
 * never one enormous function. New signal types add a detector + registry
 * entry without touching the rest of the engine.
 */
export interface SignalDetector<TInput> {
  readonly id: string;
  readonly supportedTypes: SignalType[];
  detect(input: TInput, ctx: DetectionContext): Promise<CandidateSignal[]> | CandidateSignal[];
}

/** Shared read-only context passed to every detector. */
export interface DetectionContext {
  orgId: string;
  /** Stable run identifier for correlated logging (no secrets). */
  runId: string;
  nowIso: string;
}

/** Outcome counters for one detection run. */
export interface DetectionRunResult {
  runId: string;
  candidates: number;
  rejected: number;
  created: number;
  duplicatesSkipped: number;
  evidenceAggregated: number;
  providersUsed: string[];
  errors: Array<{ provider: string; code: string }>;
}
