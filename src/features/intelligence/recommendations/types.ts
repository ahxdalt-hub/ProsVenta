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
  | "follow_up_company_event"
  // Feature 5 Phase 1: reconsider a prospect whose underlying context changed
  // (ICP updated, intelligence invalidated, material company/prospect change).
  | "reassess_prospect";

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
  reassess_prospect: "Reassess prospect",
};

/**
 * Controlled category per recommendation type. Keeps the taxonomy small:
 * priority / research / signal / data_quality / intelligence.
 */
export const RECOMMENDATION_TYPE_CATEGORIES: Record<RecommendationType, RecommendationCategory> = {
  research_company: "research",
  research_prospect: "research",
  refresh_intelligence: "intelligence",
  review_high_fit: "priority",
  review_company_signal: "signal",
  review_leadership_change: "signal",
  review_company_context: "research",
  review_prospect_role: "research",
  investigate_business_need: "research",
  verify_company_info: "data_quality",
  verify_prospect_info: "data_quality",
  complete_icp_data: "data_quality",
  review_recent_signal: "signal",
  follow_up_company_event: "signal",
  reassess_prospect: "priority",
};

// ============================================================================
// Priority — Feature 5 Phase 1: five-level scale.
// Priority is derived from existing Intelligence scoring/evidence; it is
// NEVER an arbitrary AI judgement. Confidence stays separate (below).
// ============================================================================
export type RecommendationPriority = "very_high" | "high" | "medium" | "low" | "very_low";

export const RECOMMENDATION_PRIORITIES: RecommendationPriority[] = [
  "very_high",
  "high",
  "medium",
  "low",
  "very_low",
];

export const RECOMMENDATION_PRIORITY_LABELS: Record<RecommendationPriority, string> = {
  very_high: "Very High",
  high: "High",
  medium: "Medium",
  low: "Low",
  very_low: "Very Low",
};

/** Numeric weight used ONLY for deterministic ranking (not user-facing). */
export const RECOMMENDATION_PRIORITY_WEIGHTS: Record<RecommendationPriority, number> = {
  very_high: 50,
  high: 40,
  medium: 30,
  low: 20,
  very_low: 10,
};

/** Maps the legacy three-level engine output onto the five-level scale. */
export function expandLegacyPriority(priority: "high" | "medium" | "low"): RecommendationPriority {
  return priority;
}

// ============================================================================
// Status — Feature 5 Phase 1 lifecycle.
//
//   new → viewed → accepted | dismissed
//   new|viewed → expired      (deterministic TTL per type/category)
//   any active state → superseded (invalidation; history is preserved)
//
// Legacy Stage-4 values ('reviewed', 'completed') remain valid so historical
// rows keep rendering. They are treated as terminal, viewed-equivalent states.
// ============================================================================
export type RecommendationStatus =
  | "new"
  | "viewed"
  | "accepted"
  | "dismissed"
  | "expired"
  | "superseded"
  // Legacy values — readable, no longer produced by new generation flows.
  | "reviewed"
  | "completed";

export const RECOMMENDATION_STATUSES: RecommendationStatus[] = [
  "new",
  "viewed",
  "accepted",
  "dismissed",
  "expired",
  "superseded",
];

export const LEGACY_RECOMMENDATION_STATUSES: RecommendationStatus[] = ["reviewed", "completed"];

export const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string> = {
  new: "New",
  viewed: "Viewed",
  accepted: "Accepted",
  dismissed: "Dismissed",
  expired: "Expired",
  superseded: "Superseded",
  reviewed: "Reviewed",
  completed: "Completed",
};

/** States that still deserve the user's attention / appear in active lists. */
export const ACTIVE_RECOMMENDATION_STATUSES: RecommendationStatus[] = ["new", "viewed"];

/** States a recommendation can transition INTO from an active state. */
export const TERMINAL_RECOMMENDATION_STATUSES: RecommendationStatus[] = [
  "accepted",
  "dismissed",
  "expired",
  "superseded",
];

/**
 * Allowed deterministic status transitions. User actions and the expiry sweep
 * both go through this — nothing else may change status.
 */
export const RECOMMENDATION_STATUS_TRANSITIONS: Record<RecommendationStatus, RecommendationStatus[]> = {
  new: ["viewed", "accepted", "dismissed", "expired", "superseded"],
  viewed: ["accepted", "dismissed", "expired", "superseded"],
  accepted: ["superseded"],
  dismissed: [],
  expired: [],
  superseded: [],
  reviewed: ["completed", "superseded"],
  completed: ["superseded"],
};

