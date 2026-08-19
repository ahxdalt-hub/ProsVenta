// ============================================================================
// Prosventa Buying & Intent Signals — Types
// Stage 4 — Phase 7: Buying & Intent Signals
// ============================================================================
// Strongly-typed contract for the normalized signal model.
//
// A signal is an OBSERVED EVENT with evidence — NOT proof that a prospect
// wants to buy. Interpretation is stored separately and always uses cautious
// language ("may indicate", "possible buying signal").
// ============================================================================

// ============================================================================
// Signal Types
// ============================================================================
export type SignalType =
  // Company events
  | "company_growth"
  | "hiring_activity"
  | "leadership_change"
  | "company_expansion"
  | "new_location"
  | "product_announcement"
  | "funding_event"
  // Prospect events
  | "job_change"
  | "role_change"
  | "company_change"
  | "profile_update"
  // Prosventa activity (product usage, NOT buying intent)
  | "prospect_imported"
  | "company_enriched"
  | "prospect_researched"
  | "score_changed"
  | "prospect_saved";

export const SIGNAL_TYPES: SignalType[] = [
  "company_growth",
  "hiring_activity",
  "leadership_change",
  "company_expansion",
  "new_location",
  "product_announcement",
  "funding_event",
  "job_change",
  "role_change",
  "company_change",
  "profile_update",
  "prospect_imported",
  "company_enriched",
  "prospect_researched",
  "score_changed",
  "prospect_saved",
];

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  company_growth: "Company growth",
  hiring_activity: "Hiring activity",
  leadership_change: "Leadership change",
  company_expansion: "Company expansion",
  new_location: "New location",
  product_announcement: "Product announcement",
  funding_event: "Funding event",
  job_change: "Job change",
  role_change: "Role change",
  company_change: "Company change",
  profile_update: "Profile update",
  prospect_imported: "Prospect imported",
  company_enriched: "Company enriched",
  prospect_researched: "Prospect researched",
  score_changed: "Score changed",
  prospect_saved: "Prospect saved",
};

// ============================================================================
// Signal Categories
// ============================================================================
export type SignalCategory =
  | "external_event"
  | "professional_change"
  | "company_change"
  | "website_intent"
  | "prosventa_activity";

export const SIGNAL_CATEGORIES: SignalCategory[] = [
  "external_event",
  "professional_change",
  "company_change",
  "website_intent",
  "prosventa_activity",
];

export const SIGNAL_CATEGORY_LABELS: Record<SignalCategory, string> = {
  external_event: "External Event",
  professional_change: "Professional Change",
  company_change: "Company Change",
  website_intent: "Website Intent",
  prosventa_activity: "Prosventa Activity",
};

// ============================================================================
// Confidence
// ============================================================================
export type SignalConfidence = "high" | "medium" | "low";

export const SIGNAL_CONFIDENCE_LABELS: Record<SignalConfidence, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ============================================================================
// Importance
// ============================================================================
export type SignalImportance = "critical" | "high" | "medium" | "low";

export const SIGNAL_IMPORTANCE_LABELS: Record<SignalImportance, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ============================================================================
// Status
// ============================================================================
export type SignalStatus = "active" | "dismissed" | "archived";

export const SIGNAL_STATUSES: SignalStatus[] = ["active", "dismissed", "archived"];

// ============================================================================
// Signal Record (Database)
// ============================================================================
export interface SignalRecord {
  id: string;
  organization_id: string;
  prospect_id: string | null;
  signal_type: SignalType;
  category: SignalCategory;
  title: string;
  description: string;
  evidence: string | null;
  source: string;
  source_url: string | null;
  detected_at: string;
  retrieved_at: string;
  confidence: SignalConfidence;
  importance: SignalImportance;
  status: SignalStatus;
  dedupe_key: string;
  interpretation: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignalRecordInsert {
  organization_id: string;
  prospect_id?: string | null;
  signal_type: SignalType;
  category: SignalCategory;
  title: string;
  description: string;
  evidence?: string | null;
  source: string;
  source_url?: string | null;
  detected_at: string;
  retrieved_at?: string;
  confidence: SignalConfidence;
  importance: SignalImportance;
  status?: SignalStatus;
  dedupe_key: string;
  interpretation?: string | null;
}

export interface SignalRecordUpdate {
  status?: SignalStatus;
  title?: string;
  description?: string;
  evidence?: string | null;
  interpretation?: string | null;
  importance?: SignalImportance;
  confidence?: SignalConfidence;
  updated_at?: string;
}

// ============================================================================
// Signal Input (for detection)
// ============================================================================
export interface SignalInput {
  signal_type: SignalType;
  category: SignalCategory;
  title: string;
  description: string;
  evidence?: string | null;
  source: string;
  source_url?: string | null;
  detected_at: string;
  confidence: SignalConfidence;
  importance: SignalImportance;
  interpretation?: string | null;
  /** Stable event identifier for deduplication (e.g. source event id) */
  event_id?: string | null;
}

// ============================================================================
// Signal Operation Result (server → UI)
// ============================================================================
export interface SignalOperationResult {
  status: "completed" | "failed";
  message: string;
  /** Number of new signals created */
  created: number;
  /** Number of duplicates skipped */
  duplicates: number;
  /** Whether an external provider was used */
  provider: string | null;
  /** Whether external signal detection is configured */
  externalConfigured: boolean;
}

// ============================================================================
// Signal Provider Abstraction
// ============================================================================
// All future external signal providers must implement this interface.
// The grounded internal engine is the default; external providers can be
// registered later without changing the UI contract.
// ============================================================================
export interface SignalProvider {
  id: string;
  name: string;
  /** Model identifier where appropriate (null for deterministic engine) */
  model: string | null;
  /**
   * Detects signals for a company/prospect.
   * Must be grounded — never invent events not present in the evidence.
   * Returns an empty array when no signals are detected.
   */
  detectSignals(input: SignalDetectionInput): Promise<SignalInput[]>;
}

// ============================================================================
// Signal Detection Input
// ============================================================================
export interface SignalDetectionInput {
  prospectId: string;
  organizationId: string;
  companyName: string | null;
  domain: string | null;
  contactName: string | null;
  contactEmail: string | null;
  jobTitle: string | null;
  /** Whether external research was performed (false in this phase) */
  externalResearchPerformed: boolean;
}

// ============================================================================
// Freshness
// ============================================================================
export type SignalFreshness = "today" | "this_week" | "this_month" | "older";

export function getSignalFreshness(detectedAt: string): SignalFreshness {
  const now = Date.now();
  const detected = new Date(detectedAt).getTime();
  const diffMs = now - detected;
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  const monthMs = 30 * dayMs;

  if (diffMs < dayMs) return "today";
  if (diffMs < weekMs) return "this_week";
  if (diffMs < monthMs) return "this_month";
  return "older";
}

export const SIGNAL_FRESHNESS_LABELS: Record<SignalFreshness, string> = {
  today: "Today",
  this_week: "This week",
  this_month: "This month",
  older: "Older",
};