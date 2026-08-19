// ============================================================================
// Prosventa AI — Public API
// Stage 3 — Phase 2: AI-Powered Prospect Intelligence Platform
// ============================================================================
// Centralized exports for the AI intelligence layer.
// Future AI features (email generator, meeting summary, outreach suggestions)
// can be added here without breaking existing consumers.
// ============================================================================

export * from "./types";
export * from "./generator";
export { AIIntelligenceSection, AIIntelligenceSkeleton, AIEmptyState } from "./components/AIIntelligenceSection";
export {
  AIInsightCard,
  ConfidenceIndicator,
  ScoreRing,
  ScoreBar,
  InfoRow,
  SeverityBadge,
  PriorityBadge,
} from "./components/AIInsightCard";