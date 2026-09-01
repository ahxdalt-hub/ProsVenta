// ============================================================================
// Prosventa Intelligence â€” Serializable View Model
// Feature 4 â€” Phase 3: Premium Intelligence Experience & Product Integration
// ============================================================================
// Pure mapping layer between the STORED insight row (Phase 2 output) and the
// UI. Contains NO calculations that could drift from the engine: priority
// categories reuse the documented deterministic thresholds, confidence uses
// the stored breakdown as-is, and unknown data stays unknown.
// ============================================================================

import type {
  ConfidenceBreakdown,
  IntelligenceDimension,
  IntelligenceFactor,
  IntelligenceFactorStatus,
} from "./types";

// ----------------------------------------------------------------------------
// Stored shapes (JSONB blocks persisted by Phase 2)
// ----------------------------------------------------------------------------

export interface StoredDimensionAssessment {
  dimension: IntelligenceDimension;
  score: number | null;
  status: IntelligenceFactorStatus | "not_applicable";
  summary: string | null;
  positive_factors: IntelligenceFactor[];
  negative_factors: IntelligenceFactor[];
  unknown_fields: string[];
}

export type StoredFactor = IntelligenceFactor;

// ----------------------------------------------------------------------------
// View model
// ----------------------------------------------------------------------------

/** Overall lifecycle of Intelligence for one subject, from the UI's perspective. */
export type IntelligenceViewState =
  | "none" // no attempt has ever been made
  | "processing" // generation currently running
  | "ready"
  | "stale" // ready but newer evidence exists
  | "failed"
  | "insufficient_evidence";

export interface IntelligenceEvidenceItem {
  refId: string;
  /** Presentation label derived from the ref type â€” never an invented fact. */
  typeLabel: string;
  source: string | null;
  occurredAt: string | null;
  capturedAt: string | null;
  freshness: string | null;
  note: string | null;
}

export interface IntelligenceView {
  state: IntelligenceViewState;
  /** Human message for failed / insufficient states â€” safe, no internals. */
  message: string | null;
  explanation: string | null;
  dimensions: StoredDimensionAssessment[];
  keyFactors: StoredFactor[];
  concerns: StoredFactor[];
  confidence: ConfidenceBreakdown | null;
  generatedAt: string | null;
  newestEvidenceAt: string | null;
  evidence: IntelligenceEvidenceItem[];
}

// ----------------------------------------------------------------------------
// Priority categories â€” SAME thresholds as computeOverallPriority (Â§25)
// ----------------------------------------------------------------------------

export const PRIORITY_CATEGORY_THRESHOLDS = [
  { min: 80, category: "very_high" },
  { min: 60, category: "high" },
  { min: 40, category: "medium" },
  { min: 20, category: "low" },
] as const;

export function priorityCategoryForScore(
  score: number | null
): "very_high" | "high" | "medium" | "low" | "very_low" | "unknown" {
  if (score === null || !Number.isFinite(score)) return "unknown";
  for (const t of PRIORITY_CATEGORY_THRESHOLDS) {
    if (score >= t.min) return t.category;
  }
  return "very_low";
}

// ----------------------------------------------------------------------------
// Evidence ref labels (ref_type â†’ presentation)
// ----------------------------------------------------------------------------

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  icp: "ICP criteria",
  prospect: "Prospect data",
  company: "Company data",
  enrichment: "Enrichment",
  signal: "Verified signal",
  score: "Match score",
  activity: "Workspace activity",
};

export function evidenceTypeLabel(refType: string): string {
  return EVIDENCE_TYPE_LABELS[refType] ?? "Evidence";
}

// ----------------------------------------------------------------------------
// Row → view mapping
// ----------------------------------------------------------------------------

export interface InsightRowLike {
  status: string;
  explanation: string | null;
  scores: Record<string, unknown> | null;
  key_factors: unknown[] | null;
  concerns: unknown[] | null;
  confidence: Record<string, unknown> | null;
  freshness: Record<string, unknown> | null;
  generated_at: string | null;
}

export interface EvidenceRowLike {
  id: string;
  ref_type: string;
  source: string | null;
  occurred_at: string | null;
  captured_at: string | null;
  freshness: string | null;
  note: string | null;
}


function asFactors(value: unknown): StoredFactor[] {
  if (!Array.isArray(value)) return [];
  const raw = value.filter(
    (f): f is StoredFactor =>
      typeof f === "object" &&
      f !== null &&
      typeof (f as StoredFactor).id === "string" &&
      typeof (f as StoredFactor).label === "string"
  );
  // Factors may come from model output: ids can be missing/empty and can
  // repeat. React keys derive from `id` (IntelligencePanel FactorRow), so
  // normalize here — never at the render site — to keep keys stable and unique.
  const seen = new Set<string>();
  return raw.map((f, i) => {
    let id = f.id.trim() || `factor-${i}`;
    while (seen.has(id)) id = `${id}-${i}`;
    seen.add(id);
    return id === f.id ? f : { ...f, id };
  });
}

