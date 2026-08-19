// ============================================================================
// Prosventa Intelligence-Powered Workflows — Types
// Stage 4 — Phase 9: Intelligence-Powered Workflows
// ============================================================================
// Extends the existing automation engine (Stage 3) with intelligence-driven
// workflow capabilities. This does NOT create a second automation engine.
//
// IMPORTANT:
//   - New workflows default to 'draft' — the user must explicitly activate them.
//   - All actions are internal to Prosventa (no external communication).
//   - Idempotency is enforced via (workflow_id, trigger_event_id) uniqueness.
//   - Approval gates are required for potentially consequential actions.
// ============================================================================

// ============================================================================
// Intelligence Trigger Types
// ============================================================================
export type IntelligenceTriggerType =
  | "high_icp_score"
  | "score_threshold_crossed"
  | "high_priority_signal"
  | "new_company_signal"
  | "prospect_role_changed"
  | "company_research_updated"
  | "prospect_research_updated"
  | "recommendation_created"
  | "recommendation_priority_high";

export const INTELLIGENCE_TRIGGER_LABELS: Record<IntelligenceTriggerType, string> = {
  high_icp_score: "High ICP Score Detected",
  score_threshold_crossed: "Score Crosses Threshold",
  high_priority_signal: "High-Priority Signal Detected",
  new_company_signal: "New Company Signal Detected",
  prospect_role_changed: "Prospect Role Changed",
  company_research_updated: "Company Research Updated",
  prospect_research_updated: "Prospect Research Updated",
  recommendation_created: "Recommendation Created",
  recommendation_priority_high: "Recommendation Priority Becomes High",
};

export const INTELLIGENCE_TRIGGER_OPTIONS: IntelligenceTriggerType[] = [
  "high_icp_score",
  "score_threshold_crossed",
  "high_priority_signal",
  "new_company_signal",
  "prospect_role_changed",
  "company_research_updated",
  "prospect_research_updated",
  "recommendation_created",
  "recommendation_priority_high",
];

// ============================================================================
// Intelligence Condition Fields
// ============================================================================
export type IntelligenceConditionField =
  | "icp_score"
  | "signal_importance"
  | "signal_confidence"
  | "prospect_seniority"
  | "company_industry"
  | "recommendation_priority"
  | "recommendation_type";

export const INTELLIGENCE_CONDITION_LABELS: Record<IntelligenceConditionField, string> = {
  icp_score: "ICP Score",
  signal_importance: "Signal Importance",
  signal_confidence: "Signal Confidence",
  prospect_seniority: "Prospect Seniority",
  company_industry: "Company Industry",
  recommendation_priority: "Recommendation Priority",
  recommendation_type: "Recommendation Type",
};

// ============================================================================
// Intelligence Action Types (SAFE — internal to Prosventa)
// ============================================================================
export type IntelligenceActionType =
  | "create_notification"
  | "create_task"
  | "add_to_saved_list"
  | "update_prospect_status"
  | "create_internal_note"
  | "mark_recommendation_reviewed"
  | "create_workflow_activity";

export const INTELLIGENCE_ACTION_LABELS: Record<IntelligenceActionType, string> = {
  create_notification: "Create Notification",
  create_task: "Create Task",
  add_to_saved_list: "Add to Saved List",
  update_prospect_status: "Update Prospect Status",
  create_internal_note: "Create Internal Note",
  mark_recommendation_reviewed: "Mark Recommendation Reviewed",
  create_workflow_activity: "Create Workflow Activity",
};

export const INTELLIGENCE_ACTION_OPTIONS: IntelligenceActionType[] = [
  "create_notification",
  "create_task",
  "add_to_saved_list",
  "update_prospect_status",
  "create_internal_note",
  "mark_recommendation_reviewed",
  "create_workflow_activity",
];

// ============================================================================
// Workflow Status
// ============================================================================
export type WorkflowStatus = "draft" | "active" | "paused" | "archived";

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

// ============================================================================
// Execution Status (extended)
// ============================================================================
export type IntelligenceExecutionStatus =
  | "pending"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "cancelled"
  | "skipped";

export const INTELLIGENCE_EXECUTION_STATUS_LABELS: Record<IntelligenceExecutionStatus, string> = {
  pending: "Pending",
  running: "Running",
  waiting_approval: "Waiting Approval",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  skipped: "Skipped",
};

// ============================================================================
// Action Execution Status
// ============================================================================
export type ActionExecutionStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "cancelled";