export function canTransitionStatus(
  from: RecommendationStatus,
  to: RecommendationStatus
): boolean {
  return (RECOMMENDATION_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

// ============================================================================
// Source — why this recommendation exists. Intelligence remains the primary
// reasoning layer; 'signal', 'icp' and 'system' mark direct/deterministic
// derivations.
// ============================================================================
export type RecommendationSourceType = "intelligence" | "signal" | "icp" | "system";

export const RECOMMENDATION_SOURCE_TYPES: RecommendationSourceType[] = [
  "intelligence",
  "signal",
  "icp",
  "system",
];

export const RECOMMENDATION_SOURCE_LABELS: Record<RecommendationSourceType, string> = {
  intelligence: "Intelligence",
  signal: "Signal",
  icp: "ICP",
  system: "System",
};

// ============================================================================
// Category — small, useful taxonomy grouping the controlled types.
// ============================================================================
export type RecommendationCategory =
  | "priority"
  | "research"
  | "signal"
  | "data_quality"
  | "intelligence";

export const RECOMMENDATION_CATEGORIES: RecommendationCategory[] = [
  "priority",
  "research",
  "signal",
  "data_quality",
  "intelligence",
];

export const RECOMMENDATION_CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  priority: "Prioritize",
  research: "Research",
  signal: "Review signal",
  data_quality: "Data quality",
  intelligence: "Intelligence",
};

// ============================================================================
// Dismissal reason — optional, lightweight feedback metadata.
// ============================================================================
export type RecommendationDismissalReason =
  | "not_relevant"
  | "already_handled"
  | "incorrect"
  | "not_interested"
  | "other";

export const RECOMMENDATION_DISMISSAL_REASONS: RecommendationDismissalReason[] = [
  "not_relevant",
  "already_handled",
  "incorrect",
  "not_interested",
  "other",
];

export const RECOMMENDATION_DISMISSAL_REASON_LABELS: Record<RecommendationDismissalReason, string> = {
  not_relevant: "Not relevant",
  already_handled: "Already handled",
  incorrect: "Incorrect",
  not_interested: "Not interested",
  other: "Other",
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
  // --- Feature 5 Phase 1 foundation fields ---
  recommendation_category?: RecommendationCategory | null;
  source_type?: RecommendationSourceType | null;
  /** Intelligence generation this recommendation is grounded in (reference only). */
  intelligence_insight_id?: string | null;
  expires_at?: string | null;
  freshness?: "fresh" | "aging" | "stale" | "expired" | null;
  superseded_by_id?: string | null;
  viewed_at?: string | null;
  accepted_at?: string | null;
  dismissed_at?: string | null;
  dismissal_reason?: RecommendationDismissalReason | null;
  feedback?: string | null;
  // --- Feature 5 Phase 2: decision engine ---
  /** Exactly one active primary recommendation per prospect. */
  primary_recommendation?: boolean | null;
  /** Stable fingerprint of the underlying context that produced this rec. */
  context_fingerprint?: string | null;
  /** Which trigger produced this recommendation (observability). */
  generation_trigger?: string | null;
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
  // --- Feature 5 Phase 1 foundation fields ---
  recommendation_category?: RecommendationCategory | null;
  source_type?: RecommendationSourceType | null;
  intelligence_insight_id?: string | null;
  expires_at?: string | null;
  freshness?: "fresh" | "aging" | "stale" | "expired" | null;
  // --- Feature 5 Phase 2: decision engine ---
  primary_recommendation?: boolean | null;
  context_fingerprint?: string | null;
  generation_trigger?: string | null;
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
  // --- Feature 5 Phase 1 foundation fields ---
  freshness?: "fresh" | "aging" | "stale" | "expired" | null;
  expires_at?: string | null;
  superseded_by_id?: string | null;
  viewed_at?: string | null;
  accepted_at?: string | null;
  dismissed_at?: string | null;
  dismissal_reason?: RecommendationDismissalReason | null;
  feedback?: string | null;
  // --- Feature 5 Phase 2: decision engine ---
  primary_recommendation?: boolean | null;
  context_fingerprint?: string | null;
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
  // --- Feature 5 Phase 1 foundation fields ---
  /** Why this recommendation exists (Intelligence is the primary layer). */
  source_type?: RecommendationSourceType;
  /** Intelligence generation this recommendation is grounded in. */
  intelligence_insight_id?: string | null;
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