// ============================================================================
// Prosventa AI Company Research — Types
// Stage 4 — Phase 4: AI Company Research
// ============================================================================
// Strongly-typed contract for the grounded company research brief.
// The AI must NEVER invent facts. Every field is nullable — unknown values
// are returned as null rather than fabricated.
// ============================================================================

// ============================================================================
// Research Confidence
// ============================================================================
export type ResearchConfidenceLevel = "high" | "medium" | "low";

export interface ResearchConfidence {
  /** 0–100 reliability score */
  score: number;
  level: ResearchConfidenceLevel;
  label: string;
}

// ============================================================================
// Source Types
// ============================================================================
export type ResearchSourceType =
  | "prosventa_data" // User-provided prospect data stored in Prosventa
  | "enrichment" // Company enrichment provider data
  | "external_web" // Future external web research (not yet connected)
  | "ai_analysis"; // AI synthesis of the above (not a factual source)

export interface ResearchSource {
  /** Source type — distinguishes Prosventa data from external research */
  type: ResearchSourceType;
  /** Human-readable source name (e.g. "Prosventa prospect data", "Clearbit") */
  name: string;
  /** Source URL when available (external web only) */
  url: string | null;
  /** When the source was retrieved */
  retrievedAt: string | null;
  /** Optional provider id for enrichment sources */
  provider: string | null;
}

// ============================================================================
// Grounded Fact
// ============================================================================
// A single claim with explicit grounding. `confidence` distinguishes
// KNOWN (high) from LIKELY/INFERRED (medium/low). `sourceIndex` references
// the source in the research result's `sources` array.
// ============================================================================
export interface ResearchFact {
  /** The factual claim */
  value: string;
  /** Grounding level: known vs inferred */
  confidence: ResearchConfidenceLevel;
  /** Index into the result's `sources` array (null when unverifiable) */
  sourceIndex: number | null;
  /** Human-readable note about uncertainty when confidence is not high */
  uncertaintyNote: string | null;
}

// ============================================================================
// Company Research Result
// ============================================================================
// The structured, validated output of a company research operation.
// The AI fills only what it can support from supplied evidence.
// ============================================================================
export interface CompanyResearchResult {
  /** One-line company overview */
  overview: string | null;
  /** What the company does */
  whatTheyDo: string | null;
  /** Products / services offered */
  productsServices: string[] | null;
  /** Target customers / who they serve */
  targetCustomers: string | null;
  /** Industry classification */
  industry: string | null;
  /** Business model (e.g. B2B SaaS, marketplace) where reasonably known */
  businessModel: string | null;
  /** Company size (employee range) */
  companySize: string | null;
  /** Headquarters / location */
  headquarters: string | null;
  /** Key business context (founded, type, notable context) */
  businessContext: string | null;
  /** Notable publicly available information */
  notableInfo: string[] | null;
  /** Why this company might matter to a salesperson */
  salesRelevance: string | null;
  /** Overall research confidence */
  confidence: ResearchConfidence;
  /** Traceable sources */
  sources: ResearchSource[];
  /** When the research was performed */
  researchedAt: string;
}

// ============================================================================
// Research Status
// ============================================================================
export type CompanyResearchStatus = "none" | "processing" | "completed" | "failed";

// ============================================================================
// Research Record (Database)
// ============================================================================
export interface CompanyResearchRecord {
  id: string;
  organization_id: string;
  prospect_id: string;
  domain: string;
  status: CompanyResearchStatus;
  error_code: string | null;
  error_message: string | null;
  /** Full validated CompanyResearchResult payload */
  result: CompanyResearchResult | null;
  /** AI provider used */
  provider: string;
  /** Model identifier where appropriate */
  model: string | null;
  /** Traceable source metadata */
  sources: ResearchSource[] | null;
  /** Overall confidence 0-100 */
  confidence: number | null;
  researched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyResearchRecordInsert {
  organization_id: string;
  prospect_id: string;
  domain: string;
  provider: string;
  status?: CompanyResearchStatus;
  error_code?: string | null;
  error_message?: string | null;
  result?: CompanyResearchResult | null;
  model?: string | null;
  sources?: ResearchSource[] | null;
  confidence?: number | null;
  researched_at?: string | null;
}

export interface CompanyResearchRecordUpdate {
  status?: CompanyResearchStatus;
  error_code?: string | null;
  error_message?: string | null;
  result?: CompanyResearchResult | null;
  model?: string | null;
  sources?: ResearchSource[] | null;
  confidence?: number | null;
  researched_at?: string | null;
}

// ============================================================================
// Research Operation Result (server → UI)
// ============================================================================
// Safe result returned to the UI. Never exposes provider secrets/stack traces.
// ============================================================================
export interface CompanyResearchOperationResult {
  status: CompanyResearchStatus;
  message: string;
  /** Only present when status === "completed" */
  result: CompanyResearchResult | null;
  provider: string;
  model: string | null;
  researchedAt: string | null;
}

// ============================================================================
// Research Inputs
// ============================================================================
// The research service gathers available company data from existing Prosventa
// data. This is the strongest available information — never fabricated.
// ============================================================================
export interface CompanyResearchContext {
  companyName: string | null;
  domain: string | null;
  website: string | null;
  description: string | null;
  industry: string | null;
  employeeCount: number | null;
  location: string | null;
  country: string | null;
  city: string | null;
  linkedin: string | null;
  /** Enrichment data (CompanyEnrichmentResult) when available */
  enrichment: Record<string, unknown> | null;
  /** Whether external web research was performed (false in this phase) */
  externalResearchPerformed: boolean;
}

// ============================================================================
// Research Provider Abstraction
// ============================================================================
// All future AI research providers must implement this interface.
// The grounded deterministic engine is the default; LLM providers can be
// registered later without changing the UI contract.
// ============================================================================
export interface CompanyResearchProvider {
  id: string;
  name: string;
  /** Model identifier where appropriate (null for deterministic engine) */
  model: string | null;
  /**
   * Produces a structured research result from the supplied context.
   * Must be grounded — never invent facts not present in the context.
   */
  research(context: CompanyResearchContext): Promise<CompanyResearchResult>;
}