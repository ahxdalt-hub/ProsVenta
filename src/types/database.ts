// ============================================================================
// Prosventa Database Types
// Stage 2 — Phase 3: Database Foundation & User Data Architecture
// ============================================================================
// These types represent the Supabase database schema for core user data.
// Generated from the SQL migration: supabase/migrations/20260731_00001_create_profiles.sql
// ============================================================================

// ============================================================================
// Profiles
// ============================================================================
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  company_size: string | null;
  industry: string | null;
  job_role: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  company_name?: string | null;
  company_size?: string | null;
  industry?: string | null;
  job_role?: string | null;
  onboarding_completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  full_name?: string | null;
  avatar_url?: string | null;
  company_name?: string | null;
  company_size?: string | null;
  industry?: string | null;
  job_role?: string | null;
  onboarding_completed?: boolean;
  updated_at?: string;
}

// ============================================================================
// User Settings
// ============================================================================
export interface UserSettings {
  id: string;
  user_id: string;
  theme: string;
  timezone: string;
  // Notification preferences
  notifications_product_updates: boolean;
  notifications_workspace: boolean;
  notifications_security_alerts: boolean;
  notifications_email_digest: boolean;
  notifications_marketing: boolean;
  // Appearance preferences
  compact_mode: boolean;
  accent_color: string;
  reduced_motion: boolean;
  // Accessibility preferences
  high_contrast: boolean;
  large_text: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsInsert {
  id?: string;
  user_id: string;
  theme?: string;
  timezone?: string;
  notifications_product_updates?: boolean;
  notifications_workspace?: boolean;
  notifications_security_alerts?: boolean;
  notifications_email_digest?: boolean;
  notifications_marketing?: boolean;
  compact_mode?: boolean;
  accent_color?: string;
  reduced_motion?: boolean;
  high_contrast?: boolean;
  large_text?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserSettingsUpdate {
  theme?: string;
  timezone?: string;
  notifications_product_updates?: boolean;
  notifications_workspace?: boolean;
  notifications_security_alerts?: boolean;
  notifications_email_digest?: boolean;
  notifications_marketing?: boolean;
  compact_mode?: boolean;
  accent_color?: string;
  reduced_motion?: boolean;
  high_contrast?: boolean;
  large_text?: boolean;
  updated_at?: string;
}

// ============================================================================
// Organizations
// ============================================================================
export type OrganizationRole = "owner" | "admin" | "manager" | "sales" | "viewer";
export type MemberStatus = "active" | "invited" | "suspended";
export type SubscriptionPlan = "free" | "pro" | "business" | "enterprise";

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  website: string | null;
  industry: string | null;
  country: string | null;
  description: string | null;
  logo_url: string | null;
  timezone: string;
  default_currency: string;
  brand_color: string | null;
  subscription_plan: SubscriptionPlan;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInsert {
  id?: string;
  name: string;
  owner_id: string;
  website?: string | null;
  industry?: string | null;
  country?: string | null;
  description?: string | null;
  logo_url?: string | null;
  timezone?: string;
  default_currency?: string;
  brand_color?: string | null;
  subscription_plan?: SubscriptionPlan;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationUpdate {
  name?: string;
  website?: string | null;
  industry?: string | null;
  country?: string | null;
  description?: string | null;
  logo_url?: string | null;
  timezone?: string;
  default_currency?: string;
  brand_color?: string | null;
  subscription_plan?: SubscriptionPlan;
  updated_at?: string;
}

// ============================================================================
// Organization Members
// ============================================================================
export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  status: MemberStatus;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Prospect Comments
// ============================================================================
export interface ProspectComment {
  id: string;
  prospect_id: string;
  organization_id: string;
  author_id: string;
  content: string;
  parent_id: string | null;
  mentions: string[];
  created_at: string;
  updated_at: string;
}

export interface ProspectCommentInsert {
  prospect_id: string;
  organization_id: string;
  author_id: string;
  content: string;
  parent_id?: string | null;
  mentions?: string[];
}

// ============================================================================
// Activity Events
// ============================================================================
export type ActivityAction =
  | "prospect_created"
  | "prospect_updated"
  | "prospect_status_changed"
  | "prospect_assigned"
  | "prospect_owner_changed"
  | "prospect_deleted"
  | "note_added"
  | "comment_added"
  | "comment_replied"
  | "member_invited"
  | "member_joined"
  | "member_removed"
  | "member_role_changed"
  | "import_completed"
  | "export_completed"
  | "view_shared"
  | "list_created"
  | "list_updated";

export interface ActivityEvent {
  id: string;
  organization_id: string;
  actor_id: string;
  action: ActivityAction;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActivityEventInsert {
  organization_id: string;
  actor_id: string;
  action: ActivityAction;
  entity_type: string;
  entity_id?: string | null;
  entity_name?: string | null;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Notifications
// ============================================================================
export type NotificationType =
  | "prospect_assigned"
  | "prospect_mentioned"
  | "prospect_updated"
  | "comment_reply"
  | "import_completed"
  | "export_completed"
  | "member_joined"
  | "system_alert"
  | "signal_detected";

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationInsert {
  user_id: string;
  organization_id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  actor_id?: string | null;
  is_read?: boolean;
}

// ============================================================================
// Organization Invitations
// ============================================================================
export type InvitationStatus = "pending" | "accepted" | "declined" | "revoked";

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  invited_by: string;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInvitationInsert {
  organization_id: string;
  email: string;
  role: OrganizationRole;
  invited_by: string;
  token: string;
  status?: InvitationStatus;
  expires_at: string;
}

// ============================================================================
// Prospects
// ============================================================================
export type ProspectStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "lost";
export type ProspectPriority = "low" | "medium" | "high" | "urgent";
export type EnrichmentStatus = "pending" | "processing" | "completed" | "failed";
export type ProspectSource = "manual" | "import" | "discovery" | "api";
export type BuyingIntent = "low" | "medium" | "high";

export interface Prospect {
  id: string;
  organization_id: string;
  name: string;
  company_name: string;
  website: string | null;
  domain: string | null;
  industry: string | null;
  description: string | null;
  country: string | null;
  city: string | null;
  location: string | null;
  employee_count: number | null;
  source: ProspectSource;
  status: ProspectStatus;
  enrichment_status: EnrichmentStatus;
  tags: string[];
  priority: ProspectPriority;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  last_contacted_at: string | null;
  is_favorite: boolean;
  lead_score: number | null;
  ai_fit_score: number | null;
  buying_intent: BuyingIntent;
  revenue: number | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectInsert {
  organization_id: string;
  name: string;
  company_name?: string;
  website?: string | null;
  domain?: string | null;
  industry?: string | null;
  description?: string | null;
  country?: string | null;
  city?: string | null;
  location?: string | null;
  employee_count?: number | null;
  source?: ProspectSource;
  status?: ProspectStatus;
  enrichment_status?: EnrichmentStatus;
  tags?: string[];
  priority?: ProspectPriority;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  last_contacted_at?: string | null;
  is_favorite?: boolean;
  lead_score?: number | null;
  ai_fit_score?: number | null;
  buying_intent?: BuyingIntent;
  revenue?: number | null;
  owner_id?: string | null;
}

export interface ProspectUpdate {
  name?: string;
  company_name?: string;
  website?: string | null;
  domain?: string | null;
  industry?: string | null;
  description?: string | null;
  country?: string | null;
  city?: string | null;
  location?: string | null;
  employee_count?: number | null;
  source?: ProspectSource;
  status?: ProspectStatus;
  enrichment_status?: EnrichmentStatus;
  tags?: string[];
  priority?: ProspectPriority;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  last_contacted_at?: string | null;
  is_favorite?: boolean;
  lead_score?: number | null;
  ai_fit_score?: number | null;
  buying_intent?: BuyingIntent;
  revenue?: number | null;
  owner_id?: string | null;
  updated_at?: string;
}

// ============================================================================
// Prospect Notes
// ============================================================================
export interface ProspectNote {
  id: string;
  prospect_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface ProspectNoteInsert {
  prospect_id: string;
  user_id: string;
  content: string;
}

// ============================================================================
// Saved Lists
// ============================================================================
export interface SavedList {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedListInsert {
  organization_id: string;
  name: string;
  description?: string | null;
}

export interface SavedListUpdate {
  name?: string;
  description?: string | null;
  updated_at?: string;
}

// ============================================================================
// Saved List Items
// ============================================================================
export interface SavedListItem {
  id: string;
  list_id: string;
  prospect_id: string;
  created_at: string;
}

export interface SavedListItemInsert {
  list_id: string;
  prospect_id: string;
}

// ============================================================================
// Prospect Searches
// ============================================================================
export type ProspectSearchStatus = "pending" | "processing" | "completed" | "failed";

export interface ProspectSearch {
  id: string;
  organization_id: string;
  created_by: string;
  industry: string | null;
  location: string | null;
  company_size: string | null;
  keywords: string | null;
  status: ProspectSearchStatus;
  created_at: string;
}

export interface ProspectSearchInsert {
  organization_id: string;
  created_by: string;
  industry?: string | null;
  location?: string | null;
  company_size?: string | null;
  keywords?: string | null;
  status?: ProspectSearchStatus;
}

export interface ProspectSearchUpdate {
  industry?: string | null;
  location?: string | null;
  company_size?: string | null;
  keywords?: string | null;
  status?: ProspectSearchStatus;
}

// ============================================================================
// Saved Views
// ============================================================================
export type SavedViewType = "personal" | "shared" | "team" | "organization";

export interface SavedView {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  description: string | null;
  view_type: SavedViewType;
  filters: Record<string, unknown>;
  sort_field: string | null;
  sort_order: "asc" | "desc" | null;
  search: string | null;
  quick_filter: string | null;
  favorites_only: boolean;
  is_pinned: boolean;
  icon: string | null;
  color: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SavedViewInsert {
  organization_id: string;
  created_by: string;
  name: string;
  description?: string | null;
  view_type?: SavedViewType;
  filters?: Record<string, unknown>;
  sort_field?: string | null;
  sort_order?: "asc" | "desc" | null;
  search?: string | null;
  quick_filter?: string | null;
  favorites_only?: boolean;
  is_pinned?: boolean;
  icon?: string | null;
  color?: string | null;
  display_order?: number;
}

export interface SavedViewUpdate {
  name?: string;
  description?: string | null;
  view_type?: SavedViewType;
  filters?: Record<string, unknown>;
  sort_field?: string | null;
  sort_order?: "asc" | "desc" | null;
  search?: string | null;
  quick_filter?: string | null;
  favorites_only?: boolean;
  is_pinned?: boolean;
  icon?: string | null;
  color?: string | null;
  display_order?: number;
}

// ============================================================================
// Workflow Automation
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

export type WorkflowScheduleType = "event" | "daily" | "weekly" | "monthly" | "custom";

export interface WorkflowRow {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  description: string;
  trigger_type: WorkflowTriggerType;
  trigger_config: Record<string, unknown>;
  conditions: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  schedule_type: WorkflowScheduleType;
  schedule_config: Record<string, unknown>;
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

export type WorkflowExecutionStatus = "pending" | "running" | "success" | "failed" | "skipped";

export interface WorkflowExecutionRow {
  id: string;
  workflow_id: string;
  organization_id: string;
  prospect_id: string | null;
  prospect_name: string | null;
  status: WorkflowExecutionStatus;
  error_message: string | null;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ReminderType =
  | "follow_up_tomorrow"
  | "demo_today"
  | "meeting_30_min"
  | "lead_inactive"
  | "custom";

export interface ReminderRow {
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

export type SuggestionType = "assign_owner" | "tag_company" | "move_stage" | "high_priority" | "create_reminder";

export interface AutomationSuggestionRow {
  id: string;
  organization_id: string;
  suggestion_type: SuggestionType;
  title: string;
  description: string;
  trigger_type: WorkflowTriggerType;
  conditions: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  is_dismissed: boolean;
  is_created: boolean;
  confidence: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Database Schema Helper
// ============================================================================
// Provides a typed interface for all database tables.
// Useful for future Supabase type generation integration.
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      user_settings: {
        Row: UserSettings;
        Insert: UserSettingsInsert;
        Update: UserSettingsUpdate;
      };
      organizations: {
        Row: Organization;
        Insert: OrganizationInsert;
        Update: OrganizationUpdate;
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: { organization_id: string; user_id: string; role?: string };
        Update: { role?: string };
      };
      prospects: {
        Row: Prospect;
        Insert: ProspectInsert;
        Update: ProspectUpdate;
      };
      prospect_notes: {
        Row: ProspectNote;
        Insert: ProspectNoteInsert;
        Update: { content?: string };
      };
      saved_lists: {
        Row: SavedList;
        Insert: SavedListInsert;
        Update: SavedListUpdate;
      };
      saved_list_items: {
        Row: SavedListItem;
        Insert: SavedListItemInsert;
        Update: Record<string, never>;
      };
      prospect_searches: {
        Row: ProspectSearch;
        Insert: ProspectSearchInsert;
        Update: ProspectSearchUpdate;
      };
      saved_views: {
        Row: SavedView;
        Insert: SavedViewInsert;
        Update: SavedViewUpdate;
      };
      prospect_comments: {
        Row: ProspectComment;
        Insert: ProspectCommentInsert;
        Update: { content?: string; mentions?: string[] };
      };
      activity_events: {
        Row: ActivityEvent;
        Insert: ActivityEventInsert;
        Update: Record<string, never>;
      };
      notifications: {
        Row: Notification;
        Insert: NotificationInsert;
        Update: { is_read?: boolean };
      };
      organization_invitations: {
        Row: OrganizationInvitation;
        Insert: OrganizationInvitationInsert;
        Update: { status?: InvitationStatus; role?: OrganizationRole };
      };
      workflows: {
        Row: WorkflowRow;
        Insert: Partial<WorkflowRow>;
        Update: Partial<WorkflowRow>;
      };
      workflow_executions: {
        Row: WorkflowExecutionRow;
        Insert: Partial<WorkflowExecutionRow>;
        Update: Partial<WorkflowExecutionRow>;
      };
      reminders: {
        Row: ReminderRow;
        Insert: Partial<ReminderRow>;
        Update: Partial<ReminderRow>;
      };
      automation_suggestions: {
        Row: AutomationSuggestionRow;
        Insert: Partial<AutomationSuggestionRow>;
        Update: Partial<AutomationSuggestionRow>;
      };
    };
    Functions: {
      handle_new_user: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      update_updated_at_column: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
  };
}

// ============================================================================
// Theme Type Helper
// ============================================================================
export type ThemeOption = 'system' | 'light' | 'dark';

// ============================================================================
// Timezone Type Helper
// ============================================================================
export type TimezoneOption = string;