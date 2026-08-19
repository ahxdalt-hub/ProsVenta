// ============================================================================
// Prosventa AI Sales Assistant — Types
// Stage 3 — Phase 8: AI-Powered Sales Workspace
// ============================================================================
// Centralized types for the AI Sales Assistant conversation system.
// Provider-agnostic: the heuristic engine can be swapped for an LLM
// provider later without changing the UI contract.
// ============================================================================

// ============================================================================
// Message Roles
// ============================================================================
export type AIMessageRole = "user" | "assistant";

// ============================================================================
// Message Types
// ============================================================================
export type AIMessageType =
  | "text"
  | "summary"
  | "recommendations"
  | "risks"
  | "timeline"
  | "suggestions"
  | "error";

// ============================================================================
// Quick Actions
// ============================================================================
export type AIQuickActionType =
  | "assign"
  | "open_prospect"
  | "schedule_followup"
  | "create_task"
  | "mark_qualified"
  | "send_email"
  | "call"
  | "research";

export interface AIQuickAction {
  id: string;
  type: AIQuickActionType;
  label: string;
  icon?: string;
  prospectId?: string | null;
  disabled?: boolean;
}

// ============================================================================
// Suggestion / Recommendation
// ============================================================================
export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  action?: AIQuickActionType;
  prospectId?: string | null;
}

// ============================================================================
// Risk Detection
// ============================================================================
export interface AIRiskItem {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

// ============================================================================
// Timeline Summary
// ============================================================================
export interface AITimelineSummary {
  text: string;
  events: {
    date: string;
    type: string;
    description: string;
  }[];
}

// ============================================================================
// Prospect Summary
// ============================================================================
export interface AIProspectSummary {
  companyOverview: string;
  industry: string | null;
  leadQuality: string;
  importantNotes: string[];
  recentActivity: string;
  suggestedNextStep: string;
}

// ============================================================================
// Assistant Message
// ============================================================================
export interface AIMessage {
  id: string;
  role: AIMessageRole;
  type: AIMessageType;
  content: string;
  summary?: AIProspectSummary;
  suggestions?: AISuggestion[];
  risks?: AIRiskItem[];
  timeline?: AITimelineSummary;
  actions?: AIQuickAction[];
  timestamp: string;
  prospectId?: string | null;
}

// ============================================================================
// Conversation Context (AI Memory)
// ============================================================================
export interface AIConversationContext {
  messages: AIMessage[];
  lastProspectId: string | null;
  lastProspectName: string | null;
  lastIntent: string | null;
  lastQuery: string | null;
}

// ============================================================================
// Assistant Input
// ============================================================================
export interface AIAssistantInput {
  query: string;
  prospect?: {
    id: string;
    name: string;
    companyName: string;
  } | null;
  prospects?: {
    id: string;
    name: string;
    companyName: string;
    status: string;
    priority: string;
    lastContactedAt: string | null;
    contactEmail: string | null;
    leadScore: number | null;
    aiFitScore: number | null;
    buyingIntent: string;
    createdAt: string;
    updatedAt: string;
  }[];
  notes?: {
    id: string;
    content: string;
    createdAt: string;
  }[];
  context?: AIConversationContext;
}

// ============================================================================
// Assistant Response
// ============================================================================
export interface AIAssistantResponse {
  message: AIMessage;
  context: AIConversationContext;
}

// ============================================================================
// Intent Classification
// ============================================================================
export type AIIntent =
  | "summarize_prospect"
  | "explain_company"
  | "next_steps"
  | "important_info"
  | "follow_up_ideas"
  | "highlight_risks"
  | "timeline_summary"
  | "which_prospect_today"
  | "high_priority"
  | "cold_leads"
  | "not_contacted"
  | "recommendations"
  | "to_do"
  | "greeting"
  | "help"
  | "unknown";

// ============================================================================
// Provider Interface (Future-Ready)
// ============================================================================
export interface AIAssistantProvider {
  id: string;
  name: string;
  respond(input: AIAssistantInput): Promise<AIAssistantResponse> | AIAssistantResponse;
}

// ============================================================================
// Assistant Panel State
// ============================================================================
export interface AIAssistantPanelState {
  isOpen: boolean;
  isMinimized: boolean;
  hasUnread: boolean;
}