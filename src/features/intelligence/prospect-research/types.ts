// ============================================================================
// Prosventa AI Prospect Research — Types
// Stage 4 — Phase 5: AI Prospect Research
// ============================================================================
// Strongly-typed contract for the grounded prospect-intelligence brief.
// The AI must NEVER invent facts. Every field is nullable — unknown values
// are returned as null rather than fabricated.
//
// Strict grounding distinguishes:
//   KNOWN (high confidence — verifiable from evidence)
//   INFERRED (medium/low confidence — reasonable interpretation)
//   UNKNOWN (null — omitted)
// ============================================================================

// ============================================================================
// Research Confidence
// ============================================================================
export type ProspectResearchConfidenceLevel = "high" | "medium" | "low";

export interface ProspectResearchConfidence {
  score: number;
  level: ProspectResearchConfidenceLevel;
  label: string;
}

// ============================================================================
// Source Types
// ============================================================================
export type ProspectResearchSourceType =
  | "prosventa_data"
  | "prospect_enrichment"
  | "company_enrichment"
  | "company_research"
  | "external_web"
  | "ai_analysis";

export interface ProspectResearchSource {
  type: ProspectResearchSourceType;
  name: string;
  url: string | null;
  retrievedAt: string | null;
  provider: string | null;
}

// ============================================================================
// Grounded Fact
// ============================================================================
export interface ProspectResearchFact {
  value: string;
  confidence: ProspectResearchConfidenceLevel;
  uncertaintyNote: string | null;
}

// ============================================================================
// Prospect Research Result
// ============================================================================
// The structured, validated output of a prospect research operation.
// The AI fills only what it can support from supplied evidence.
// ============================================================================
export interface ProspectResearchResult {
  /** Concise professional summary of who this person is */
  professionalSummary: string | null;
  /** Current job title (verbatim from evidence) */
  currentRole: {
    title: string | null;
    company: string | null;
    department: string | null;
  } | null;
  /** Seniority level (e.g. "C-level", "Director", "VP") when available */
  seniority: string | null;
  /** Likely responsibilities — ONLY when supported by evidence */
  likelyResponsibilities: string[] | null;
  /** How this person's role relates to the company */
  roleContext: string | null;
  /** Company context used for relevance interpretation */
  companyContext: string | null;
  /** Professional background where reliably available */
  professionalBackground: string | null;
  /** Professional location/city/country */
  location: {
    city: string | null;
    country: string | null;
  } | null;
  /** Publicly available professional context (safe, work-related only) */
  publicProfessionalContext: string[] | null;
  /** Why this person might be relevant to a salesperson */
  potentialBusinessRelevance: string | null;
  /** Possible pain points — ONLY when supported by evidence, never assumed */
  possiblePainPoints: string[] | null;
  /** Explicitly verified facts (KNOWN) */
  verifiedFacts: ProspectResearchFact[];
  /** Explicitly inferred claims (LIKELY/INFERRED) */
  inferredFacts: ProspectResearchFact[];
  /** Explicit uncertainty notes (UNKNOWN / could not be verified) */
  unknownAreas: string[] | null;
  /** Overall research confidence */
  confidence: ProspectResearchConfidence;
  /** Traceable sources */
  sources: ProspectResearchSource[];
  /** When the research was performed */
  researchedAt: string;
}

// ============================================================================
// Research Status
// ============================================================================
export type ProspectResearchStatus = "none" | "processing" | "completed" | "failed";

