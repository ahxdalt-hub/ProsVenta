// ============================================================================
// Prosventa Intelligence Recommendations — Types
// Stage 4 — Phase 8: Intelligence Recommendations
// ============================================================================
// Strongly-typed contract for the recommendation model.
//
// A recommendation is a suggestion for the salesperson to consider — NOT
// autonomous sales automation. Every recommendation must have a reason
// (evidence-based). The user controls recommendation status.
//
// IMPORTANT DISTINCTION:
//   OBSERVED      → What Prosventa actually knows (evidence)
//   INFERENCE     → What Prosventa believes may be relevant (reasoning)
//   RECOMMENDATION → What the salesperson may consider doing (action)
// These are never merged into one statement.
// ============================================================================

// ============================================================================
// Recommendation Types
// ============================================================================
export type RecommendationType =
  // Research
  | "research_company"
  | "research_prospect"
  | "refresh_intelligence"
  // Review
  | "review_high_fit"
  | "review_company_signal"
  | "review_leadership_change"
  // Sales Preparation
  | "review_company_context"
  | "review_prospect_role"
  | "investigate_business_need"
  // Data Quality
  | "verify_company_info"
  | "verify_prospect_info"
  | "complete_icp_data"
  // Follow-up Opportunity (only with legitimate evidence)
  | "review_recent_signal"
  | "follow_up_company_event";

export const RECOMMENDATION_TYPES: RecommendationType[] = [
  "research_company",
  "research_prospect",
  "refresh_intelligence",
  "review_high_fit",
  "review_company_signal",
  "review_leadership_change",
  "review_company_context",
  "review_prospect_role",
  "investigate_business_need",
  "verify_company_info",
  "verify_prospect_info",
  "complete_icp_data",
  "review_recent_signal",
  "follow_up_company_event",
];

export const RECOMMENDATION_TYPE_LABELS: Record<RecommendationType, string> = {
  research_company: "Research company",
  research_prospect: "Research prospect",
  refresh_intelligence: "Refresh intelligence",
  review_high_fit: "Review high-fit prospect",
  review_company_signal: "Review company signal",
  review_leadership_change: "Review leadership change",
  review_company_context: "Review company context",
  review_prospect_role: "Review prospect role",
  investigate_business_need: "Investigate business need",
  verify_company_info: "Verify company information",
  verify_prospect_info: "Verify prospect information",
  complete_icp_data: "Complete ICP data",
  review_recent_signal: "Review recent signal",
  follow_up_company_event: "Follow up on company event",
};

// ============================================================================
// Priority
// ============================================================================
export type RecommendationPriority = "high" | "medium" | "low";

export const RECOMMENDATION_PRIORITIES: RecommendationPriority[] = ["high", "medium", "low"];

export const RECOMMENDATION_PRIORITY_LABELS: Record<RecommendationPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ============================================================================
// Status
// ============================================================================
export type RecommendationStatus = "new" | "reviewed" | "dismissed" | "completed";

export const RECOMMENDATION_STATUSES: RecommendationStatus[] = [
  "new",
  "reviewed",
  "dismissed",
  "completed",
];

export const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  dismissed: "Dismissed",
  completed: "Completed",
};

// ============================================================================
// Evidence
// ============================================================================
export type EvidenceSourceType =
  | "icp_score"
  | "signal"
  | "company_research"
  | "prospect_research"
  | "company_enrichment"
  | "prospect_enrichment"
  | "prospect_data"
  | "data_quality";

export interface RecommendationEvidence {
  /** Evidence type (e.g. "icp_score", "signal", "company_research") */
  type: EvidenceSourceType;
  /** Human-readable label (e.g. "ICP score: 91") */
  label: string;
  /** Detailed evidence description */
  detail: string;
  /** Source record ID when applicable (signal ID, research ID, score ID) */
  sourceId: string | null;
  /** When the underlying intelligence was retrieved */
  retrievedAt: string | null;
}

// ============================================================================
// Recommendation Record (Database)
// ============================================================================
export interface RecommendationRecord {
  id: string;
  organization_id: string;
  prospect_id: string | null;
  recommendation_type: RecommendationType;
  title: string;
  summary: string;
  reasoning: string;
  evidence: RecommendationEvidence[];
  priority: RecommendationPriority;
  confidence: number;
  status: RecommendationStatus;
  source_signal_ids: string[];
  source_research_ids: string[];
  source_score_id: string | null;
  dedupe_key: string;
  intelligence_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecommendationRecordInsert {
  organization_id: string;
  prospect_id?: string | null;
  recommendation_type: RecommendationType;
  title: string;
  summary: string;
  reasoning: string;
  evidence?: RecommendationEvidence[];
  priority: RecommendationPriority;
  confidence: number;
  status?: RecommendationStatus;
  source_signal_ids?: string[];
  source_research_ids?: string[];
  source_score_id?: string | null;
  dedupe_key: string;
  intelligence_updated_at?: string | null;
}

export interface RecommendationRecordUpdate {
  status?: RecommendationStatus;
  title?: string;
  summary?: string;
  reasoning?: string;
  evidence?: RecommendationEvidence[];
  priority?: RecommendationPriority;
  confidence?: number;
  intelligence_updated_at?: string | null;
  updated_at?: string;
}

// ============================================================================
// Recommendation Input (for generation)
// ============================================================================
export interface RecommendationInput {
  recommendation_type: RecommendationType;
  title: string;
  summary: string;
  reasoning: string;
  evidence: RecommendationEvidence[];
  priority: RecommendationPriority;
  confidence: number;
  source_signal_ids?: string[];
  source_research_ids?: string[];
  source_score_id?: string | null;
  /** Stable event identifier for deduplication */
  dedupe_key: string;
  /** When the underlying intelligence was last refreshed */
  intelligence_updated_at?: string | null;
}

// ============================================================================
// Recommendation Operation Result (server → UI)
// ============================================================================
export interface RecommendationOperationResult {
  status: "completed" | "failed";
  message: string;
  /** Number of new recommendations created */
  created: number;
  /** Number of duplicates skipped */
  duplicates: number;
}

// ============================================================================
// Recommendation Context (for generation)
// ============================================================================
// Structured intelligence context passed to the recommendation engine.
// Only relevant data is included — never the entire database.
// ============================================================================
export interface RecommendationContext {
  prospectId: string;
  organizationId: string;
  companyName: string | null;
  domain: string | null;
  contactName: string | null;
  contactEmail: string | null;
  jobTitle: string | null;
  /** ICP score when available (0-100) */
  icpScore: number | null;
  /** Whether company enrichment data is available */
  hasCompanyEnrichment: boolean;
  /** Whether prospect enrichment data is available */
  hasProspectEnrichment: boolean;
  /** Whether company research is available */
  hasCompanyResearch: boolean;
  /** Whether prospect research is available */
  hasProspectResearch: boolean;
  /** Recent signals (active, most relevant first) */
  signals: RecommendationSignalContext[];
  /** When company enrichment was last refreshed */
  companyEnrichmentUpdatedAt: string | null;
  /** When prospect enrichment was last refreshed */
  prospectEnrichmentUpdatedAt: string | null;
  /** When company research was last refreshed */
  companyResearchUpdatedAt: string | null;
  /** When prospect research was last refreshed */
  prospectResearchUpdatedAt: string | null;
}

export interface RecommendationSignalContext {
  id: string;
  signal_type: string;
  title: string;
  description: string;
  detected_at: string;
  confidence: string;
  importance: string;
  category: string;
}