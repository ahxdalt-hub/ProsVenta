// ============================================================================
// Prosventa Intelligence — Structured AI Output Schema
// Feature 4 — Phase 1: strict, typed validation of engine output.
// ============================================================================
// The AI/model layer's output is NEVER the system's source of truth on its own:
// arbitrary text is rejected. Every claim must carry grounding references to
// evidence that was actually provided in the reasoning input. Malformed,
// ungrounded or out-of-range responses are rejected wholesale — we never
// partially accept invented content.
// ============================================================================

import type { IntelligenceDimension } from "./types";
import type { ReasoningInput } from "./context";

/** Grounding reference: an explanation factor must point at real evidence. */
export interface OutputGroundingRef {
  /** Must match a recordId present in reasoningInput.evidenceRefs. */
  refId: string;
}

export interface OutputFactor {
  id: string;
  label: string;
  polarity: "positive" | "negative";
  status: "match" | "mismatch" | "unknown";
  detail?: string | null;
  grounding?: OutputGroundingRef[];
}

export interface OutputDimension {
  dimension: IntelligenceDimension;
  /** 0–100 or null when there is insufficient evidence. */
  score: number | null;
  status: "match" | "mismatch" | "unknown" | "not_applicable";
  summary: string | null;
  positive_factors: OutputFactor[];
  negative_factors: OutputFactor[];
  unknown_fields: string[];
}

/**
 * The strict AI output contract (Phase 2 engines must emit exactly this).
 * Deliberately mirrors the DB `scores` block so validated output can be
 * persisted without re-shaping.
 */
export interface AiIntelligenceOutput {
  dimensions: Partial<Record<IntelligenceDimension, OutputDimension>>;
  key_factors: OutputFactor[];
  concerns: OutputFactor[];
  explanation: string | null;
}

export type AiOutputValidationIssue = { field: string; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateScore(value: unknown, field: string, issues: AiOutputValidationIssue[]): void {
  if (value === null) return; // insufficient evidence is allowed
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    issues.push({ field, message: "score must be null or a finite number in 0–100." });
  }
}

function validateFactors(
  value: unknown,
  field: string,
  issues: AiOutputValidationIssue[],
  validRefIds: Set<string>
): void {
  if (!Array.isArray(value)) {
    issues.push({ field, message: "factors must be an array." });
    return;
  }
  for (const f of value) {
    if (!isRecord(f)) {
      issues.push({ field, message: "each factor must be an object." });
      continue;
    }
    if (typeof f.id !== "string" || !f.id) issues.push({ field: `${field}.id`, message: "id is required." });
    if (typeof f.label !== "string" || !f.label) issues.push({ field: `${field}.label`, message: "label is required." });
    if (f.polarity !== "positive" && f.polarity !== "negative") {
      issues.push({ field: `${field}.polarity`, message: 'polarity must be "positive" or "negative".' });
    }
    if (f.status !== "match" && f.status !== "mismatch" && f.status !== "unknown") {
      issues.push({ field: `${field}.status`, message: 'status must be "match", "mismatch" or "unknown".' });
    }
    const grounding = f.grounding;
    if (grounding !== undefined && grounding !== null) {
      if (!Array.isArray(grounding)) {
        issues.push({ field: `${field}.grounding`, message: "grounding must be an array." });
      } else {
        for (const g of grounding) {
          const refId = isRecord(g) ? g.refId : undefined;
          if (typeof refId !== "string" || !validRefIds.has(refId)) {
            issues.push({
              field: `${field}.grounding`,
              message: `unsupported citation "${String(refId)}" — grounding refs must point at provided evidence.`,
            });
          }
        }
      }
    }
  }
}



/**
 * Validates a raw engine response against the strict schema and grounds every
 * citation in the evidence that was actually provided.
 */
export function validateAiIntelligenceOutput(
  raw: unknown,
  input: ReasoningInput
): { ok: true; output: AiIntelligenceOutput } | { ok: false; issues: AiOutputValidationIssue[] } {
  const issues: AiOutputValidationIssue[] = [];
  const validRefIds = new Set(input.evidenceRefs.map((r) => r.recordId));

  if (!isRecord(raw)) {
    return { ok: false, issues: [{ field: "$root", message: "output must be a JSON object." }] };
  }

  const dims = raw.dimensions;
  if (!isRecord(dims)) {
    issues.push({ field: "dimensions", message: "dimensions must be an object." });
  } else {
    for (const [key, value] of Object.entries(dims)) {
      const field = `dimensions.${key}`;
      if (!isRecord(value)) {
        issues.push({ field, message: "dimension must be an object." });
        continue;
      }
      validateScore(value.score, `${field}.score`, issues);
      if (
        value.status !== "match" &&
        value.status !== "mismatch" &&
        value.status !== "unknown" &&
        value.status !== "not_applicable"
      ) {
        issues.push({ field: `${field}.status`, message: "invalid dimension status." });
      }
      validateFactors(value.positive_factors, `${field}.positive_factors`, issues, validRefIds);
      validateFactors(value.negative_factors, `${field}.negative_factors`, issues, validRefIds);
      if (value.unknown_fields !== undefined && !Array.isArray(value.unknown_fields)) {
        issues.push({ field: `${field}.unknown_fields`, message: "unknown_fields must be an array." });
      }
    }
  }

  validateFactors(raw.key_factors, "key_factors", issues, validRefIds);
  validateFactors(raw.concerns, "concerns", issues, validRefIds);

  if (raw.explanation !== null && typeof raw.explanation !== "string") {
    issues.push({ field: "explanation", message: "explanation must be a string or null." });
  }

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    output: {
      dimensions: dims as AiIntelligenceOutput["dimensions"],
      key_factors: (raw.key_factors ?? []) as OutputFactor[],
      concerns: (raw.concerns ?? []) as OutputFactor[],
      explanation: (raw.explanation ?? null) as string | null,
    },
  };
}