// ============================================================================
// Research Record (Database)
// ============================================================================
export interface ProspectResearchRecord {
  id: string;
  organization_id: string;
  prospect_id: string;
  status: ProspectResearchStatus;
  error_code: string | null;
  error_message: string | null;
  /** Full validated ProspectResearchResult payload */
  result: ProspectResearchResult | null;
  /** AI provider used */
  provider: string;
  /** Model identifier where appropriate */
  model: string | null;
  /** Traceable source metadata */
  sources: ProspectResearchSource[] | null;
  /** Overall confidence 0-100 */
  confidence: number | null;
  researched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectResearchRecordInsert {
  organization_id: string;
  prospect_id: string;
  provider: string;
  status?: ProspectResearchStatus;
  error_code?: string | null;
  error_message?: string | null;
  result?: ProspectResearchResult | null;
  model?: string | null;
  sources?: ProspectResearchSource[] | null;
  confidence?: number | null;
  researched_at?: string | null;
}

export interface ProspectResearchRecordUpdate {
  status?: ProspectResearchStatus;
  error_code?: string | null;
  error_message?: string | null;
  result?: ProspectResearchResult | null;
  model?: string | null;
  sources?: ProspectResearchSource[] | null;
  confidence?: number | null;
  researched_at?: string | null;
}

// ============================================================================
// Research Operation Result (server → UI)
// ============================================================================
// Safe result returned to the UI. Never exposes provider secrets/stack traces.
// ============================================================================
export interface ProspectResearchOperationResult {
  status: ProspectResearchStatus;
  message: string;
  /** Only present when status === "completed" */
  result: ProspectResearchResult | null;
  provider: string;
  model: string | null;
  researchedAt: string | null;
}

// ============================================================================
// Research Inputs
// ============================================================================
// The research service gathers available prospect information from existing
// Prosventa data. This is the strongest available information — never fabricated.
// ============================================================================

/** Enriched contact/prospect data (ProspectEnrichmentResult) */
export interface ProspectResearchEnrichmentData {
  contactName: string | null;
  firstName: string | null;
  lastName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  jobTitle: string | null;
  seniority: string | null;
  department: string | null;
  companyName: string | null;
  companyDomain: string | null;
  linkedin: string | null;
  profileUrl: string | null;
  location: string | null;
  country: string | null;
  city: string | null;
  summary: string | null;
  confidence: number | null;
}

/** Company enrichment data (CompanyEnrichmentResult) */
export interface ProspectResearchCompanyEnrichment {
  companyName: string | null;
  domain: string | null;
  website: string | null;
  description: string | null;
  industry: string | null;
  employeeCount: number | null;
  employeeRange: string | null;
  headquarters: string | null;
  country: string | null;
  city: string | null;
  companyType: string | null;
  foundedYear: number | null;
  linkedin: string | null;
  technologies: string[];
  confidence: number | null;
}

/** Company research brief (CompanyResearchResult) */
export interface ProspectResearchCompanyBrief {
  overview: string | null;
  whatTheyDo: string | null;
  industry: string | null;
  businessModel: string | null;
  companySize: string | null;
  headquarters: string | null;
  salesRelevance: string | null;
}

export interface ProspectResearchContext {
  prospectName: string | null;
  jobTitle: string | null;
  department: string | null;
  seniority: string | null;
  workEmail: string | null;
  workEmailDomain: string | null;
  linkedinUrl: string | null;
  location: string | null;
  country: string | null;
  city: string | null;
  companyName: string | null;
  companyDomain: string | null;
  description: string | null;
  industry: string | null;
  employeeCount: number | null;
  /** Prospect/contact enrichment data when available */
  prospectEnrichment: ProspectResearchEnrichmentData | null;
  /** Company enrichment data when available */
  companyEnrichment: ProspectResearchCompanyEnrichment | null;
  /** Company research brief when available */
  companyBrief: ProspectResearchCompanyBrief | null;
  /** Whether external web research was performed (false in this phase) */
  externalResearchPerformed: boolean;
}

// ============================================================================
// Research Provider Abstraction
// ============================================================================
// All future prospect research providers must implement this interface.
// The grounded deterministic engine is the default; LLM providers can be
// registered later without changing the UI contract.
// ============================================================================
export interface ProspectResearchProvider {
  id: string;
  name: string;
  /** Model identifier where appropriate (null for deterministic engine) */
  model: string | null;
  /**
   * Produces a structured prospect research result from the supplied context.
   * Must be grounded — never invent facts not present in the context.
   */
  research(context: ProspectResearchContext): Promise<ProspectResearchResult>;
}
