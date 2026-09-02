// ============================================================================
// Prosventa Intelligence — Minimized Action Window System (Phase 2)
// Shared types for the ONE reusable intelligence action window.
// ============================================================================
// Consumers (IntelligenceActions, signal/priority triggers) funnel every
// action through a single `openIntelligenceAction({ type, context })` entry
// point. There is exactly ONE window system — never per-action modals.
// ============================================================================

/** Every intelligence action the workspace can launch from this window. */
export type IntelligenceActionKind =
  | "research_prospect"
  | "research_company"
  | "enrich_prospect"
  | "enrich_company"
  | "review_signal";

/**
 * A selectable research/enrichment target. Both research and enrichment
 * operate against a prospect (and its company/domain), so the unified
 * selector returns prospect-backed targets for every transactional action.
 */
export interface IntelligenceTarget {
  id: string;
  /** Primary display name (company_name, else name). */
  name: string;
  /** Secondary line (contact, industry, location). */
  sub: string;
  /** Website / company domain when known (used by company enrichment). */
  domain: string;
  /** Prospect contact name (used in review/labels). */
  contact: string | null;
}

/** Optional context passed along with an action (target already known). */
export interface IntelligenceActionContext {
  /** Prospect/company acting target. */
  targetId?: string;
  /** Signal id for review_signal. */
  signalId?: string;
  /**
   * Preselected target presentation (Phase 4). When the action is launched
   * from a specific record, the window can start with that target already
   * selected — the user can still clear or change it in the selector.
   */
  targetName?: string;
  targetSub?: string;
  targetDomain?: string;
  targetContact?: string | null;
}

export interface IntelligenceActionRequest {
  type: IntelligenceActionKind;
  context?: IntelligenceActionContext;
}

/**
 * Window state machine. Mirrors the Phase 2 brief:
 *   Idle → Preparing → Ready → Running → Success → Complete
 *   Running → Error (and → Insufficient).
 * `complete` is terminal (window closes back into the refreshed workspace).
 */
export type IntelligenceWindowPhase =
  | "preparing"
  | "ready"
  | "running"
  | "success"
  | "error"
  | "insufficient"
  | "complete";

/** Rich detail model for a reviewable signal (real database record only). */
export interface IntelligenceReviewSignal {
  id: string;
  subject: string | null;
  typeLabel: string;
  title: string;
  description: string;
  interpretation: string | null;
  importanceLabel: string;
  confidenceLabel: string;
  detectedAt: string;
  originExternal: boolean;
}

/** Serialized billing result surfaced by existing server actions. */
export interface BillingInfoLike {
  code: string;
  message: string;
  balance: number | null;
  required: number | null;
}