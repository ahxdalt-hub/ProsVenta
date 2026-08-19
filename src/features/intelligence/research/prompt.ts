// ============================================================================
// Prosventa AI Company Research — Prompt Design
// Stage 4 — Phase 4: AI Company Research
// ============================================================================
// Server-side research prompt. This instructs the AI to analyze ONLY the
// supplied evidence, identify uncertainty, avoid unsupported claims, and
// produce structured JSON. Never placed inside a React component.
// ============================================================================

import type { CompanyResearchContext } from "./types";

/**
 * Builds a grounded research prompt for a company.
 * The AI is instructed to:
 *  - analyze only supplied evidence
 *  - identify uncertainty explicitly
 *  - avoid unsupported claims
 *  - summarize clearly and concisely
 *  - focus on business/sales relevance
 *  - provide source references where available
 *
 * The prompt is structured so that any AI provider (deterministic engine,
 * future LLM) can consume the same evidence and produce a grounded brief.
 */
export function buildResearchPrompt(context: CompanyResearchContext): string {
  const lines: string[] = [];
  lines.push("You are a sales intelligence research assistant for Prosventa.");
  lines.push("");
  lines.push("Analyze the company data provided below and produce a concise business-intelligence brief.");
  lines.push("");
  lines.push("CRITICAL GROUNDING RULES:");
  lines.push("1. Analyze ONLY the supplied evidence. Do not use outside knowledge or assumptions.");
  lines.push("2. Clearly distinguish KNOWN facts (high confidence, verifiable from evidence) from");
  lines.push("   LIKELY/INFERRED (medium/low confidence) and UNKNOWN (null).");
  lines.push("3. NEVER invent facts. If information is not present in the evidence, return null.");
  lines.push("4. NEVER fabricate revenue, employee counts, funding, customers, products, executives,");
  lines.push("   partnerships, locations, technologies, or business relationships.");
  lines.push("5. If a fact cannot be verified from the evidence, do not claim it.");
  lines.push("6. Focus on business and sales relevance, not personal information.");
  lines.push("7. Be concise. Avoid unnecessary verbosity.");
  lines.push("8. Attach a source reference to each factual claim where available.");
  lines.push("");
  lines.push("=== COMPANY EVIDENCE ===");
  lines.push(serializeContext(context));
  lines.push("");
  lines.push("=== OUTPUT FORMAT ===");
  lines.push("Return a single JSON object with EXACTLY these fields:");
  lines.push(`{
  "overview": "One-line company overview or null",
  "whatTheyDo": "What the company does, or null",
  "productsServices": ["Product/service" or null],
  "targetCustomers": "Who they serve, or null",
  "industry": "Industry classification, or null",
  "businessModel": "Business model if reasonably known, or null",
  "companySize": "Company size (employee range), or null",
  "headquarters": "Headquarters/location, or null",
  "businessContext": "Key business context, or null",
  "notableInfo": ["Notable publicly available info" or null],
  "salesRelevance": "Why this company might matter to a salesperson, or null",
  "confidence": {
    "score": 0,
    "level": "high|medium|low",
    "label": "Human-readable label"
  },
  "sources": [
    {
      "type": "prosventa_data|enrichment|external_web|ai_analysis",
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
  lines.push("- productsServices and notableInfo should be null (not empty arrays) when no data.");
  lines.push("- sources must reference where each claim came from (prosventa_data, enrichment, or ai_analysis).");
  lines.push("- external_web is ONLY used if external web research actually occurred.");
  lines.push("- researchedAt must be the current ISO timestamp.");
  return lines.join("\n");
}

/**
 * Serializes the company research context into a compact, evidence-only block.
 * Only business-relevant company data is included. No personal prospect data.
 */
function serializeContext(context: CompanyResearchContext): string {
  const fields: string[] = [];

  if (context.companyName) fields.push(`Company Name: ${context.companyName}`);
  if (context.domain) fields.push(`Domain: ${context.domain}`);
  if (context.website) fields.push(`Website: ${context.website}`);
  if (context.description) fields.push(`Description: ${context.description}`);
  if (context.industry) fields.push(`Industry: ${context.industry}`);
  if (context.employeeCount !== null && context.employeeCount !== undefined) {
    fields.push(`Employee Count: ${context.employeeCount}`);
  }
  if (context.location) fields.push(`Location: ${context.location}`);
  if (context.country) fields.push(`Country: ${context.country}`);
  if (context.city) fields.push(`City: ${context.city}`);
  if (context.linkedin) fields.push(`LinkedIn: ${context.linkedin}`);

  if (context.enrichment && Object.keys(context.enrichment).length > 0) {
    fields.push("Enrichment Data:");
    fields.push(JSON.stringify(sanitizeEnrichment(context.enrichment), null, 2));
  }

  fields.push(`External Web Research Performed: ${context.externalResearchPerformed ? "Yes" : "No"}`);

  return fields.length > 0 ? fields.join("\n") : "No company data available.";
}

/**
 * Sanitizes enrichment data to a safe, non-secret subset that is relevant
 * to company research. Prevents any sensitive or irrelevant fields leaking.
 */
function sanitizeEnrichment(enrichment: Record<string, unknown>): Record<string, unknown> {
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
    "logoUrl",
    "linkedin",
    "revenue",
    "technologies",
    "confidence",
  ];
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in enrichment) {
      result[key] = enrichment[key];
    }
  }
  return result;
}