// ============================================================================
// Prosventa Recommendations — Feature 5: Phase 2
// Selective AI Reasoning with Schema Validation & Hallucination Protection
// ============================================================================
// AI is used ONLY when deterministic logic cannot provide enough contextual
// explanation (conflicting evidence, reassessment). It NEVER controls:
//
//   organization ID, user ID, ownership, authorization, priority, confidence,
//   external actions, or credit charges.
//
// Every AI response is strictly validated against the output schema and
// against the supplied evidence. Unsupported claims are REJECTED — the
// deterministic explanation is used instead. Nothing unsupported persists.
// ============================================================================

import { CANDIDATE_RECOMMENDATION_TYPE } from "./types";
import type {
  AiExplanationProvider,
  AiExplanationRequest,
  AiExplanationResult,
  AiRecommendationExplanation,
  CandidateType,
} from "./types";

// ============================================================================
// Output constraints (§30)
// ============================================================================

export const EXPLANATION_MIN_LENGTH = 20;
export const EXPLANATION_MAX_LENGTH = 280;

/** Generic AI filler phrases that must never appear in persisted explanations. */
const GENERIC_FILLER_PATTERNS: RegExp[] = [
  /based on (our|the) advanced analysis/i,
  /appears to be an excellent opportunity/i,
  /as an ai(?: language model)?/i,
  /cutting-edge/i,
];

/**
 * Validates the raw AI string against the strict output schema plus semantic
 * guards. Returns a parsed explanation or a rejection reason.
 */
export function validateAiExplanation(
  raw: string | null,
  request: AiExplanationRequest
): AiExplanationResult {
  const fail = (rejectedBecause: string): AiExplanationResult => ({
    ok: false,
    value: null,
    rejectedBecause,
  });

  if (!raw || typeof raw !== "string") return fail("empty_response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail("malformed_json");
  }

  if (typeof parsed !== "object" || parsed === null) return fail("not_an_object");
  const obj = parsed as Record<string, unknown>;

  // --- Schema correctness ---
  const recommendationType = obj.recommendation_type;
  if (typeof recommendationType !== "string") return fail("missing_recommendation_type");

  const expectedType = CANDIDATE_RECOMMENDATION_TYPE[request.candidateType];
  if (recommendationType !== expectedType && recommendationType !== request.recommendationType) {
    return fail("recommendation_type_mismatch");
  }

  // The AI may never change the candidate — only explain it.
  if (
    !Object.values(CANDIDATE_RECOMMENDATION_TYPE).includes(
      recommendationType as AiRecommendationExplanation["recommendation_type"]
    )
  ) {
    return fail("unknown_recommendation_type");
  }

  const explanation = obj.explanation;
  if (typeof explanation !== "string") return fail("missing_explanation");
  const trimmed = explanation.trim();
  if (trimmed.length < EXPLANATION_MIN_LENGTH || trimmed.length > EXPLANATION_MAX_LENGTH) {
    return fail("explanation_length_out_of_bounds");
  }
  if (GENERIC_FILLER_PATTERNS.some((p) => p.test(trimmed))) {
    return fail("generic_filler_language");
  }
  // Sales-pressure wording is never allowed in explanations.
  if (/\b(contact immediately|will buy|guaranteed|close this lead)\b/i.test(trimmed)) {
    return fail("non_cautionary_language");
  }

  const confidenceReason = obj.confidence_reason;
  if (typeof confidenceReason !== "string" || confidenceReason.trim().length === 0) {
    return fail("missing_confidence_reason");
  }

  // --- Evidence ID validation (§28): only supplied IDs may be cited ---
  const evidenceIds = obj.evidence_ids;
  if (!Array.isArray(evidenceIds)) return fail("evidence_ids_not_array");
  const allowedIds = new Set(request.evidence.map((e) => e.id));
  for (const id of evidenceIds) {
    if (typeof id !== "string" || !allowedIds.has(id)) {
      return fail("unauthorized_or_unknown_evidence_id");
    }
  }
  if (evidenceIds.length === 0) {
    return fail("no_evidence_cited");
  }

  // --- Hallucination protection (§29) ---
  if (containsUnsupportedClaims(trimmed, request)) {
    return fail("unsupported_claim");
  }

  return {
    ok: true,
    value: {
      recommendation_type: recommendationType as AiRecommendationExplanation["recommendation_type"],
      explanation: trimmed,
      confidence_reason: confidenceReason.trim(),
      evidence_ids: evidenceIds as string[],
    },
  };
}

/**
 * Detects factual claims NOT supported by the supplied evidence labels/details
 * or conflict summaries. Any claim keyword appearing without matching evidence
 * is treated as hallucination and rejected (§29).
 */
const CLAIM_KEYWORDS: Array<{ pattern: RegExp; topicPattern: RegExp }> = [
  { pattern: /\braised funding|funding round|series [a-c]\b/i, topicPattern: /fund|invest|series|capital/ },
  { pattern: /\bnew (vp|c[eto]o|chief|director)|hired\b/i, topicPattern: /vp|leadership|hiring|director|executive/ },
  { pattern: /\blayoffs?|reduced headcount|downsiz/i, topicPattern: /layoff|headcount|downsiz|freeze/ },
  { pattern: /\bexpansion|expanding into|opened (an? )?office/i, topicPattern: /expansion|expanding|office|growth/ },
  { pattern: /\bacquired|acquisition|merger\b/i, topicPattern: /acqui|merger/ },
];

export function containsUnsupportedClaims(
  explanation: string,
  request: AiExplanationRequest
): boolean {
  const supportedText = [
    ...request.evidence.map((e) => `${e.label} ${e.detail}`),
    ...request.conflicts.map((c) => c.summary),
  ]
    .join(" ")
    .toLowerCase();

  for (const { pattern, topicPattern } of CLAIM_KEYWORDS) {
    if (pattern.test(explanation)) {
      // The claim topic must be present somewhere in the actual evidence.
      if (!topicPattern.test(supportedText)) return true;
    }
  }
  return false;
}

// ============================================================================
// Selective invocation wrapper
// ============================================================================

/**
 * Deterministic decision of whether AI adds value: conflicting evidence and
 * reassessments benefit from contextual synthesis; everything else is fully
 * explained deterministically. Cost protection is structural (§35).
 */
export function shouldUseAi(
  candidateType: CandidateType,
  request: AiExplanationRequest
): boolean {
  const aiWorthy: CandidateType[] = ["REASSESS_PROSPECT"];
  return aiWorthy.includes(candidateType) || request.conflicts.length > 0;
}

/**
 * Runs validated AI reasoning for a candidate. Returns null whenever AI is
 * unnecessary — the caller then uses the deterministic explanation.
 */
export async function generateValidatedAiExplanation(
  candidateType: CandidateType,
  request: AiExplanationRequest,
  provider: AiExplanationProvider,
  options?: { force?: boolean }
): Promise<AiExplanationResult | null> {
  // Cost management (§35): skip AI unless genuinely needed.
  if (!options?.force && !shouldUseAi(candidateType, request)) return null;

  try {
    const raw = await provider(request);
    return validateAiExplanation(raw, request);
  } catch {
    return { ok: false, value: null, rejectedBecause: "provider_failure" };
  }
}
