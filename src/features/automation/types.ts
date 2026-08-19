// ============================================================================
// Prosventa Workflow Automation Types
// Stage 3 — Phase 9: Intelligent Sales Automation Platform
// ============================================================================

// ============================================================================
// Triggers
// ============================================================================
export type WorkflowTriggerType =
  | "prospect_created"
  | "prospect_updated"
  | "lead_qualified"
  | "lead_lost"
  | "lead_won"
  | "import_finished"
  | "task_completed"
  | "status_changed"
  | "tag_added"
  | "note_added";

export const TRIGGER_LABELS: Record<WorkflowTriggerType, string> = {
  prospect_created: "Prospect Created",
  prospect_updated: "Prospect Updated",
  lead_qualified: "Lead Qualified",
  lead_lost: "Lead Lost",
  lead_won: "Lead Won",
  import_finished: "Import Finished",
  task_completed: "Task Completed",
  status_changed: "Status Changed",
  tag_added: "Tag Added",
  note_added: "Note Added",
};

export const TRIGGER_OPTIONS: WorkflowTriggerType[] = [
  "prospect_created",
  "prospect_updated",
  "lead_qualified",
  "lead_lost",
  "lead_won",
  "import_finished",
  "task_completed",
  "status_changed",
  "tag_added",
  "note_added",
];

// ============================================================================
// Conditions
// ============================================================================
export type ConditionField =
  | "industry"
  | "country"
  | "lead_score"
  | "pipeline_stage"
  | "status"
  | "owner"
  | "tags"
  | "last_activity"
  | "company_size"
  | "priority";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "is_set"
  | "is_not_set";

export const CONDITION_LABELS: Record<ConditionField, string> = {
  industry: "Industry",
  country: "Country",
  lead_score: "Lead Score",
  pipeline_stage: "Pipeline Stage",
  status: "Status",
  owner: "Owner",
  tags: "Tags",
  last_activity: "Last Activity",
  company_size: "Company Size",
  priority: "Priority",
};

export const CONDITION_OPERATORS: ConditionOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "greater_than",
  "less_than",
  "is_set",
  "is_not_set",
];

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: "Equals",
  not_equals: "Not Equals",
  contains: "Contains",
  not_contains: "Does Not Contain",
  greater_than: "Greater Than",
  less_than: "Less Than",
  is_set: "Is Set",
  is_not_set: "Is Not Set",
};

export interface WorkflowCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number | null;
}

// ============================================================================
// Actions
// ============================================================================
export type WorkflowActionType =
  | "assign_prospect"
  | "create_task"
  | "add_tag"
  | "move_pipeline_stage"
  | "send_notification"
  | "create_reminder"
  | "archive_prospect"
  | "mark_high_priority";

export const ACTION_LABELS: Record<WorkflowActionType, string> = {
  assign_prospect: "Assign Prospect",
  create_task: "Create Task",
  add_tag: "Add Tag",
  move_pipeline_stage: "Move Pipeline Stage",
  send_notification: "Send Notification",
  create_reminder: "Create Reminder",
  archive_prospect: "Archive Prospect",
  mark_high_priority: "Mark High Priority",
};

export const ACTION_OPTIONS: WorkflowActionType[] = [
  "assign_prospect",
  "create_task",
  "add_tag",
  "move_pipeline_stage",
  "send_notification",
  "create_reminder",
  "archive_prospect",
  "mark_high_priority",
];

export interface WorkflowAction {
  type: WorkflowActionType;
  config: Record<string, unknown>;
}

// ============================================================================
// Schedule
// ============================================================================
export type ScheduleType = "event" | "daily" | "weekly" | "monthly" | "custom";

export interface ScheduleConfig {
  time?: string;
  day?: number;
  days_of_week?: number[];
  day_of_month?: number;
  interval?: number;
  start_date?: string;
}

// ============================================================================
// Workflow
// ============================================================================
export type WorkflowStatus = "active" | "inactive" | "paused";

export interface WorkflowDefinition {
  trigger_type: WorkflowTriggerType;
  trigger_config: Record<string, unknown>;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  schedule_type: ScheduleType;
  schedule_config: ScheduleConfig;
}

export interface Workflow extends WorkflowDefinition {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  description: string;
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

export type WorkflowInsert = Omit<Workflow, "id" | "created_at" | "updated_at" | "execution_count" | "success_count" | "failure_count" | "avg_duration_ms" | "last_run_at">;

export type WorkflowUpdate = Partial<
  Pick<
    Workflow,
    "name" | "description" | "trigger_type" | "trigger_config" | "conditions" | "actions" | "schedule_type" | "schedule_config" | "is_active" | "is_paused"
  >
>;

// ============================================================================
// Execution History
// ============================================================================
export type ExecutionStatus = "pending" | "running" | "success" | "failed" | "skipped";

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  organization_id: string;
  prospect_id: string | null;
  prospect_name: string | null;
  status: ExecutionStatus;
  error_message: string | null;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  workflow?: Pick<Workflow, "name"> | null;
}

// ============================================================================
// Reminders
// ============================================================================
export type ReminderType =
  | "follow_up_tomorrow"
  | "demo_today"
  | "meeting_30_min"
  | "lead_inactive"
  | "custom";

export const REMINDER_LABELS: Record<ReminderType, string> = {
  follow_up_tomorrow: "Follow-up Tomorrow",
  demo_today: "Demo Today",
  meeting_30_min: "Meeting in 30 Minutes",
  lead_inactive: "Lead Inactive",
  custom: "Custom",
};

export interface Reminder {
  id: string;
  organization_id: string;
  user_id: string;
  prospect_id: string | null;
  workflow_id: string | null;
  title: string;
  body: string | null;
  reminder_type: ReminderType;
  scheduled_for: string;
  is_completed: boolean;
  is_dismissed: boolean;
  created_at: string;
}

// ============================================================================
// Smart Suggestions
// ============================================================================
export type SuggestionType = "assign_owner" | "tag_company" | "move_stage" | "high_priority" | "create_reminder";

export interface AutomationSuggestion {
  id: string;
  organization_id: string;
  suggestion_type: SuggestionType;
  title: string;
  description: string;
  trigger_type: WorkflowTriggerType;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  is_dismissed: boolean;
  is_created: boolean;
  confidence: number;
  created_at: string;
}

// ============================================================================
// Execution Preview
// ============================================================================
export interface ExecutionPreview {
  trigger: string;
  condition: string;
  action: string;
  estimatedResult: string;
  affectedProspects: number;
}

// ============================================================================
// Config / Label Helpers
// ============================================================================
export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  paused: "Paused",
};