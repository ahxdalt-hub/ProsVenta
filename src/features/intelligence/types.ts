// ============================================================================
// Prosventa Sales Intelligence Types
// Stage 4 — Phase 1: Intelligence Foundation
// ============================================================================
// Core types for the Sales Intelligence system. These define the contract
// between the UI, business logic, and future external intelligence providers.
// No external providers are connected yet — this is the architecture only.
// ============================================================================

import type { IntelligenceErrorCode } from "./errors";
import type { CompanyResearchResult } from "./research/types";

// ============================================================================
// Intelligence Operations
// ============================================================================
export type IntelligenceOperation =
  | "company_enrichment"
  | "prospect_enrichment"
  | "company_research"
  | "prospect_research"
  | "signals";

export const INTELLIGENCE_OPERATIONS: IntelligenceOperation[] = [
  "company_enrichment",
  "prospect_enrichment",
  "company_research",
  "prospect_research",
  "signals",
];

export const INTELLIGENCE_OPERATION_LABELS: Record<IntelligenceOperation, string> = {
  company_enrichment: "Company Enrichment",
  prospect_enrichment: "Prospect Enrichment",
  company_research: "Company Research",
  prospect_research: "Prospect Research",
  signals: "Signals",
};

// ============================================================================
// Job State
// ============================================================================
export type IntelligenceJobStatus = "pending" | "processing" | "completed" | "failed";

export const INTELLIGENCE_JOB_STATUSES: IntelligenceJobStatus[] = [
  "pending",
  "processing",
  "completed",
  "failed",
];

export const INTELLIGENCE_JOB_STATUS_LABELS: Record<IntelligenceJobStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

// ============================================================================
// Usage State
// ============================================================================
export type IntelligenceUsageStatus = "pending" | "completed" | "failed";

// ============================================================================
// Provider Abstraction
// ============================================================================
export interface IntelligenceProviderConfig {
  /** Unique provider identifier (e.g. "clearbit", "apollo") */
  id: string;
  /** Human-readable provider name */
  name: string;
  /** Short description of what the provider offers */
  description: string;
  /** Whether the provider requires an API key */
  requiresApiKey: boolean;
  /** Whether the provider is currently enabled */
  enabled: boolean;
  /** Operations this provider supports */
  supportedOperations: IntelligenceOperation[];
}

// ============================================================================
// Enrichment Inputs
// ============================================================================
export interface CompanyEnrichmentInput {
  domain: string;
  companyName?: string | null;
}

export interface ProspectEnrichmentInput {
  /** Company domain (e.g. example.com) */
  domain?: string | null;
  /** Company name */
  companyName?: string | null;
  /** Full contact name */
  contactName?: string | null;
  /** Professional/work email — strongest identifier */
  contactEmail?: string | null;
  /** LinkedIn profile URL — strong identifier */
  linkedinUrl?: string | null;
}

// ============================================================================
// Research Inputs
// ============================================================================
export interface CompanyResearchInput {
  domain: string;
  companyName?: string | null;
}

export interface ProspectResearchInput {
  domain?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
}

// ============================================================================
// Signals Input
// ============================================================================
export interface SignalsInput {
  domain: string;
  companyName?: string | null;
}

// ============================================================================
// Provider Results
// ============================================================================
export interface CompanyEnrichmentResult {
  /** Canonical company name */
  companyName: string | null;
  /** Canonical domain (e.g. example.com) */
  domain: string | null;
  /** Website URL */
  website: string | null;
  /** One-line company description */
  description: string | null;
  /** Industry classification */
  industry: string | null;
  /** Exact employee count (if known) */
  employeeCount: number | null;
  /** Human-readable employee range (e.g. "51-200") */
  employeeRange: string | null;
  /** Headquarters location line (e.g. "San Francisco, CA") */
  headquarters: string | null;
  /** Country (ISO or display name) */
  country: string | null;
  /** City */
  city: string | null;
  /** Company type (e.g. "Private", "Public", "Nonprofit") */
  companyType: string | null;
  /** Founded year */
  foundedYear: number | null;
  /** Logo URL (safe reference only — never download remote images) */
  logoUrl: string | null;
  /** LinkedIn company URL */
  linkedin: string | null;
  /** Estimated revenue, if known */
  revenue: number | null;
  /** Technologies observed on the company, where available */
  technologies: string[];
  /** Provider confidence 0-100 (null when unknown) */
  confidence: number | null;
}

// ============================================================================
// Prospect / Contact Intelligence
// ============================================================================
// Normalized professional information returned by a prospect enrichment
// provider. Every field is nullable — only store what the provider actually
// returns. Never invent missing person information.
// ============================================================================

