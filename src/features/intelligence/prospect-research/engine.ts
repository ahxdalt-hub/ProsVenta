// ============================================================================
// Prosventa AI Prospect Research — Grounded Engine
// Stage 4 — Phase 5: AI Prospect Research
// ============================================================================
// Deterministic, grounded research engine. Analyzes ONLY the supplied
// prospect evidence and produces a structured brief. Never invents facts.
// Every claim is traceable to a source (Prosventa data, enrichment, or
// company research).
//
// This is the default "AI provider" for prospect research. A future LLM-based
// provider can be registered alongside it without changing the UI contract.
// ============================================================================

import type {
  ProspectResearchContext,
  ProspectResearchFact,
  ProspectResearchResult,
  ProspectResearchSource,
} from "./types";

// ============================================================================
// Source Index Contract
// ============================================================================
// 0 = prosventa_data (user-provided prospect/company data)
// 1 = prospect_enrichment (prospect/contact enrichment provider data)
// 2 = company_enrichment (company enrichment provider data)
// 3 = company_research (company research brief)
// 4 = ai_analysis (AI synthesis of the above — not a factual source)
// ============================================================================

/** Builds the traceable source list for the research result. */
function buildSources(context: ProspectResearchContext): ProspectResearchSource[] {
  const sources: ProspectResearchSource[] = [];
  const now = new Date().toISOString();

  sources.push({
    type: "prosventa_data",
    name: "Prosventa prospect data",
    url: null,
    retrievedAt: now,
    provider: null,
  });

  if (context.prospectEnrichment) {
    sources.push({
      type: "prospect_enrichment",
      name: "Prospect enrichment data",
      url: null,
      retrievedAt: now,
      provider: null,
    });
  }

  if (context.companyEnrichment) {
    sources.push({
      type: "company_enrichment",
      name: "Company enrichment data",
      url: null,
      retrievedAt: now,
      provider: null,
    });
  }

  if (context.companyBrief) {
    sources.push({
      type: "company_research",
      name: "Company research brief",
      url: null,
      retrievedAt: now,
      provider: null,
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

function buildConfidence(score: number): ProspectResearchResult["confidence"] {
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

function buildProfessionalSummary(context: ProspectResearchContext): string | null {
  const name = context.prospectName;
  const title = context.jobTitle;
  const company = context.companyName;

  if (!name && !title && !company) return null;

  const parts: string[] = [];
  if (name) parts.push(name);
  if (title) parts.push(title);
  if (company) parts.push(`at ${company}`);

  return parts.join(" — ") + ".";
}

function buildCurrentRole(context: ProspectResearchContext): ProspectResearchResult["currentRole"] {
  const title = context.jobTitle;
  const company = context.companyName;
  const department = context.department;

  if (!title && !company && !department) return null;

  return {
    title,
    company,
    department,
  };
}

function buildSeniority(context: ProspectResearchContext): string | null {
  // Prefer enriched seniority (most reliable)
  if (context.prospectEnrichment?.seniority) {
    return context.prospectEnrichment.seniority;
  }
  // Fall back to context seniority (from prospect enrichment)
  return context.seniority ?? null;
}

function buildLikelyResponsibilities(context: ProspectResearchContext): string[] | null {
  // Only report responsibilities when explicitly present in enrichment data.
  const enrichment = context.prospectEnrichment;
  if (!enrichment) return null;

  const responsibilities: string[] = [];
  if (enrichment.jobTitle) {
    responsibilities.push(`Role: ${enrichment.jobTitle}`);
  }
  if (enrichment.department) {
    responsibilities.push(`Department: ${enrichment.department}`);
  }
  if (enrichment.summary) {
    responsibilities.push(`Summary: ${enrichment.summary}`);
  }

  return responsibilities.length > 0 ? responsibilities : null;
}

function buildRoleContext(context: ProspectResearchContext): string | null {
  // Grounded role context — only based on evidence.
  const parts: string[] = [];
  const title = context.jobTitle;
  const company = context.companyName;

  if (title && company) {
    parts.push(`${title} at ${company}.`);
  } else if (title) {
    parts.push(`${title}.`);
  }

  if (context.department) {
    parts.push(`Works in the ${context.department} department.`);
  }

  if (parts.length === 0) return null;
  return parts.join(" ");
}

function buildCompanyContext(context: ProspectResearchContext): string | null {
  // Company context used for relevance interpretation.
  const parts: string[] = [];
  const company = context.companyName;

  if (company) parts.push(company);
  if (context.industry) parts.push(`operating in the ${context.industry} industry`);
  if (context.description) {
    const trimmed = context.description.trim();
    const firstSentence = trimmed.split(/[.!?]/)[0].trim();
    if (firstSentence.length > 0) {
      parts.push(`— ${firstSentence.charAt(0).toLowerCase() + firstSentence.slice(1)}`);
    }
  }

  if (parts.length === 0) return null;
  return parts.join(" ") + ".";
}

function buildProfessionalBackground(context: ProspectResearchContext): string | null {
  // Only report when explicitly present in enrichment data.
  const enrichment = context.prospectEnrichment;
  if (!enrichment) return null;

  const parts: string[] = [];
  if (enrichment.summary) parts.push(enrichment.summary);
  if (enrichment.jobTitle) parts.push(`Current title: ${enrichment.jobTitle}`);
  if (enrichment.companyName) parts.push(`Company: ${enrichment.companyName}`);

  return parts.length > 0 ? parts.join(" ") : null;
}

function buildLocation(context: ProspectResearchContext): ProspectResearchResult["location"] {
  const city = context.city ?? context.prospectEnrichment?.city ?? null;
  const country = context.country ?? context.prospectEnrichment?.country ?? null;

  if (!city && !country) return null;
  return { city, country };
}

function buildPublicProfessionalContext(context: ProspectResearchContext): string[] | null {
  // Only report publicly available professional context (safe, work-related only).
  const items: string[] = [];

  if (context.linkedinUrl) {
    items.push(`LinkedIn profile available: ${context.linkedinUrl}`);
  }
  if (context.workEmail) {
    items.push(`Work email: ${context.workEmail}`);
  }
  if (context.prospectEnrichment?.profileUrl) {
    items.push(`Profile URL: ${context.prospectEnrichment.profileUrl}`);
  }

  return items.length > 0 ? items : null;
}

function buildPotentialBusinessRelevance(context: ProspectResearchContext): string | null {
  // Grounded relevance — only based on evidence.
  const parts: string[] = [];
  const title = context.jobTitle;
  const company = context.companyName;

  if (title && company) {
    parts.push(`${title} at ${company}.`);
  } else if (title) {
    parts.push(`${title}.`);
  }

  if (context.industry) {
    parts.push(`Active in the ${context.industry} sector.`);
  }

  if (context.companyBrief?.salesRelevance) {
    parts.push(context.companyBrief.salesRelevance);
  }

  if (parts.length === 0) return null;
  return parts.join(" ");
}

function buildPossiblePainPoints(context: ProspectResearchContext): string[] | null {
  // ONLY report pain points when explicitly supported by evidence.
  // Never assume pain points from title or company alone.
  const enrichment = context.prospectEnrichment;
  if (!enrichment) return null;

  const painPoints: string[] = [];
  if (enrichment.summary) {
    // Only include if the summary explicitly mentions challenges/needs.
    const lower = enrichment.summary.toLowerCase();
    if (lower.includes("challenge") || lower.includes("need") || lower.includes("problem") || lower.includes("pain")) {
      painPoints.push(enrichment.summary);
    }
  }

  return painPoints.length > 0 ? painPoints : null;
}

// ============================================================================
// Verified / Inferred / Unknown Builders
// ============================================================================

function buildVerifiedFacts(context: ProspectResearchContext): ProspectResearchFact[] {
  const facts: ProspectResearchFact[] = [];

  if (context.prospectName) {
    facts.push({
      value: `Name: ${context.prospectName}`,
      confidence: "high",
      uncertaintyNote: null,
    });
  }
  if (context.jobTitle) {
    facts.push({
      value: `Current title: ${context.jobTitle}`,
      confidence: "high",
      uncertaintyNote: null,
    });
  }
  if (context.companyName) {
    facts.push({
      value: `Company: ${context.companyName}`,
      confidence: "high",
      uncertaintyNote: null,
    });
  }
  if (context.department) {
    facts.push({
      value: `Department: ${context.department}`,
      confidence: "high",
      uncertaintyNote: null,
    });
  }
  if (context.seniority) {
    facts.push({
      value: `Seniority: ${context.seniority}`,
      confidence: "high",
      uncertaintyNote: null,
    });
  }
  if (context.workEmail) {
    facts.push({
      value: `Work email: ${context.workEmail}`,
      confidence: "high",
      uncertaintyNote: null,
    });
  }
  if (context.linkedinUrl) {
    facts.push({
      value: `LinkedIn profile available`,
      confidence: "high",
      uncertaintyNote: null,
    });
  }
  if (context.location) {
    facts.push({
      value: `Location: ${context.location}`,
      confidence: "high",
      uncertaintyNote: null,
    });
  }

  return facts;
}

function buildInferredFacts(context: ProspectResearchContext): ProspectResearchFact[] {
  const facts: ProspectResearchFact[] = [];

  // Title-based inference — clearly labeled as inferred.
  if (context.jobTitle) {
    const lower = context.jobTitle.toLowerCase();
    if (lower.includes("vp") || lower.includes("vice president")) {
      facts.push({
        value: "Likely responsible for leadership-level decisions in their area.",
        confidence: "medium",
        uncertaintyNote: "Based on title. Specific responsibilities could not be verified.",
      });
    } else if (lower.includes("director")) {
      facts.push({
        value: "Likely responsible for managing a team or function.",
        confidence: "medium",
        uncertaintyNote: "Based on title. Specific responsibilities could not be verified.",
      });
    } else if (lower.includes("manager")) {
      facts.push({
        value: "Likely responsible for day-to-day operations in their area.",
        confidence: "medium",
        uncertaintyNote: "Based on title. Specific responsibilities could not be verified.",
      });
    }
  }

  // Department-based inference.
  if (context.department) {
    const lower = context.department.toLowerCase();
    if (lower.includes("sales")) {
      facts.push({
        value: "Likely involved in revenue generation and customer acquisition.",
        confidence: "medium",
        uncertaintyNote: "Based on department. Specific responsibilities could not be verified.",
      });
    } else if (lower.includes("engineering") || lower.includes("technology")) {
      facts.push({
        value: "Likely involved in product development or technical operations.",
        confidence: "medium",
        uncertaintyNote: "Based on department. Specific responsibilities could not be verified.",
      });
    } else if (lower.includes("marketing")) {
      facts.push({
        value: "Likely involved in demand generation and brand awareness.",
        confidence: "medium",
        uncertaintyNote: "Based on department. Specific responsibilities could not be verified.",
      });
    }
  }

  return facts;
}

function buildUnknownAreas(context: ProspectResearchContext): string[] | null {
  const unknown: string[] = [];

  if (!context.jobTitle) {
    unknown.push("Specific job title could not be verified.");
  }
  if (!context.department) {
    unknown.push("Department could not be verified.");
  }
  if (!context.seniority) {
    unknown.push("Seniority level could not be verified.");
  }
  if (!context.prospectEnrichment?.summary) {
    unknown.push("Professional background could not be verified.");
  }
  if (!context.workEmail) {
    unknown.push("Work email could not be verified.");
  }
  if (!context.linkedinUrl) {
    unknown.push("LinkedIn profile could not be verified.");
  }
  if (!context.companyName) {
    unknown.push("Company affiliation could not be verified.");
  }

  return unknown.length > 0 ? unknown : null;
}

// ============================================================================
// Confidence Scoring
// ============================================================================

function scoreConfidence(context: ProspectResearchContext): number {
  let points = 0;
  const total = 8;

  if (context.prospectName) points += 1;
  if (context.jobTitle) points += 1;
  if (context.companyName) points += 1;
  if (context.department) points += 1;
  if (context.seniority) points += 1;
  if (context.workEmail) points += 1;
  if (context.linkedinUrl) points += 1;
  if (context.prospectEnrichment) points += 1;

  return Math.round((points / total) * 100);
}

// ============================================================================
// Main Engine
// ============================================================================

/**
 * Produces a grounded, structured prospect research result.
 * The engine analyzes ONLY the supplied context and returns null for any
 * field it cannot support. It never invents facts.
 */
export function researchProspectGrounded(context: ProspectResearchContext): ProspectResearchResult {
  const sources = buildSources(context);
  const researchedAt = new Date().toISOString();

  return {
    professionalSummary: buildProfessionalSummary(context),
    currentRole: buildCurrentRole(context),
    seniority: buildSeniority(context),
    likelyResponsibilities: buildLikelyResponsibilities(context),
    roleContext: buildRoleContext(context),
    companyContext: buildCompanyContext(context),
    professionalBackground: buildProfessionalBackground(context),
    location: buildLocation(context),
    publicProfessionalContext: buildPublicProfessionalContext(context),
    potentialBusinessRelevance: buildPotentialBusinessRelevance(context),
    possiblePainPoints: buildPossiblePainPoints(context),
    verifiedFacts: buildVerifiedFacts(context),
    inferredFacts: buildInferredFacts(context),
    unknownAreas: buildUnknownAreas(context),
    confidence: buildConfidence(scoreConfidence(context)),
    sources,
    researchedAt,
  };
}