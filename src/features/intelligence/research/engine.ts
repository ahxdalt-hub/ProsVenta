// ============================================================================
// Prosventa AI Company Research — Grounded Engine
// Stage 4 — Phase 4: AI Company Research
// ============================================================================
// Deterministic, grounded research engine. Analyzes ONLY the supplied
// company evidence and produces a structured brief. Never invents facts.
// Every claim is traceable to a source (Prosventa data or enrichment).
//
// This is the default "AI provider" for company research. A future LLM-based
// provider can be registered alongside it without changing the UI contract.
// ============================================================================

import type { CompanyResearchContext, CompanyResearchResult, ResearchSource } from "./types";

// ============================================================================
// Source Index Contract
// ============================================================================
// 0 = prosventa_data (user-provided prospect/company data)
// 1 = enrichment (company enrichment provider data)
// 2 = ai_analysis (AI synthesis of the above — not a factual source)
// ============================================================================

/** Builds the traceable source list for the research result. */
function buildSources(context: CompanyResearchContext): ResearchSource[] {
  const sources: ResearchSource[] = [];
  const now = new Date().toISOString();

  sources.push({
    type: "prosventa_data",
    name: "Prosventa prospect data",
    url: null,
    retrievedAt: now,
    provider: null,
  });

  if (context.enrichment && Object.keys(context.enrichment).length > 0) {
    const enrichmentProvider =
      typeof context.enrichment.provider === "string"
        ? context.enrichment.provider
        : (typeof context.enrichment.providerId === "string" ? context.enrichment.providerId : null);
    sources.push({
      type: "enrichment",
      name: "Company enrichment data",
      url: null,
      retrievedAt: now,
      provider: enrichmentProvider,
    });
  }

  sources.push({
    type: "ai_analysis",
    name: "Prosventa AI analysis",
    url: null,
    retrievedAt: now,
    provider: null,
  });

  return sources;
}

// ============================================================================
// Confidence Helper
// ============================================================================

function buildConfidence(score: number): CompanyResearchResult["confidence"] {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const level = clamped >= 80 ? "high" : clamped >= 55 ? "medium" : "low";
  const label = level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  return { score: clamped, level, label };
}

// ============================================================================
// Grounded Field Builders
// ============================================================================
// Each builder returns null when the evidence does not support a claim.
// NEVER fabricates data.

function buildOverview(context: CompanyResearchContext): string | null {
  const name = context.companyName;
  if (!name) {
    // Fall back to domain when no company name known
    if (context.domain) {
      return `A company operating at ${context.domain}.`;
    }
    return null;
  }
  const parts = [name];
  if (context.industry) parts.push(`operating in the ${context.industry} industry`);
  if (context.description) {
    const trimmed = context.description.trim();
    const firstSentence = trimmed.split(/[.!?]/)[0].trim();
    if (firstSentence.length > 0) parts.push(`— ${firstSentence.charAt(0).toLowerCase() + firstSentence.slice(1)}`);
  }
  return parts.join(" ") + ".";
}

