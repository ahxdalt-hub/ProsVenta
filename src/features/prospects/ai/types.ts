// ============================================================================
// Prosventa AI Prospect Intelligence Types
// Stage 3 — Phase 2: AI-Powered Prospect Intelligence Platform
// ============================================================================
// Centralized types for AI-generated prospect insights.
// Designed to be provider-agnostic so future AI engines (LLM APIs,
// enrichment providers, or internal models) can plug into this contract.
// ============================================================================

// ============================================================================
// Confidence
// ============================================================================
export type ConfidenceLevel = "high" | "medium" | "low";

export interface AIConfidence {
  /** 0–100 reliability score */
  score: number;
  level: ConfidenceLevel;
  label: string;
}

// ============================================================================
// Company Summary
// ============================================================================
export interface AICompanySummary {
  text: string;
  confidence: AIConfidence;
}

// ============================================================================
// Company Information
// ============================================================================
export interface AICompanyInfo {
  industry: string | null;
  companySize: string | null;
  estimatedEmployees: string | null;
  estimatedRevenue: string | null;
  headquarters: string | null;
  foundedYear: number | null;
  website: string | null;
  linkedin: string | null;
  confidence: AIConfidence;
}

// ============================================================================
// Scores (Fit & Lead)
// ============================================================================
export interface AIScore {
  /** 0–100 value */
  value: number;
  label: string;
  explanation: string;
  confidence: AIConfidence;
}

// ============================================================================
// Buying Intent
// ============================================================================
export type BuyingIntentLevel = "very_high" | "high" | "medium" | "low";

export interface AIBuyingIntent {
  level: BuyingIntentLevel;
  label: string;
  explanation: string;
  confidence: AIConfidence;
}

// ============================================================================
// Next Best Action
// ============================================================================
export type RecommendationAction =
  | "send_intro_email"
  | "connect_linkedin"
  | "schedule_demo"
  | "follow_up"
  | "research_decision_maker";

export type RecommendationPriority = "high" | "medium" | "low";

export interface AIRecommendation {
  id: string;
  action: RecommendationAction;
  title: string;
  description: string;
  priority: RecommendationPriority;
  confidence: AIConfidence;
}

// ============================================================================
// Risk Analysis
// ============================================================================
export type RiskSeverity = "high" | "medium" | "low";

export interface AIRisk {
  id: string;
  title: string;
  description: string;
  severity: RiskSeverity;
  confidence: AIConfidence;
}

// ============================================================================
// Opportunity Highlights
// ============================================================================
export type OpportunityImpact = "high" | "medium" | "low";

export interface AIOpportunity {
  id: string;
  title: string;
  description: string;
  impact: OpportunityImpact;
  confidence: AIConfidence;
}

// ============================================================================
// Full Intelligence Bundle
// ============================================================================
export interface AIProspectIntelligence {
  summary: AICompanySummary;
  companyInfo: AICompanyInfo;
  fitScore: AIScore;
  leadScore: AIScore;
  buyingIntent: AIBuyingIntent;
  recommendations: AIRecommendation[];
  risks: AIRisk[];
  opportunities: AIOpportunity[];
  generatedAt: string;
}

// ============================================================================
// Generation Context
// ============================================================================
export interface AIGenerationContext {
  seed?: number;
}