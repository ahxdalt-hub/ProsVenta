// ============================================================================
// Prosventa Playbook Engine — Types & Step Catalog
// Stage 7 — Phase 3
// ============================================================================
// A Playbook is a reusable, customer-facing business process layered on top of
// the EXISTING workflow infrastructure (Phase 1 actions/conditions/execution +
// Phase 2 triggers/events). This module introduces NO new execution mechanism.
//
//   Playbook → Workflow → Trigger / Condition → Actions → Execution → Outcome
// ============================================================================

import type {
  IntelligenceActionType,
  IntelligenceCondition,
} from "@/features/intelligence/workflows/types";

// ============================================================================
// Status
// ============================================================================
export type PlaybookStatus = "draft" | "active" | "paused" | "archived";

export const PLAYBOOK_STATUS_LABELS: Record<PlaybookStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

/** Manual + automatic execution is only possible while Active. */
export function playbookCanExecute(status: PlaybookStatus): boolean {
  return status === "active";
}

/** Draft can be edited freely; Archived is read-only (history preserved). */
export function playbookCanEdit(status: PlaybookStatus): boolean {
  return status !== "archived";
}

// ============================================================================
// Categories — controlled; every category maps to real, live capability
// ============================================================================
export type PlaybookCategory =
  | "prospect_research"
  | "high_intent"
  | "icp_qualification"
  | "new_prospect"
  | "signal_response"
  | "follow_up_preparation";

export const PLAYBOOK_CATEGORY_LABELS: Record<PlaybookCategory, string> = {
  prospect_research: "Prospect Research",
  high_intent: "High Intent",
  icp_qualification: "ICP Qualification",
  new_prospect: "New Prospect",
  signal_response: "Signal Response",
  follow_up_preparation: "Follow-up Preparation",
};

export const PLAYBOOK_CATEGORY_OPTIONS: PlaybookCategory[] = [
  "new_prospect",
  "high_intent",
  "signal_response",
  "icp_qualification",
  "prospect_research",
  "follow_up_preparation",
];

// ============================================================================
// Records
// ============================================================================
export interface PlaybookRecord {
  id: string;
  organization_id: string;
  workflow_id: string;
  name: string;
  description: string;
  category: PlaybookCategory;
  status: PlaybookStatus;
  version: number;
  icon: string | null;
  is_starter: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaybookStepRecord {
  id: string;
  playbook_id: string;
  organization_id: string;
  position: number;
  action_type: IntelligenceActionType;
  title: string;
  description: string;
  config: Record<string, unknown>;
  condition: IntelligenceCondition | null;
  requires_approval: boolean;
  enabled: boolean;
  provider_backed: boolean;
}

/** Playbook joined with its underlying workflow's run statistics. */
export interface PlaybookWithStats extends PlaybookRecord {
  step_count: number;
  execution_count: number;
  failure_count: number;
  last_run_at: string | null;
}

// ============================================================================
// Step catalog — ONLY currently-supported Phase 1 safe internal actions.
// Human-readable titles/descriptions are primary UI; raw action IDs never are.
// `providerBacked` marks future credit-metering candidates (no Credits yet).
// ============================================================================

export interface StepActionDefinition {
  type: IntelligenceActionType;
  label: string;
  /** Accurate description of what the action actually does. */
  description: string;
  providerBacked: boolean;
  /** Config fields surfaced in the builder for this action. */
  configFields: Array<{
    key: string;
    label: string;
    kind: "text" | "textarea" | "select";
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    required?: boolean;
  }>;
}

export const STEP_ACTION_CATALOG: Record<string, StepActionDefinition> = {
  create_task: {
    type: "create_task",
    label: "Create task",
    description:
      "Creates a follow-up task so someone on your team reviews this prospect.",
    providerBacked: false,
    configFields: [
      { key: "title", label: "Task title", kind: "text", placeholder: "Review prospect" },
      { key: "description", label: "Task description", kind: "textarea" },
      {
        key: "priority",
        label: "Priority",
        kind: "select",
        options: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ],
      },
    ],
  },
  create_notification: {
    type: "create_notification",
    label: "Notify the team",
    description: "Sends an in-app notification to you about this prospect.",
    providerBacked: false,
    configFields: [
      { key: "title", label: "Notification title", kind: "text" },
      { key: "body", label: "Notification body", kind: "textarea" },
    ],
  },
};

export const STEP_ACTION_CATALOG_PART2: Record<string, StepActionDefinition> = {
  create_internal_note: {
    type: "create_internal_note",
    label: "Add internal note",
    description:
      "Records an internal note on the prospect's timeline for context.",
    providerBacked: false,
    configFields: [
      { key: "note", label: "Note", kind: "textarea", placeholder: "Why this prospect matters…" },
    ],
  },
  add_to_saved_list: {
    type: "add_to_saved_list",
    label: "Add to saved list",
    description:
      "Adds the prospect to one of your saved lists (a list must be selected).",
    providerBacked: false,
    configFields: [{ key: "list_id", label: "Saved list ID", kind: "text", required: true }],
  },
  update_prospect_status: {
    type: "update_prospect_status",
    label: "Update prospect status",
    description:
      "Changes the prospect's pipeline status (for example to Qualified).",
    providerBacked: false,
    configFields: [
      {
        key: "status",
        label: "New status",
        kind: "select",
        options: [
          { value: "new", label: "New" },
          { value: "contacted", label: "Contacted" },
          { value: "qualified", label: "Qualified" },
          { value: "customer", label: "Customer" },
        ],
      },
    ],
  },
  mark_recommendation_reviewed: {
    type: "mark_recommendation_reviewed",
    label: "Mark recommendation reviewed",
    description:
      "Marks the related recommendation as reviewed so it stops appearing as new.",
    providerBacked: false,
    configFields: [],
  },
};

Object.assign(STEP_ACTION_CATALOG, STEP_ACTION_CATALOG_PART2);

/** Action types users may add as steps (stable order for the "+ Add step" menu). */
export const STEP_ACTION_OPTIONS: StepActionDefinition[] = [
  STEP_ACTION_CATALOG.create_task,
  STEP_ACTION_CATALOG.create_notification,
  STEP_ACTION_CATALOG.create_internal_note,
  STEP_ACTION_CATALOG.add_to_saved_list,
  STEP_ACTION_CATALOG.update_prospect_status,
  STEP_ACTION_CATALOG.mark_recommendation_reviewed,
];

// ============================================================================
// Builder input shapes
// ============================================================================
export interface PlaybookStepInput {
  position?: number;
  action_type: IntelligenceActionType;
  title?: string;
  description?: string;
  config?: Record<string, unknown>;
  condition?: IntelligenceCondition | null;
  requires_approval?: boolean;
  enabled?: boolean;
}

export interface PlaybookDefinitionInput {
  name: string;
  description: string;
  category: PlaybookCategory;
  icon?: string | null;
  trigger_type: string; // registered event ID or supported intelligence trigger
  conditions: IntelligenceCondition[];
  steps: PlaybookStepInput[];
}

// ============================================================================
// Validation / preview / recommendation result shapes
// ============================================================================
export interface PlaybookValidationResult {
  valid: boolean;
  problems: string[];
}

export interface PlaybookPreviewStep {
  title: string;
  description: string;
  providerBacked: boolean;
  conditionText: string | null;
}

export interface PlaybookPreview {
  name: string;
  description: string;
  triggerLabel: string;
  conditionText: string;
  steps: PlaybookPreviewStep[];
}

export interface PlaybookRecommendation {
  playbookId: string | null;
  playbookName: string | null;
  reason: string | null;
}

export type { IntelligenceCondition };


