// ============================================================================
// Prosventa AI Company Research — Structured Output Validation
// Stage 4 — Phase 4: AI Company Research
// ============================================================================
// Validates AI-generated structured output BEFORE it is saved.
// Rejects malformed output safely — never stores corrupted data.
// ============================================================================

import type {
  CompanyResearchResult,
  ResearchConfidence,
  ResearchConfidenceLevel,
  ResearchSource,
  ResearchSourceType,
} from "./types";

const CONFIDENCE_LEVELS: ResearchConfidenceLevel[] = ["high", "medium", "low"];
const SOURCE_TYPES: ResearchSourceType[] = [
  "prosventa_data",
  "enrichment",
  "external_web",
  "ai_analysis",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isStringArrayOrNull(value: unknown): value is string[] | null {
  if (value === null) return true;
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isValidConfidence(value: unknown): value is ResearchConfidence {
  if (!isRecord(value)) return false;
  const score = value.score;
  const level = value.level;
  const label = value.label;
  if (typeof score !== "number" || score < 0 || score > 100) return false;
  if (typeof level !== "string" || !CONFIDENCE_LEVELS.includes(level as ResearchConfidenceLevel)) return false;
  if (typeof label !== "string") return false;
  return true;
}

function isValidSource(value: unknown): value is ResearchSource {
  if (!isRecord(value)) return false;
  const type = value.type;
  const name = value.name;
  if (typeof type !== "string" || !SOURCE_TYPES.includes(type as ResearchSourceType)) return false;
  if (typeof name !== "string" || name.length === 0) return false;
  if (!isStringOrNull(value.url)) return false;
  if (!isStringOrNull(value.retrievedAt)) return false;
  if (!isStringOrNull(value.provider)) return false;
  return true;
}

/**
 * Validates an unknown AI-generated payload into a CompanyResearchResult.
 * Returns the validated result, or throws an error when malformed.
 */
export function validateCompanyResearchResult(
  raw: unknown
): CompanyResearchResult {
  if (!isRecord(raw)) {
    throw new Error("AI research output is not a valid object.");
  }

  // Validate confidence — required
  if (!isValidConfidence(raw.confidence)) {
    throw new Error("AI research output is missing a valid confidence object.");
  }

  // Validate sources — required array
  if (!Array.isArray(raw.sources) || !raw.sources.every(isValidSource)) {
    throw new Error("AI research output has invalid sources.");
  }

  // researchedAt — required ISO string
  if (typeof raw.researchedAt !== "string" || isNaN(Date.parse(raw.researchedAt))) {
    throw new Error("AI research output has an invalid researchedAt timestamp.");
  }

  // Validate string fields
  const stringFields: Array<keyof CompanyResearchResult> = [
    "overview",
    "whatTheyDo",
    "targetCustomers",
    "industry",
    "businessModel",
    "companySize",
    "headquarters",
    "businessContext",
    "salesRelevance",
  ];
  for (const field of stringFields) {
    if (!isStringOrNull(raw[field])) {
      throw new Error(`AI research output has an invalid "${field}" field.`);
    }
  }

  // Validate array fields
  if (!isStringArrayOrNull(raw.productsServices)) {
    throw new Error("AI research output has an invalid productsServices field.");
  }
  if (!isStringArrayOrNull(raw.notableInfo)) {
    throw new Error("AI research output has an invalid notableInfo field.");
  }

  // Ensure external_web sources are only present when research actually happened.
  // The service enforces externalResearchPerformed; here we reject external_web
  // sources by default unless explicitly allowed by the caller.
  const hasExternal = raw.sources.some(
    (s: ResearchSource) => s.type === "external_web"
  );
  if (hasExternal) {
    throw new Error("External web research is not available yet. Rejecting external_web sources.");
  }

  const str = (field: "overview" | "whatTheyDo" | "targetCustomers" | "industry" | "businessModel" | "companySize" | "headquarters" | "businessContext" | "salesRelevance"): string | null => {
    const v = raw[field];
    return typeof v === "string" ? v : null;
  };
  const strArr = (field: "productsServices" | "notableInfo"): string[] | null => {
    const v = raw[field];
    return isStringArray(v) ? v : null;
  };

  return {
    overview: str("overview"),
    whatTheyDo: str("whatTheyDo"),
    productsServices: strArr("productsServices"),
    targetCustomers: str("targetCustomers"),
    industry: str("industry"),
    businessModel: str("businessModel"),
    companySize: str("companySize"),
    headquarters: str("headquarters"),
    businessContext: str("businessContext"),
    notableInfo: strArr("notableInfo"),
    salesRelevance: str("salesRelevance"),
    confidence: raw.confidence as ResearchConfidence,
    sources: raw.sources as ResearchSource[],
    researchedAt: raw.researchedAt as string,
  };
}