function buildWhatTheyDo(context: CompanyResearchContext): string | null {
  if (context.description) {
    const trimmed = context.description.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function buildProductsServices(context: CompanyResearchContext): string[] | null {
  // Only report products/services if explicitly present in enrichment data.
  const enrichment = context.enrichment as Record<string, unknown> | null;
  const products = enrichment?.products;
  if (Array.isArray(products) && products.length > 0) {
    return products.filter((p): p is string => typeof p === "string");
  }
  return null;
}

function buildTargetCustomers(context: CompanyResearchContext): string | null {
  // Only report if explicitly present in enrichment data.
  const enrichment = context.enrichment as Record<string, unknown> | null;
  const target = enrichment?.targetCustomers;
  if (typeof target === "string" && target.trim().length > 0) return target.trim();
  return null;
}

function buildIndustry(context: CompanyResearchContext): string | null {
  return context.industry ?? null;
}

function buildBusinessModel(context: CompanyResearchContext): string | null {
  // Only report if explicitly present in enrichment data.
  const enrichment = context.enrichment as Record<string, unknown> | null;
  const model = enrichment?.businessModel;
  if (typeof model === "string" && model.trim().length > 0) return model.trim();
  return null;
}

function buildCompanySize(context: CompanyResearchContext): string | null {
  const enrichment = context.enrichment as Record<string, unknown> | null;
  // Prefer enrichment employee range (most reliable)
  const range = enrichment?.employeeRange;
  if (typeof range === "string" && range.trim().length > 0) return range.trim();
  // Fall back to exact employee count from prospect data
  if (context.employeeCount !== null && context.employeeCount !== undefined) {
    return `${context.employeeCount} employees`;
  }
  return null;
}

function buildHeadquarters(context: CompanyResearchContext): string | null {
  const enrichment = context.enrichment as Record<string, unknown> | null;
  const hq = enrichment?.headquarters;
  if (typeof hq === "string" && hq.trim().length > 0) return hq.trim();
  // Fall back to prospect location
  const location = [context.city, context.country].filter(Boolean).join(", ") || context.location;
  return location || null;
}

function buildBusinessContext(context: CompanyResearchContext): string | null {
  const enrichment = context.enrichment as Record<string, unknown> | null;
  const parts: string[] = [];

  const companyType = enrichment?.companyType;
  if (typeof companyType === "string" && companyType.trim().length > 0) {
    parts.push(`${companyType.trim()} company`);
  }

  const foundedYear = enrichment?.foundedYear;
  if (typeof foundedYear === "number" && foundedYear > 0) {
    parts.push(`founded in ${foundedYear}`);
  }

  if (parts.length > 0) {
    return parts.join(", ") + ".";
  }
  return null;
}

function buildNotableInfo(context: CompanyResearchContext): string[] | null {
  const enrichment = context.enrichment as Record<string, unknown> | null;
  const notable = enrichment?.notableInfo;
  if (Array.isArray(notable) && notable.length > 0) {
    return notable.filter((n): n is string => typeof n === "string");
  }
  return null;
}

function buildSalesRelevance(context: CompanyResearchContext): string | null {
  // Grounded sales relevance — only based on evidence.
  const parts: string[] = [];
  const name = context.companyName || context.domain || "This company";

  if (context.industry) {
    parts.push(`Active in the ${context.industry} sector.`);
  }
  if (context.employeeCount !== null && context.employeeCount !== undefined) {
    parts.push(`Reported ${context.employeeCount} employees.`);
  }
  if (context.description) {
    parts.push(`Described as: "${context.description.trim()}".`);
  }

  if (parts.length === 0) {
    return null;
  }

  return `${name} — ${parts.join(" ")}`;
}

// ============================================================================
// Confidence Scoring
// ============================================================================

function scoreConfidence(context: CompanyResearchContext): number {
  let points = 0;
  const total = 6;

  if (context.companyName) points += 1;
  if (context.domain || context.website) points += 1;
  if (context.description) points += 1;
  if (context.industry) points += 1;
  if (context.employeeCount !== null && context.employeeCount !== undefined) points += 1;
  if (context.enrichment && Object.keys(context.enrichment).length > 0) points += 1;

  return Math.round((points / total) * 100);
}

// ============================================================================
// Main Engine
// ============================================================================

/**
 * Produces a grounded, structured company research result.
 * The engine analyzes ONLY the supplied context and returns null for any
 * field it cannot support. It never invents facts.
 */
export function researchCompanyGrounded(context: CompanyResearchContext): CompanyResearchResult {
  const sources = buildSources(context);
  const researchedAt = new Date().toISOString();

  return {
    overview: buildOverview(context),
    whatTheyDo: buildWhatTheyDo(context),
    productsServices: buildProductsServices(context),
    targetCustomers: buildTargetCustomers(context),
    industry: buildIndustry(context),
    businessModel: buildBusinessModel(context),
    companySize: buildCompanySize(context),
    headquarters: buildHeadquarters(context),
    businessContext: buildBusinessContext(context),
    notableInfo: buildNotableInfo(context),
    salesRelevance: buildSalesRelevance(context),
    confidence: buildConfidence(scoreConfidence(context)),
    sources,
    researchedAt,
  };
}