// ============================================================================
// Trigger Event (the intelligence event that fires a workflow)
// ============================================================================
export interface IntelligenceTriggerEvent {
  /** Stable event identifier for idempotency (e.g. signal ID, recommendation ID, score ID) */
  eventId: string;
  /** The trigger type that fired */
  triggerType: IntelligenceTriggerType;
  /** Workspace / organization ID */
  organizationId: string;
  /** Related prospect ID (when applicable) */
  prospectId: string | null;
  /** Related prospect name (for display) */
  prospectName: string | null;
  /** Related recommendation ID (when applicable) */
  recommendationId: string | null;
  /** Related signal ID (when applicable) */
  signalId: string | null;
  /** Related score ID (when applicable) */
  scoreId: string | null;
  /** Structured context payload for condition evaluation */
  context: Record<string, unknown>;
  /** When the event occurred */
  occurredAt: string;
}

// ============================================================================
// Intelligence Condition
// ============================================================================
export interface IntelligenceCondition {
  field: IntelligenceConditionField;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "is_set" | "is_not_set";
  value: string | number | null;
}

// ============================================================================
// Intelligence Action
// ============================================================================
export interface IntelligenceAction {
  type: IntelligenceActionType;
  config: Record<string, unknown>;
}

// ============================================================================
// Workflow Definition (intelligence extension)
// ============================================================================
export interface IntelligenceWorkflowDefinition {
  trigger_type: IntelligenceTriggerType;
  trigger_config: Record<string, unknown>;
  conditions: IntelligenceCondition[];
  actions: IntelligenceAction[];
  requires_approval: boolean;
  max_executions_per_event: number;
}

// ============================================================================
// Workflow Record (extended)
// ============================================================================
export interface IntelligenceWorkflow extends IntelligenceWorkflowDefinition {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  is_active: boolean;
  is_paused: boolean;
  execution_count: number;
  success_count: number;
  failure_count: number;
  avg_duration_ms: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Execution Record (extended)
// ============================================================================
export interface IntelligenceExecution {
  id: string;
  workflow_id: string;
  organization_id: string;
  prospect_id: string | null;
  prospect_name: string | null;
  status: IntelligenceExecutionStatus;
  error_message: string | null;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
  trigger_event_id: string | null;
  execution_context: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  workflow?: Pick<IntelligenceWorkflow, "name"> | null;
}

// ============================================================================
// Action Execution Record
// ============================================================================
export interface ActionExecutionRecord {
  id: string;
  execution_id: string;
  organization_id: string;
  action_type: string;
  status: ActionExecutionStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error: string | null;
  executed_at: string | null;
  created_at: string;
}

// ============================================================================
// Task Record (minimal internal task system)
// ============================================================================
export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskRecord {
  id: string;
  organization_id: string;
  prospect_id: string | null;
  workflow_id: string | null;
  execution_id: string | null;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskInsert {
  organization_id: string;
  prospect_id?: string | null;
  workflow_id?: string | null;
  execution_id?: string | null;
  created_by: string;
  assigned_to?: string | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
}

// ============================================================================
// Approval Record
// ============================================================================
export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface ApprovalRecord {
  id: string;
  execution_id: string;
  organization_id: string;
  workflow_id: string;
  action_index: number;
  action_type: string;
  status: ApprovalStatus;
  requested_by: string | null;
  decided_by: string | null;
  preview: Record<string, unknown>;
  decided_at: string | null;
  created_at: string;
}

// ============================================================================
// Action Preview (shown to user before approval)
// ============================================================================
export interface ActionPreview {
  actionType: IntelligenceActionType;
  title: string;
  description: string;
  details: Record<string, string>;
}

// ============================================================================
// Execution Plan (generated before execution)
// ============================================================================
export interface ExecutionPlan {
  workflowId: string;
  workflowName: string;
  triggerEvent: IntelligenceTriggerEvent;
  conditionsMet: boolean;
  actions: Array<{
    index: number;
    type: IntelligenceActionType;
    preview: ActionPreview;
    requiresApproval: boolean;
  }>;
}

// ============================================================================
// Execution Result
// ============================================================================
export interface ExecutionResult {
  executionId: string;
  status: IntelligenceExecutionStatus;
  message: string;
  actionsExecuted: number;
  actionsFailed: number;
  error?: string;
}

// ============================================================================
// Operation Result (server → UI)
// ============================================================================
export interface WorkflowOperationResult {
  status: "completed" | "failed";
  message: string;
  workflowId?: string;
  executionId?: string;
}