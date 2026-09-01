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
// External signals may be 'detected' (freshly retrieved, not yet reviewed),
// 'unverified', or 'verified' — verification is NEVER automatic.
export type SignalStatus =
  | "active"
  | "detected"
  | "unverified"
  | "verifying"
  | "verified"
  | "expired"
  | "dismissed"
  | "archived";

export const SIGNAL_STATUSES: SignalStatus[] = [
  "active",
  "detected",
  "unverified",
  "verifying",
  "verified",
  "expired",
  "dismissed",
  "archived",
];

/** Whether a signal originated from Prosventa activity or the outside world. */
export type SignalOrigin = "internal" | "external";

// ============================================================================
// Signal Record (Database)
// ============================================================================
export interface SignalRecord {
  id: string;
  organization_id: string;
  prospect_id: string | null;
  signal_type: SignalType;
  category: SignalCategory;
  /** 'internal' = Prosventa activity · 'external' = real-world provider event */
  signal_origin: SignalOrigin;
  title: string;
  description: string;
  /** Short human summary — kept distinct from title/description */
  summary: string | null;
  evidence: string | null;
  source: string;
  source_url: string | null;
  /** The source's own stable record id (provenance + dedup anchor) */
  source_record_id: string | null;
  detected_at: string;
  /** When the source published/reported the event (external signals) */
  published_at: string | null;
  /** When the event actually occurred — never invented */
  occurred_at: string | null;
  /** Optional expiry ceiling for time-sensitive signals */
  expires_at: string | null;
  /** When the source published/reported the event (external signals) */
  retrieved_at: string;
  confidence: SignalConfidence;
  importance: SignalImportance;
  status: SignalStatus;
  dedupe_key: string;
  interpretation: string | null;
  /** Signal-capable provider that produced an external signal */
  provider: string | null;
  /** The provider's own event identifier (provenance + dedup) */
  provider_signal_id: string | null;
  /** Normalized company domain — links company-level signals to prospects */
  company_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignalRecordInsert {
  organization_id: string;
  prospect_id?: string | null;
  signal_type: SignalType;
  category: SignalCategory;
  signal_origin?: SignalOrigin;
  title: string;
  description: string;
  summary?: string | null;
  evidence?: string | null;
  source: string;
  source_url?: string | null;
  source_record_id?: string | null;
  detected_at: string;
  published_at?: string | null;
  occurred_at?: string | null;
  expires_at?: string | null;
  retrieved_at?: string;
  confidence: SignalConfidence;
  importance: SignalImportance;
  status?: SignalStatus;
  dedupe_key: string;
  interpretation?: string | null;
  provider?: string | null;
  provider_signal_id?: string | null;
  company_key?: string | null;
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
  /**
   * Controlled external-detection outcome reason, when external detection did
   * not run or failed:
   *   not_configured — no signal-capable provider configured
   *   unsupported    — provider lacks the business_signals capability
   *   rate_limited   — repeated detection throttled to protect the provider
   *   provider_error — provider unavailable/timeout/error
   */
  reason?:
    | "not_configured"
    | "unsupported"
    | "rate_limited"
    | "provider_error";
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
// ============================================================================
// Signal Evidence (Feature 3 — Phase 1)
// ============================================================================
// Normalized evidence associated with a signal. Answers the question
// "Why did Prosventa show me this signal?" Each piece points at a source the
// signal can be traced back to. Store normalized provenance only — never
// enormous raw provider payloads.
// ============================================================================

export type SignalEvidenceType =
  | "provider_record"
  | "article"
  | "event"
  | "identity"
  | "metadata"
  | "other";

export interface SignalEvidenceRecord {
  id: string;
  organization_id: string;
  signal_id: string;
  provider: string;
  evidence_type: SignalEvidenceType;
  source_name: string | null;
  source_url: string | null;
  source_record_id: string | null;
  /** When the evidenced event actually happened (per the source) */
  occurred_at: string | null;
  /** When Prosventa captured this evidence */
  captured_at: string;
  /** Normalized, non-secret provenance subset of the provider payload */
  normalized_data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  dedupe_key: string;
}

export interface SignalEvidenceInsert {
  organization_id: string;
  signal_id: string;
  provider: string;
  evidence_type?: SignalEvidenceType;
  source_name?: string | null;
  source_url?: string | null;
  source_record_id?: string | null;
  occurred_at?: string | null;
  captured_at?: string;
  normalized_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  dedupe_key: string;
}

// ============================================================================
// Signal Query Filters (Feature 3 — Phase 1)
// ============================================================================
// Normalized, server-side filter contract for the signal query service.
// The UI never crafts raw SQL; it supplies these typed filters and the query
// service scopes them to the caller's own organization via RLS.
// ============================================================================

export type SignalQueryFreshness = "fresh" | "aging" | "historical";

export interface SignalQueryFilters {
  prospect_id?: string | null;
  company_key?: string | null;
  signal_type?: SignalType | SignalType[];
  status?: SignalStatus | SignalStatus[];
  /** Date-range filter applied over occurred_at (event date) */
  freshness?: SignalQueryFreshness;
  from?: string | null;
  to?: string | null;
  limit?: number;
  offset?: number;
  order_by?: "occurred_at" | "detected_at" | "created_at";
  order_dir?: "asc" | "desc";
}