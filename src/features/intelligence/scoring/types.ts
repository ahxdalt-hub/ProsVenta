// ============================================================================
// Prosventa Smart Lead & ICP Scoring — Types
// Stage 4 — Phase 6: Smart Lead & ICP Scoring
// ============================================================================
// Strongly-typed contract for ICP configuration and prospect scoring.
// The scoring system is EXPLAINABLE — every factor has a name, score,
// maximum, reason, and evidence. No arbitrary AI-generated numbers.
// ============================================================================

// ============================================================================
// ICP Criteria
// ============================================================================

export interface CompanyCriteria {
  /** Target industries (exact match) */
  targetIndustries: string[];
  /** Excluded industries (exact match) */
  excludedIndustries: string[];
  /** Target company sizes (e.g. "1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+") */
  targetCompanySizes: string[];
  /** Minimum employee count (inclusive) */
  minEmployees: number | null;
  /** Maximum employee count (inclusive) */
  maxEmployees: number | null;
  /** Target countries/regions (exact match) */
  targetCountries: string[];
  /** Target company types (e.g. "Private", "Public", "Nonprofit") */
  targetCompanyTypes: string[];
  /** Target technologies (where supported) */
  targetTechnologies: string[];
  /** Target business models (e.g. "B2B", "B2C", "Marketplace") */
  targetBusinessModels: string[];
}

export interface ProspectCriteria {
  /** Target job titles (substring match) */
  targetJobTitles: string[];
  /** Target departments (exact match) */
  targetDepartments: string[];
  /** Target seniority levels (e.g. "C-level", "VP", "Director", "Manager") */
  targetSeniorityLevels: string[];
  /** Target locations (substring match) */
  targetLocations: string[];
  /** Excluded roles (substring match) */
  excludedRoles: string[];
}

export interface IcpCriteria {
  company: CompanyCriteria;
  prospect: ProspectCriteria;
}

export function createEmptyIcpCriteria(): IcpCriteria {
  return {
    company: {
      targetIndustries: [],
      excludedIndustries: [],
      targetCompanySizes: [],
      minEmployees: null,
      maxEmployees: null,
      targetCountries: [],
      targetCompanyTypes: [],
      targetTechnologies: [],
      targetBusinessModels: [],
    },
    prospect: {
      targetJobTitles: [],
      targetDepartments: [],
      targetSeniorityLevels: [],
      targetLocations: [],
      excludedRoles: [],
    },
  };
}

// ============================================================================
// ICP Configuration
// ============================================================================

export interface IcpConfiguration {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  criteria: IcpCriteria;
  created_at: string;
  updated_at: string;
}

export interface IcpConfigurationInsert {
  organization_id: string;
  name?: string;
  description?: string | null;
  criteria?: IcpCriteria;
}

export interface IcpConfigurationUpdate {
  name?: string;
  description?: string | null;
  criteria?: IcpCriteria;
}

// ============================================================================
// Scoring
// ============================================================================

export type ScoreCategory = "excellent" | "strong" | "moderate" | "weak" | "poor";

export type FactorStatus = "match" | "mismatch" | "unknown";

export interface ScoringFactor {
  /** Factor name (e.g. "Industry", "Company size", "Job seniority") */
  name: string;
  /** Points earned */
  score: number;
  /** Maximum points available */
  maxScore: number;
  /** Human-readable reason for the score */
  reason: string;
  /** Match / mismatch / unknown */
  status: FactorStatus;
  /** Evidence/source where available */
  evidence: string | null;
}

export interface ProspectScore {
  id: string;
  prospect_id: string;
  organization_id: string;
  icp_configuration_id: string | null;
  score: number;
  confidence: number;
  category: ScoreCategory;
  company_score: number;
  prospect_score: number;
  factors: ScoringFactor[];
  scoring_version: string;
  scored_at: string;
  created_at: string;
  updated_at: string;
}

export interface ProspectScoreInsert {
  prospect_id: string;
  organization_id: string;
  icp_configuration_id?: string | null;
  score: number;
  confidence: number;
  category: ScoreCategory;
  company_score: number;
  prospect_score: number;
  factors: ScoringFactor[];
  scoring_version: string;
  scored_at?: string;
}

export interface ProspectScoreUpdate {
  score?: number;
  confidence?: number;
  category?: ScoreCategory;
  company_score?: number;
  prospect_score?: number;
  factors?: ScoringFactor[];
  scoring_version?: string;
  scored_at?: string;
}

// ============================================================================
// Scoring Inputs
// ============================================================================

/** Company data available for scoring (from prospect + enrichment) */
export interface CompanyScoringData {
  industry: string | null;
  employeeCount: number | null;
  employeeRange: string | null;
  country: string | null;
  companyType: string | null;
  technologies: string[];
  businessModel: string | null;
}

/** Prospect/contact data available for scoring */
export interface ProspectScoringData {
  jobTitle: string | null;
  department: string | null;
  seniority: string | null;
  location: string | null;
  country: string | null;
  city: string | null;
}

/** Full scoring context for a prospect */
export interface ProspectScoringContext {
  prospectId: string;
  organizationId: string;
  company: CompanyScoringData;
  prospect: ProspectScoringData;
  /** Whether company enrichment data is available */
  hasCompanyEnrichment: boolean;
  /** Whether prospect enrichment data is available */
  hasProspectEnrichment: boolean;
  /** Whether company research is available */
  hasCompanyResearch: boolean;
  /** Whether prospect research is available */
  hasProspectResearch: boolean;
}

// ============================================================================
// Scoring Result (server → UI)
// ============================================================================

export interface ScoreOperationResult {
  status: "completed" | "failed";
  message: string;
  score: ProspectScore | null;
}

// ============================================================================
// Score Categories
// ============================================================================

export const SCORE_CATEGORY_THRESHOLDS: Record<ScoreCategory, { min: number; max: number; label: string }> = {
  excellent: { min: 90, max: 100, label: "Excellent fit" },
  strong: { min: 75, max: 89, label: "Strong fit" },
  moderate: { min: 50, max: 74, label: "Moderate fit" },
  weak: { min: 25, max: 49, label: "Weak fit" },
  poor: { min: 0, max: 24, label: "Poor fit" },
};

export function getScoreCategory(score: number): ScoreCategory {
  if (score >= 90) return "excellent";
  if (score >= 75) return "strong";
  if (score >= 50) return "moderate";
  if (score >= 25) return "weak";
  return "poor";
}

export function getScoreCategoryLabel(category: ScoreCategory): string {
  return SCORE_CATEGORY_THRESHOLDS[category].label;
}

// ============================================================================
// Scoring Version
// ============================================================================

export const SCORING_VERSION = "v1";