const DIMENSION_ORDER: IntelligenceDimension[] = [
  "overall_priority",
  "icp_fit",
  "business_relevance",
  "timing",
  "evidence_strength",
];

function asDimensions(scores: Record<string, unknown> | null): StoredDimensionAssessment[] {
  const raw = scores?.dimensions;
  if (typeof raw !== "object" || raw === null) return [];
  const out: StoredDimensionAssessment[] = [];
  for (const value of Object.values(raw as Record<string, unknown>)) {
    if (typeof value !== "object" || value === null) continue;
    const d = value as Partial<StoredDimensionAssessment>;
    if (typeof d.dimension !== "string") continue;
    out.push({
      dimension: d.dimension,
      score: typeof d.score === "number" ? d.score : null,
      status: (d.status ?? "unknown") as StoredDimensionAssessment["status"],
      summary: typeof d.summary === "string" ? d.summary : null,
      positive_factors: asFactors(d.positive_factors),
      negative_factors: asFactors(d.negative_factors),
      unknown_fields: Array.isArray(d.unknown_fields)
        ? d.unknown_fields.filter((f): f is string => typeof f === "string")
        : [],
    });
  }
  return out.sort(
    (a, b) => DIMENSION_ORDER.indexOf(a.dimension) - DIMENSION_ORDER.indexOf(b.dimension)
  );
}

function asConfidence(value: Record<string, unknown> | null): ConfidenceBreakdown | null {
  if (!value || typeof value !== "object") return null;
  const level = value.level;
  const overall = value.overall;
  return {
    overall: typeof overall === "number" ? overall : null,
    level:
      level === "high" || level === "medium" || level === "low" ? level : "unknown",
    components: (value.components ?? {}) as ConfidenceBreakdown["components"],
  };
}


/**
 * Maps one stored insight (+ its evidence refs) to the UI view model.
 * `insufficientEvidence` lets the caller surface the honest no-result state.
 */
export function mapViewFromRows(
  row: InsightRowLike | null,
  evidence: EvidenceRowLike[],
  options?: { insufficientEvidence?: boolean }
): IntelligenceView {
  if (!row) {
    if (options?.insufficientEvidence) {
      return {
        state: "insufficient_evidence",
        message:
          "Not enough verified information yet. Prosventa needs more company facts, enrichment or signals before useful intelligence can be generated.",
        explanation: null,
        dimensions: [],
        keyFactors: [],
        concerns: [],
        confidence: null,
        generatedAt: null,
        newestEvidenceAt: null,
        evidence: [],
      };
    }
    return {
      state: "none",
      message: null,
      explanation: null,
      dimensions: [],
      keyFactors: [],
      concerns: [],
      confidence: null,
      generatedAt: null,
      newestEvidenceAt: null,
      evidence: [],
    };
  }

  const status = row.status;
  const presentable = status === "ready" || status === "stale";
  let state: IntelligenceViewState;
  let message: string | null = null;
  if (status === "pending" || status === "processing") {
    state = "processing";
  } else if (status === "failed") {
    state = options?.insufficientEvidence ? "insufficient_evidence" : "failed";
    // Safe, user-facing wording only — never provider or internal details.
    message =
      state === "failed"
        ? "We couldn't analyze the latest evidence. Your prospect data is safe."
        : "Not enough verified information yet. Prosventa needs more company facts, enrichment or signals before useful intelligence can be generated.";
  } else if (options?.insufficientEvidence) {
    state = "insufficient_evidence";
    message =
      "Not enough verified information yet. Prosventa needs more company facts, enrichment or signals before useful intelligence can be generated.";
  } else {
    state = status === "stale" ? "stale" : "ready";
  }

  const freshnessBlock = (row.freshness ?? {}) as { newestEvidenceAt?: unknown };

  return {
    state,
    message,
    explanation: row.explanation,
    dimensions: presentable ? asDimensions(row.scores) : [],
    keyFactors: presentable ? asFactors(row.key_factors) : [],
    concerns: presentable ? asFactors(row.concerns) : [],
    confidence: asConfidence(row.confidence),
    generatedAt: row.generated_at,
    newestEvidenceAt:
      typeof freshnessBlock.newestEvidenceAt === "string"
        ? freshnessBlock.newestEvidenceAt
        : null,
    evidence: evidence.map((e) => ({
      refId: e.id,
      typeLabel: evidenceTypeLabel(e.ref_type),
      source: e.source,
      occurredAt: e.occurred_at,
      capturedAt: e.captured_at,
      freshness: e.freshness,
      note: e.note,
    })),
  };
}

