// ============================================================================
// Prosventa AI Prospect Research — Structured Output Validation
// Stage 4 — Phase 5: AI Prospect Research
// ============================================================================
// Validates AI-generated structured output BEFORE it is saved.
// Rejects malformed output safely — never stores corrupted data.
// ============================================================================

import type {
  ProspectResearchConfidence,
  ProspectResearchConfidenceLevel,
  ProspectResearchFact,
  ProspectResearchResult,
  ProspectResearchSource,
  ProspectResearchSourceType,
} from "./types";

const CONFIDENCE_LEVELS: ProspectResearchConfidenceLevel[] = ["high", "medium", "low"];
const SOURCE_TYPES: ProspectResearchSourceType[] = [
  "prosventa_data",
  "prospect_enrichment",
  "company_enrichment",
  "company_research",
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

function isValidConfidence(value: unknown): value is ProspectResearchConfidence {
  if (!isRecord(value)) return false;
  const score = value.score;
  const level = value.level;
  const label = value.label;
  if (typeof score !== "number" || score < 0 || score > 100) return false;
  if (typeof level !== "string" || !CONFIDENCE_LEVELS.includes(level as ProspectResearchConfidenceLevel)) return false;
  if (typeof label !== "string") return false;
  return true;
}

function isValidSource(value: unknown): value is ProspectResearchSource {
  if (!isRecord(value)) return false;
  const type = value.type;
  const name = value.name;
  if (typeof type !== "string" || !SOURCE_TYPES.includes(type as ProspectResearchSourceType)) return false;
  if (typeof name !== "string" || name.length === 0) return false;
  if (!isStringOrNull(value.url)) return false;
  if (!isStringOrNull(value.retrievedAt)) return false;
  if (!isStringOrNull(value.provider)) return false;
  return true;
}

function isValidFact(value: unknown): value is ProspectResearchFact {
  if (!isRecord(value)) return false;
  if (typeof value.value !== "string" || value.value.length === 0) return false;
  if (typeof value.confidence !== "string" || !CONFIDENCE_LEVELS.includes(value.confidence as ProspectResearchConfidenceLevel)) return false;
  if (!isStringOrNull(value.uncertaintyNote)) return false;
  return true;
}

function isValidCurrentRole(value: unknown): boolean {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  if (!isStringOrNull(value.title)) return false;
  if (!isStringOrNull(value.company)) return false;
  if (!isStringOrNull(value.department)) return false;
  return true;
}

function isValidLocation(value: unknown): boolean {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  if (!isStringOrNull(value.city)) return false;
  if (!isStringOrNull(value.country)) return false;
  return true;
}

/**
 * Validates an unknown AI-generated payload into a ProspectResearchResult.
 * Returns the validated result, or throws an error when malformed.
 */
export function validateProspectResearchResult(
  raw: unknown
): ProspectResearchResult {
  if (!isRecord(raw)) {
    throw new Error("AI prospect research output is not a valid object.");
  }

  // Validate confidence — required
  if (!isValidConfidence(raw.confidence)) {
    throw new Error("AI prospect research output is missing a valid confidence object.");
  }

  // Validate sources — required array
  if (!Array.isArray(raw.sources) || !raw.sources.every(isValidSource)) {
    throw new Error("AI prospect research output has invalid sources.");
  }

  // researchedAt — required ISO string
  if (typeof raw.researchedAt !== "string" || isNaN(Date.parse(raw.researchedAt))) {
    throw new Error("AI prospect research output has an invalid researchedAt timestamp.");
  }

  // Validate string fields
  const stringFields: Array<keyof ProspectResearchResult> = [
    "professionalSummary",
    "seniority",
    "roleContext",
    "companyContext",
    "professionalBackground",
    "potentialBusinessRelevance",
  ];
  for (const field of stringFields) {
    if (!isStringOrNull(raw[field])) {
      throw new Error(`AI prospect research output has an invalid "${field}" field.`);
    }
  }

  // Validate array fields
  if (!isStringArrayOrNull(raw.likelyResponsibilities)) {
    throw new Error("AI prospect research output has an invalid likelyResponsibilities field.");
  }
  if (!isStringArrayOrNull(raw.publicProfessionalContext)) {
    throw new Error("AI prospect research output has an invalid publicProfessionalContext field.");
  }
  if (!isStringArrayOrNull(raw.possiblePainPoints)) {
    throw new Error("AI prospect research output has an invalid possiblePainPoints field.");
  }
  if (!isStringArrayOrNull(raw.unknownAreas)) {
    throw new Error("AI prospect research output has an invalid unknownAreas field.");
  }

  // Validate nested objects
  if (!isValidCurrentRole(raw.currentRole)) {
    throw new Error("AI prospect research output has an invalid currentRole field.");
  }
  if (!isValidLocation(raw.location)) {
    throw new Error("AI prospect research output has an invalid location field.");
  }

  // Validate verified/inferred facts arrays
  if (!Array.isArray(raw.verifiedFacts) || !raw.verifiedFacts.every(isValidFact)) {
    throw new Error("AI prospect research output has invalid verifiedFacts.");
  }
  if (!Array.isArray(raw.inferredFacts) || !raw.inferredFacts.every(isValidFact)) {
    throw new Error("AI prospect research output has invalid inferredFacts.");
  }

  // Ensure external_web sources are only present when research actually happened.
  const hasExternal = raw.sources.some(
    (s: ProspectResearchSource) => s.type === "external_web"
  );
  if (hasExternal) {
    throw new Error("External web research is not available yet. Rejecting external_web sources.");
  }

  const str = (field: "professionalSummary" | "seniority" | "roleContext" | "companyContext" | "professionalBackground" | "potentialBusinessRelevance"): string | null => {
    const v = raw[field];
    return typeof v === "string" ? v : null;
  };
  const strArr = (field: "likelyResponsibilities" | "publicProfessionalContext" | "possiblePainPoints" | "unknownAreas"): string[] | null => {
    const v = raw[field];
    return isStringArray(v) ? v : null;
  };
  const currentRole = raw.currentRole;
  const location = raw.location;

  return {
    professionalSummary: str("professionalSummary"),
    currentRole: currentRole === null
      ? null
      : {
          title: typeof (currentRole as Record<string, unknown>).title === "string" ? (currentRole as Record<string, unknown>).title as string : null,
          company: typeof (currentRole as Record<string, unknown>).company === "string" ? (currentRole as Record<string, unknown>).company as string : null,
          department: typeof (currentRole as Record<string, unknown>).department === "string" ? (currentRole as Record<string, unknown>).department as string : null,
        },
    seniority: str("seniority"),
    likelyResponsibilities: strArr("likelyResponsibilities"),
    roleContext: str("roleContext"),
    companyContext: str("companyContext"),
    professionalBackground: str("professionalBackground"),
    location: location === null
      ? null
      : {
          city: typeof (location as Record<string, unknown>).city === "string" ? (location as Record<string, unknown>).city as string : null,
          country: typeof (location as Record<string, unknown>).country === "string" ? (location as Record<string, unknown>).country as string : null,
        },
    publicProfessionalContext: strArr("publicProfessionalContext"),
    potentialBusinessRelevance: str("potentialBusinessRelevance"),
    possiblePainPoints: strArr("possiblePainPoints"),
    verifiedFacts: raw.verifiedFacts as ProspectResearchFact[],
    inferredFacts: raw.inferredFacts as ProspectResearchFact[],
    unknownAreas: strArr("unknownAreas"),
    confidence: raw.confidence as ProspectResearchConfidence,
    sources: raw.sources as ProspectResearchSource[],
    researchedAt: raw.researchedAt as string,
  };
}