export interface ProspectEnrichmentResult {
  /** Full name (if provided) */
  contactName: string | null;
  /** First name */
  firstName: string | null;
  /** Last name */
  lastName: string | null;
  /** Professional / work email */
  contactEmail: string | null;
  /** Work phone */
  contactPhone: string | null;
  /** Job title (e.g. "VP of Sales") */
  jobTitle: string | null;
  /** Seniority level (e.g. "C-level", "Director", "VP") */
  seniority: string | null;
  /** Department (e.g. "Sales", "Engineering") */
  department: string | null;
  /** Company name */
  companyName: string | null;
  /** Company domain */
  companyDomain: string | null;
  /** LinkedIn profile URL */
  linkedin: string | null;
  /** Profile URL (generic) */
  profileUrl: string | null;
  /** Location line */
  location: string | null;
  /** Country */
  country: string | null;
  /** City */
  city: string | null;
  /** Professional summary (short) */
  summary: string | null;
  /** Provider confidence 0-100 (null when unknown) */
  confidence: number | null;
}

// ============================================================================
// Prospect Identity
// ============================================================================
// Describes how a prospect will be identified when calling the provider.
// The strongest available identifier is chosen first.
// ============================================================================

export type ProspectIdentityStrength = "email" | "linkedin" | "name_company" | "none";

export interface ProspectIdentity {
  /** The primary identifier type */
  strength: ProspectIdentityStrength;
  email: string | null;
  linkedinUrl: string | null;
  /** Full name (used for name+company matching) */
  contactName: string | null;
  /** Company domain (used for name+company matching) */
  domain: string | null;
  /** Company name */
  companyName: string | null;
}

// ============================================================================
// Prospect Enrichment Status
// ============================================================================
export type ProspectEnrichmentStatus =
  | "none"
  | "processing"
  | "completed"
  | "failed";

// ============================================================================
// Prospect Enrichment Record (Database)
// ============================================================================
// Stores the normalized, durable prospect enrichment per organization/prospect.
// The `data` JSON column holds the full normalized enrichment payload.
// This is SEPARATE from the prospects table so user-provided info is never
// overwritten by provider data.
// ============================================================================

export interface ProspectEnrichmentRecord {
  id: string;
  organization_id: string;
  prospect_id: string;
  provider: string;
  status: ProspectEnrichmentStatus;
  error_code: IntelligenceErrorCode | null;
  error_message: string | null;
  /** Full normalized enrichment data (ProspectEnrichmentResult) */
  data: ProspectEnrichmentResult | null;
  /** Raw provider response (safe, non-secret subset) */
  raw: Record<string, unknown> | null;
  confidence: number | null;
  enriched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectEnrichmentRecordInsert {
  organization_id: string;
  prospect_id: string;
  provider: string;
  status?: ProspectEnrichmentStatus;
  error_code?: IntelligenceErrorCode | null;
  error_message?: string | null;
  data?: ProspectEnrichmentResult | null;
  raw?: Record<string, unknown> | null;
  confidence?: number | null;
  enriched_at?: string | null;
}

export interface ProspectEnrichmentRecordUpdate {
  status?: ProspectEnrichmentStatus;
  error_code?: IntelligenceErrorCode | null;
  error_message?: string | null;
  data?: ProspectEnrichmentResult | null;
  raw?: Record<string, unknown> | null;
  confidence?: number | null;
  enriched_at?: string | null;
}

// ============================================================================
// Prospect Enrichment Operation Result (server → UI)
// ============================================================================
// Safe result returned to the UI. Never exposes provider secrets/stack traces.
// `identityUsed` describes which identifier was used for the lookup.
// ============================================================================

export interface ProspectEnrichmentOperationResult {
  status: ProspectEnrichmentStatus;
  message: string;
  /** Only present when status === "completed" */
  data: ProspectEnrichmentResult | null;
  provider: string;
  enrichedAt: string | null;
  identityUsed: ProspectIdentityStrength | null;
}

// ============================================================================
// Prospect Intelligence (UI display model)
// ============================================================================
// Combines user-provided data from the prospect record with provider data for
// clean display. The distinction between user-provided and enriched values is
// preserved so user data is never destroyed by enrichment.
// ============================================================================

export interface ProspectIntelligence {
  // Professional Information
  jobTitle: { user: string | null; enriched: string | null } | null;
  department: { enriched: string | null } | null;
  seniority: { enriched: string | null } | null;
  location: { user: string | null; enriched: string | null } | null;
  linkedin: { user: string | null; enriched: string | null } | null;
  workEmail: { user: string | null; enriched: string | null } | null;
  // Company Information
  company: { user: string | null; enriched: string | null } | null;
  companyDomain: { user: string | null; enriched: string | null } | null;
  // Source Information
  provider: string | null;
  enrichedAt: string | null;
  confidence: number | null;
  status: ProspectEnrichmentStatus;
}

export interface ProspectResearchResult {
  summary: string | null;
  highlights: string[];
  confidence: number | null;
}

export interface SignalResult {
  type: string;
  title: string;
  description: string;
  detectedAt: string;
  confidence: number | null;
}

export interface SignalsResult {
  signals: SignalResult[];
  confidence: number | null;
}

// ============================================================================
// Intelligence Provider Interface
// ============================================================================
// All future intelligence providers must implement this interface.
// This ensures a consistent contract for enrichment, research, and signals.
export interface IntelligenceProvider {
  /** Returns the provider's configuration/metadata */
  getConfig(): IntelligenceProviderConfig;

