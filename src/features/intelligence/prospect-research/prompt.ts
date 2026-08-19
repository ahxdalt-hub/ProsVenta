// ============================================================================
// Prosventa AI Prospect Research — Prompt Design
// Stage 4 — Phase 5: AI Prospect Research
// ============================================================================
// Server-side research prompt. This instructs the AI to analyze ONLY the
// supplied evidence, identify uncertainty, avoid unsupported claims, and
// produce structured JSON. Never placed inside a React component.
//
// Strong privacy principles:
//  - Does NOT ask the AI to infer sensitive personal characteristics.
//  - Does NOT collect religion, politics, health, orientation, ethnicity.
//  - Only work-related professional context is relevant.
// ============================================================================

import type { ProspectResearchContext } from "./types";

/**
 * Builds a grounded prospect research prompt.
 * The AI is instructed to:
 *  - analyze only supplied evidence
 *  - distinguish KNOWN / INFERRED / UNKNOWN
 *  - avoid unsupported claims
 *  - focus on legitimate professional context
 *  - never generate outreach, emails, or manipulative tactics
 *
 * The prompt is structured so that any AI provider (deterministic engine,
 * future LLM) can consume the same evidence and produce a grounded brief.
 */
export function buildProspectResearchPrompt(context: ProspectResearchContext): string {
  const lines: string[] = [];
  lines.push("You are a sales intelligence research assistant for Prosventa.");
  lines.push("");
  lines.push("Analyze the professional information provided below and produce a concise prospect-intelligence brief.");
  lines.push("");
  lines.push("CRITICAL GROUNDING RULES:");
  lines.push("1. Analyze ONLY the supplied evidence. Do not use outside knowledge or assumptions.");
  lines.push("2. Clearly distinguish KNOWN facts (high confidence, verifiable from evidence) from");
  lines.push("   LIKELY/INFERRED (medium/low confidence) and UNKNOWN (null).");
  lines.push("3. NEVER invent facts. If information is not present in the evidence, return null.");
  lines.push("4. NEVER fabricate personal history, employment history, responsibilities, interests,");
  lines.push("   company relationships, technology usage, business problems, buying authority,");
  lines.push("   budget, personal preferences, or recent activities.");
  lines.push("5. If a fact cannot be verified from the evidence, do not claim it.");
  lines.push("6. NEVER attempt to infer sensitive personal characteristics (religion, politics,");
  lines.push("   health, orientation, ethnicity, financial hardship).");
  lines.push("7. Focus ONLY on legitimate professional context. No psychological profiling.");
  lines.push("8. Do NOT generate sales emails, cold-call scripts, or outreach messages.");
  lines.push("9. Do NOT invent sources, URLs, or employment history.");
  lines.push("");
  lines.push("=== PROSPECT EVIDENCE ===");
  lines.push(serializeContext(context));
  lines.push("");
  lines.push("=== OUTPUT FORMAT ===");
  lines.push("Return a single JSON object with EXACTLY these fields:");
  lines.push(`{
  "professionalSummary": "Concise professional summary or null",
  "currentRole": {
    "title": "Current job title or null",
    "company": "Current company or null",
    "department": "Department or null"
  },
  "seniority": "Seniority level or null",
  "likelyResponsibilities": ["Likely responsibility" or null],
  "roleContext": "How this person's role relates to the company, or null",
  "companyContext": "Company context used for relevance, or null",
  "professionalBackground": "Professional background where reliably available, or null",
  "location": {
    "city": "City or null",
    "country": "Country or null"
  },
  "publicProfessionalContext": ["Publicly available professional context (safe, work-related only)" or null],
  "potentialBusinessRelevance": "Why this person might be relevant to a salesperson, or null",
  "possiblePainPoints": ["Possible pain points — ONLY when supported by evidence, never assumed" or null],
  "verifiedFacts": [
    {
      "value": "Verified factual claim",
      "confidence": "high",
      "uncertaintyNote": null
    }
  ],
  "inferredFacts": [
    {
      "value": "Reasonable inference clearly labeled as such",
      "confidence": "medium|low",
      "uncertaintyNote": "Explain the uncertainty"
    }
  ],
  "unknownAreas": ["What could not be verified" or null],
  "confidence": {
    "score": 0,
    "level": "high|medium|low",
    "label": "Human-readable label"
  },
  "sources": [
    {
      "type": "prosventa_data|prospect_enrichment|company_enrichment|company_research|external_web|ai_analysis",
      "name": "Source name",
      "url": null,
      "retrievedAt": null,
      "provider": null
    }
  ],
  "researchedAt": "ISO timestamp"
}`);
  lines.push("");
  lines.push("IMPORTANT:");
  lines.push("- Use null for any field you cannot support from the evidence.");
  lines.push("- Do not fill every field. Empty/unknown fields should be null.");
  lines.push("- verifiedFacts must contain ONLY high-confidence KNOWN facts explicitly present in evidence.");
  lines.push("- inferredFacts must clearly state they are inferences and include an uncertainty note.");
  lines.push("- never put inferred statements in verifiedFacts.");
  lines.push("- possiblePainPoints must be null unless the evidence explicitly mentions challenges/needs.");
  lines.push("- external_web is ONLY used if external web research actually occurred.");
  lines.push("- researchedAt must be the current ISO timestamp.");
  return lines.join("\n");
}

