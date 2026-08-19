// ============================================================================
// Prosventa Intelligence Command Center — Types
// Stage 4 — Phase 10: Intelligence Command Center
// ============================================================================
// The Command Center is an orchestration layer that brings together existing
// intelligence (scoring, signals, recommendations, workflows) into one view.
// It does NOT duplicate or re-implement any underlying intelligence logic.
// ============================================================================

import type { RecommendationRecord } from "@/features/intelligence/recommendations/types";
import type { IntelligenceExecution } from "@/features/intelligence/workflows/types";

// ============================================================================
// Summary
// ============================================================================
export interface CommandCenterSummary {
  highFitProspects: number;
  recentHighPrioritySignals: number;
  pendingRecommendations: number;
  activeWorkflows: number;
  recentlyChangedProspects: number;
}

// ============================================================================
// Priority Prospect
// ============================================================================
export type PriorityReasonType =
  | "high_fit"
  | "recent_signal"
  | "recommendation_pending"
  | "recently_updated";

export interface PriorityReason {
  type: PriorityReasonType;
  label: string;
}

export interface PriorityProspect {
  prospectId: string;
  name: string;
  companyName: string;
  icpScore: number | null;
  icpCategory: string | null;
  reasons: PriorityReason[];
  latestSignalAt: string | null;
  latestRecommendationAt: string | null;
  updatedAt: string;
}

// ============================================================================
// Intelligence Feed Item
// ============================================================================
export type FeedItemType = "signal" | "recommendation" | "workflow" | "score";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  description: string;
  entityType: "prospect" | "company" | "workspace";
  entityId: string | null;
  entityName: string | null;
  occurredAt: string;
  importance: "critical" | "high" | "medium" | "low";
  confidence: string | null;
  prospectId: string | null;
}

// ============================================================================
// Recommended Action
// ============================================================================
export interface RecommendedAction {
  recommendation: RecommendationRecord;
  prospectName: string | null;
  companyName: string | null;
}

// ============================================================================
// Workflow Activity
// ============================================================================
export interface WorkflowActivity {
  execution: IntelligenceExecution;
  workflowName: string | null;
}

// ============================================================================
// Intelligence Health
// ============================================================================
export interface IntelligenceHealth {
  staleEnrichment: number;
  missingJobTitles: number;
  missingIndustry: number;
  lowConfidenceIntelligence: number;
}

// ============================================================================
// Command Center Data Bundle
// ============================================================================
export interface CommandCenterData {
  summary: CommandCenterSummary;
  priorityProspects: PriorityProspect[];
  feed: FeedItem[];
  recommendedActions: RecommendedAction[];
  workflowActivity: WorkflowActivity[];
  health: IntelligenceHealth;
}

// ============================================================================
// Filter
// ============================================================================
export type CommandCenterFilter =
  | "all"
  | "high_priority"
  | "recent_signals"
  | "high_fit"
  | "recommendations"
  | "needs_review";

// ============================================================================
// Section Status (for independent loading/error states)
// ============================================================================
export type SectionStatus = "loading" | "success" | "error";