  /** Enrich a company by domain */
  enrichCompany(input: CompanyEnrichmentInput): Promise<CompanyEnrichmentResult>;

  /** Enrich a prospect/contact */
  enrichProspect(input: ProspectEnrichmentInput): Promise<ProspectEnrichmentResult>;

  /** Research a company */
  researchCompany(input: CompanyResearchInput): Promise<CompanyResearchResult>;

  /** Research a prospect */
  researchProspect(input: ProspectResearchInput): Promise<ProspectResearchResult>;

  /** Get signals for a company */
  getSignals(input: SignalsInput): Promise<SignalsResult>;
}

// ============================================================================
// Provider Registry
// ============================================================================
export interface IntelligenceProviderRegistry {
  getProvider(id: string): IntelligenceProvider | undefined;
  getAllProviders(): IntelligenceProvider[];
  register(provider: IntelligenceProvider): void;
}

// ============================================================================
// Company Enrichment Record (Database)
// ============================================================================
// Stores the normalized, durable company enrichment per organization/prospect.
// The `data` JSON column holds the full normalized enrichment payload.
// ============================================================================

export type CompanyEnrichmentStatus =
  | "none"
  | "processing"
  | "completed"
  | "failed";

export interface CompanyEnrichmentRecord {
  id: string;
  organization_id: string;
  prospect_id: string;
  domain: string;
  provider: string;
  status: CompanyEnrichmentStatus;
  error_code: IntelligenceErrorCode | null;
  error_message: string | null;
  /** Full normalized enrichment data (CompanyEnrichmentResult) */
  data: CompanyEnrichmentResult | null;
  /** Raw provider response (safe, non-secret subset) */
  raw: Record<string, unknown> | null;
  confidence: number | null;
  enriched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyEnrichmentRecordInsert {
  organization_id: string;
  prospect_id: string;
  domain: string;
  provider: string;
  status?: CompanyEnrichmentStatus;
  error_code?: IntelligenceErrorCode | null;
  error_message?: string | null;
  data?: CompanyEnrichmentResult | null;
  raw?: Record<string, unknown> | null;
  confidence?: number | null;
  enriched_at?: string | null;
}

export interface CompanyEnrichmentRecordUpdate {
  status?: CompanyEnrichmentStatus;
  error_code?: IntelligenceErrorCode | null;
  error_message?: string | null;
  data?: CompanyEnrichmentResult | null;
  raw?: Record<string, unknown> | null;
  confidence?: number | null;
  enriched_at?: string | null;
}

// ============================================================================
// Enrichment Operation Result (server → UI)
// ============================================================================
// Safe result returned to the UI. Never exposes provider secrets/stack traces.
export interface EnrichmentResult {
  status: CompanyEnrichmentStatus;
  message: string;
  /** Only present when status === "completed" */
  data: CompanyEnrichmentResult | null;
  provider: string;
  enrichedAt: string | null;
}

// ============================================================================
// Intelligence Record (Database)
// ============================================================================
export interface IntelligenceRecord {
  id: string;
  organization_id: string;
  prospect_id: string;
  record_type: IntelligenceOperation;
  provider: string;
  source: string;
  confidence: number | null;
  data: Record<string, unknown>;
  raw: Record<string, unknown> | null;
  retrieved_at: string;
  created_at: string;
  updated_at: string;
}

export interface IntelligenceRecordInsert {
  organization_id: string;
  prospect_id: string;
  record_type: IntelligenceOperation;
  provider: string;
  source: string;
  confidence?: number | null;
  data?: Record<string, unknown>;
  raw?: Record<string, unknown> | null;
  retrieved_at?: string;
}

// ============================================================================
// Intelligence Job (Database)
// ============================================================================
export interface IntelligenceJob {
  id: string;
  organization_id: string;
  prospect_id: string | null;
  created_by: string;
  job_type: IntelligenceOperation;
  provider: string;
  status: IntelligenceJobStatus;
  error_code: string | null;
  error_message: string | null;
  attempt_count: number;
  max_attempts: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntelligenceJobInsert {
  organization_id: string;
  prospect_id?: string | null;
  created_by: string;
  job_type: IntelligenceOperation;
  provider: string;
  status?: IntelligenceJobStatus;
  error_code?: string | null;
  error_message?: string | null;
  attempt_count?: number;
  max_attempts?: number;
}

export interface IntelligenceJobUpdate {
  status?: IntelligenceJobStatus;
  error_code?: string | null;
  error_message?: string | null;
  attempt_count?: number;
  started_at?: string | null;
  completed_at?: string | null;
}

// ============================================================================
// Intelligence Usage (Database)
// ============================================================================
export interface IntelligenceUsage {
  id: string;
  organization_id: string;
  user_id: string;
  operation: IntelligenceOperation;
  provider: string;
  status: IntelligenceUsageStatus;
  created_at: string;
}

export interface IntelligenceUsageInsert {
  organization_id: string;
  user_id: string;
  operation: IntelligenceOperation;
  provider: string;
  status?: IntelligenceUsageStatus;
}