/**
 * Serializes the prospect research context into a compact, evidence-only block.
 * Only professionally relevant prospect/company data is included.
 * No internal notes, no sensitive personal information.
 */
function serializeContext(context: ProspectResearchContext): string {
  const fields: string[] = [];

  if (context.prospectName) fields.push(`Prospect Name: ${context.prospectName}`);
  if (context.jobTitle) fields.push(`Job Title: ${context.jobTitle}`);
  if (context.department) fields.push(`Department: ${context.department}`);
  if (context.seniority) fields.push(`Seniority: ${context.seniority}`);
  if (context.workEmail) fields.push(`Work Email: ${context.workEmail}`);
  if (context.workEmailDomain) fields.push(`Work Email Domain: ${context.workEmailDomain}`);
  if (context.linkedinUrl) fields.push(`LinkedIn URL: ${context.linkedinUrl}`);
  if (context.location) fields.push(`Location: ${context.location}`);
  if (context.country) fields.push(`Country: ${context.country}`);
  if (context.city) fields.push(`City: ${context.city}`);
  if (context.companyName) fields.push(`Company Name: ${context.companyName}`);
  if (context.companyDomain) fields.push(`Company Domain: ${context.companyDomain}`);
  if (context.description) fields.push(`Company Description: ${context.description}`);
  if (context.industry) fields.push(`Company Industry: ${context.industry}`);
  if (context.employeeCount !== null && context.employeeCount !== undefined) {
    fields.push(`Company Employee Count: ${context.employeeCount}`);
  }

  if (context.prospectEnrichment) {
    fields.push("Prospect Enrichment Data:");
    fields.push(JSON.stringify(sanitizeProspectEnrichment(context.prospectEnrichment), null, 2));
  }

  if (context.companyEnrichment) {
    fields.push("Company Enrichment Data:");
    fields.push(JSON.stringify(sanitizeCompanyEnrichment(context.companyEnrichment), null, 2));
  }

  if (context.companyBrief) {
    fields.push("Company Research Brief:");
    fields.push(JSON.stringify(context.companyBrief, null, 2));
  }

  fields.push(`External Web Research Performed: ${context.externalResearchPerformed ? "Yes" : "No"}`);

  return fields.length > 0 ? fields.join("\n") : "No prospect data available.";
}

/**
 * Sanitizes prospect enrichment data to a safe, work-related subset.
 * Prevents any sensitive or irrelevant fields from leaking.
 */
function sanitizeProspectEnrichment(enrichment: ProspectResearchContext["prospectEnrichment"]): Record<string, unknown> {
  if (!enrichment) return {};
  const allowed = [
    "contactName",
    "firstName",
    "lastName",
    "jobTitle",
    "seniority",
    "department",
    "companyName",
    "companyDomain",
    "linkedin",
    "location",
    "country",
    "city",
    "summary",
    "confidence",
  ];
  const source = enrichment as unknown as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in source) {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Sanitizes company enrichment data to a safe, work-related subset.
 */
function sanitizeCompanyEnrichment(enrichment: ProspectResearchContext["companyEnrichment"]): Record<string, unknown> {
  if (!enrichment) return {};
  const allowed = [
    "companyName",
    "domain",
    "website",
    "description",
    "industry",
    "employeeCount",
    "employeeRange",
    "headquarters",
    "country",
    "city",
    "companyType",
    "foundedYear",
    "linkedin",
    "technologies",
    "confidence",
  ];
  const source = enrichment as unknown as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in source) {
      result[key] = source[key];
    }
  }
  return result;
}
